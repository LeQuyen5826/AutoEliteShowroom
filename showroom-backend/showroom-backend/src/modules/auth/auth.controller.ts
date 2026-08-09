import { createHash, randomBytes, randomUUID } from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import {
  JwtPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { sendSuccess, sendError } from '../../utils/response';
import { sendPasswordResetEmail } from '../../utils/email';

const SALT_ROUNDS = 12;
const REFRESH_COOKIE = 'showroom_refresh';

function parseDurationMs(value: string | undefined, fallbackMs: number): number {
  const match = value?.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;
  const multipliers = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const unit = match[2].toLowerCase() as keyof typeof multipliers;
  const multiplier = multipliers[unit];
  return Number(match[1]) * multiplier;
}

const refreshTtlMs = () => parseDurationMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 86_400_000);

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const item of raw.split(';')) {
    const [key, ...value] = item.trim().split('=');
    if (key === name) {
      try { return decodeURIComponent(value.join('=')); }
      catch { return undefined; }
    }
  }
  return undefined;
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: refreshTtlMs(),
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
}

function tokenPayload(user: { id: string; role: string; branch_id?: string | null }): JwtPayload {
  return { user_id: user.id, role: user.role, branch_id: user.branch_id ?? null };
}

async function createSession(user: { id: string; role: string; branch_id?: string | null }) {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + refreshTtlMs());
  await prisma.refreshSession.create({
    data: { id: jti, user_id: user.id, expires_at: expiresAt },
  });
  const payload = tokenPayload(user);
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ ...payload, jti }),
  };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, password, phone } = req.body;
    const email = String(req.body.email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Email đã được sử dụng', 409);
      return;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { full_name, email, password_hash, phone, role: 'customer' },
      select: { id: true, full_name: true, email: true, phone: true, role: true, branch_id: true, created_at: true },
    });
    sendSuccess(res, user, 'Đăng ký thành công', 201);
  } catch (err) {
    console.error('[register]', err);
    sendError(res, 'Đăng ký thất bại');
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
      sendError(res, 'Email hoặc mật khẩu không đúng', 401);
      return;
    }

    const tokens = await createSession(user);
    setRefreshCookie(res, tokens.refreshToken);
    sendSuccess(res, {
      access_token: tokens.accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch_id: user.branch_id,
        created_at: user.created_at,
      },
    }, 'Đăng nhập thành công');
  } catch (err) {
    console.error('[login]', err);
    sendError(res, 'Đăng nhập thất bại');
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    // Body fallback keeps old clients working during migration to HttpOnly cookies.
    const refreshToken = readCookie(req, REFRESH_COOKIE) || req.body.refresh_token;
    if (!refreshToken) {
      sendError(res, 'Thiếu refresh token', 401);
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.user_id } });
    if (!user) {
      clearRefreshCookie(res);
      sendError(res, 'Phiên đăng nhập không hợp lệ', 401);
      return;
    }

    const nextJti = randomUUID();
    const expiresAt = new Date(Date.now() + refreshTtlMs());
    const result = await prisma.$transaction(async tx => {
      const revoked = await tx.refreshSession.updateMany({
        where: { id: decoded.jti, user_id: user.id, revoked_at: null, expires_at: { gt: new Date() } },
        data: { revoked_at: new Date() },
      });
      if (revoked.count !== 1) return false;
      await tx.refreshSession.create({
        data: { id: nextJti, user_id: user.id, expires_at: expiresAt },
      });
      return true;
    });

    if (!result) {
      clearRefreshCookie(res);
      sendError(res, 'Refresh token đã được sử dụng hoặc bị thu hồi', 401);
      return;
    }

    const payload = tokenPayload(user);
    setRefreshCookie(res, signRefreshToken({ ...payload, jti: nextJti }));
    sendSuccess(res, {
      access_token: signAccessToken(payload),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch_id: user.branch_id,
        created_at: user.created_at,
      },
    }, 'Làm mới phiên đăng nhập thành công');
  } catch {
    clearRefreshCookie(res);
    sendError(res, 'Refresh token không hợp lệ hoặc đã hết hạn', 401);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const refreshToken = readCookie(req, REFRESH_COOKIE) || req.body.refresh_token;
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await prisma.refreshSession.updateMany({
        where: { id: decoded.jti, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    } catch {
      // Logout remains idempotent even for an expired/invalid cookie.
    }
  }
  clearRefreshCookie(res);
  sendSuccess(res, null, 'Đăng xuất thành công');
};

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const genericMessage = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.';
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      sendSuccess(res, null, genericMessage);
      return;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { user_id: user.id } }),
      prisma.passwordResetToken.create({
        data: { user_id: user.id, token_hash: tokenHash, expires_at: expiresAt },
      }),
    ]);

    const frontendUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')[0]
      .replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    const developmentData = process.env.NODE_ENV !== 'production'
      ? { dev_reset_url: resetUrl, expires_at: expiresAt }
      : null;
    sendSuccess(res, developmentData, genericMessage);
  } catch (err) {
    console.error('[forgotPassword]', err);
    // Không để lộ email có tồn tại hay trạng thái dịch vụ gửi thư.
    sendSuccess(res, null, genericMessage);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenHash = hashResetToken(String(req.body.token));
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
    });
    if (!resetToken || resetToken.used_at || resetToken.expires_at <= new Date()) {
      sendError(res, 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);
      return;
    }

    const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    await prisma.$transaction(async tx => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, used_at: null, expires_at: { gt: new Date() } },
        data: { used_at: new Date() },
      });
      if (consumed.count !== 1) throw new Error('RESET_TOKEN_ALREADY_USED');
      await tx.user.update({
        where: { id: resetToken.user_id },
        data: { password_hash: passwordHash },
      });
      await tx.refreshSession.updateMany({
        where: { user_id: resetToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    });

    clearRefreshCookie(res);
    sendSuccess(res, null, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
  } catch (err) {
    if (err instanceof Error && err.message === 'RESET_TOKEN_ALREADY_USED') {
      sendError(res, 'Liên kết đặt lại mật khẩu đã được sử dụng', 409);
      return;
    }
    console.error('[resetPassword]', err);
    sendError(res, 'Không thể đặt lại mật khẩu', 500);
  }
};
