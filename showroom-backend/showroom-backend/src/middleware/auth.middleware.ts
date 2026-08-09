import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';

// Extend Express Request để thêm user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware xác thực JWT.
 * Gắn `req.user` nếu token hợp lệ.
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Không tìm thấy token xác thực', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    sendError(res, 'Token không hợp lệ hoặc đã hết hạn', 401);
  }
};

/** Attach the current user when a token is present; anonymous requests remain valid. */
export const optionalVerifyToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }
  if (!authHeader.startsWith('Bearer ')) {
    sendError(res, 'Token xác thực không hợp lệ', 401);
    return;
  }
  try {
    req.user = verifyAccessToken(authHeader.slice(7));
    next();
  } catch {
    sendError(res, 'Token không hợp lệ hoặc đã hết hạn', 401);
  }
};

/**
 * Middleware phân quyền theo vai trò.
 * Sử dụng sau verifyToken.
 * Ví dụ: requireRole('admin', 'staff')
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Chưa xác thực', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'Bạn không có quyền thực hiện thao tác này', 403);
      return;
    }

    next();
  };
};

/** Staff may only operate on records that belong to their assigned branch. */
export const canAccessBranch = (req: Request, branchId?: string | null): boolean => {
  if (req.user?.role === 'admin') return true;
  if (req.user?.role !== 'staff') return false;
  return Boolean(req.user.branch_id && branchId === req.user.branch_id);
};
