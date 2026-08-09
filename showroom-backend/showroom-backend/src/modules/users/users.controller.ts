import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';

const USER_SELECT = {
  id: true,
  full_name: true,
  email: true,
  phone: true,
  role: true,
  branch_id: true,
  created_at: true,
};

/**
 * GET /api/users/me
 * Lấy thông tin tài khoản hiện tại
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.user_id },
      select: USER_SELECT,
    });

    if (!user) {
      sendError(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    sendSuccess(res, user);
  } catch (err) {
    console.error('[getMe]', err);
    sendError(res);
  }
};

/**
 * PUT /api/users/me
 * Cập nhật hồ sơ cá nhân
 */
export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, phone, password } = req.body;

    const updateData: Record<string, unknown> = {};
    if (full_name) updateData.full_name = full_name;
    if (phone) updateData.phone = phone;
    if (password) updateData.password_hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.user!.user_id },
      data: updateData,
      select: USER_SELECT,
    });

    sendSuccess(res, user, 'Cập nhật thành công');
  } catch (err) {
    console.error('[updateMe]', err);
    sendError(res);
  }
};

/**
 * GET /api/users
 * (Admin) Danh sách người dùng với phân trang và lọc theo role
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = role ? { role: role as 'customer' | 'staff' | 'admin' } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: USER_SELECT, skip, take: limitNum, orderBy: { created_at: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, {
      users,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[listUsers]', err);
    sendError(res);
  }
};

/**
 * POST /api/users/staff
 * (Admin) Tạo tài khoản nhân viên
 */
export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, password, phone, branch_id } = req.body;
    const email = String(req.body.email).trim().toLowerCase();

    if (branch_id) {
      const branch = await prisma.branch.findUnique({ where: { id: branch_id } });
      if (!branch) { sendError(res, 'Chi nhánh không tồn tại', 422); return; }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      sendError(res, 'Email đã được sử dụng', 409);
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const staff = await prisma.user.create({
      data: { full_name, email, password_hash, phone, role: 'staff', branch_id },
      select: USER_SELECT,
    });

    sendSuccess(res, staff, 'Tạo tài khoản nhân viên thành công', 201);
  } catch (err) {
    console.error('[createStaff]', err);
    sendError(res);
  }
};
