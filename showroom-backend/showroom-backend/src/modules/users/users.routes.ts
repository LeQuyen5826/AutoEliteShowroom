import { Router } from 'express';
import { body } from 'express-validator';
import { getMe, updateMe, listUsers, createStaff } from './users.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(verifyToken);

// GET /api/users/me
router.get('/me', getMe);

// PUT /api/users/me
router.put(
  '/me',
  [
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional({ nullable: true, checkFalsy: true }).isMobilePhone('vi-VN'),
    body('password').optional().isLength({ min: 8, max: 128 }),
  ],
  validateRequest,
  updateMe
);

// GET /api/users  (admin only)
router.get('/', requireRole('admin'), listUsers);

// POST /api/users/staff  (admin only)
router.post(
  '/staff',
  requireRole('admin'),
  [
    body('full_name').trim().notEmpty().withMessage('Họ tên không được để trống'),
    body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Mật khẩu phải từ 8 đến 128 ký tự'),
    body('branch_id').optional().trim().notEmpty().withMessage('branch_id không hợp lệ'),
  ],
  validateRequest,
  createStaff
);

export default router;
