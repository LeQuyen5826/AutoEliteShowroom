import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, refresh, logout, forgotPassword, resetPassword } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { rateLimit } from '../../middleware/rate-limit.middleware';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  rateLimit('register', 5, 15 * 60 * 1000),
  [
    body('full_name').trim().notEmpty().withMessage('Họ tên không được để trống'),
    body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Mật khẩu phải từ 8 đến 128 ký tự'),
    body('phone').optional().isMobilePhone('vi-VN').withMessage('Số điện thoại không hợp lệ'),
  ],
  validateRequest,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  rateLimit('login', 10, 15 * 60 * 1000),
  [
    body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ'),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
  ],
  validateRequest,
  login
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  rateLimit('refresh', 30, 15 * 60 * 1000),
  refresh
);

router.post('/logout', logout);

router.post(
  '/forgot-password',
  rateLimit('forgot-password', 5, 15 * 60 * 1000),
  [body('email').isEmail().normalizeEmail().withMessage('Email không hợp lệ')],
  validateRequest,
  forgotPassword
);

router.post(
  '/reset-password',
  rateLimit('reset-password', 10, 15 * 60 * 1000),
  [
    body('token').isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('Token không hợp lệ'),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Mật khẩu phải từ 8 đến 128 ký tự'),
  ],
  validateRequest,
  resetPassword
);

export default router;
