import { Router } from 'express';
import multer from 'multer';
import { body, param, query } from 'express-validator';
import {
  listCars, getCarById, createCar, updateCar, deleteCar, addCarImage, deleteCarImage, setPrimaryCarImage,
  searchCarsByImage,
} from './cars.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { rateLimit } from '../../middleware/rate-limit.middleware';

const router = Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

// GET /api/cars
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['available', 'reserved', 'sold']),
    query('condition').optional().isIn(['new_car', 'used_car']),
    query('min_price').optional().isFloat({ min: 0 }),
    query('max_price').optional().isFloat({ min: 0 }),
    query('min_year').optional().isInt({ min: 1900 }),
    query('max_year').optional().isInt({ min: 1900 }),
    query('search').optional().trim().isLength({ max: 300 }),
  ],
  validateRequest,
  listCars
);

// POST /api/cars/image-search (public, có rate limit)
router.post(
  '/image-search',
  rateLimit('car-image-search', 10, 15 * 60 * 1000),
  imageUpload.single('image'),
  searchCarsByImage
);

// GET /api/cars/:id
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Car ID không hợp lệ')],
  validateRequest,
  getCarById
);

// ─── STAFF / ADMIN ────────────────────────────────────────────────────────────

// POST /api/cars
router.post(
  '/',
  verifyToken,
  requireRole('staff', 'admin'),
  [
    body('branch_id').trim().notEmpty().withMessage('branch_id không hợp lệ'),
    body('stock_code').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('vin').optional({ checkFalsy: true }).trim().isLength({ min: 11, max: 17 }),
    body('brand').trim().notEmpty().withMessage('Hãng xe không được để trống'),
    body('model').trim().notEmpty().withMessage('Model không được để trống'),
    body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Năm không hợp lệ'),
    body('price').isFloat({ gt: 0 }).withMessage('Giá phải lớn hơn 0'),
    body('mileage').optional().isInt({ min: 0 }),
    body('fuel_type').notEmpty().withMessage('Loại nhiên liệu không được để trống'),
    body('transmission').notEmpty().withMessage('Hộp số không được để trống'),
    body('condition').optional().isIn(['new_car', 'used_car']).withMessage('Tình trạng xe không hợp lệ'),
  ],
  validateRequest,
  createCar
);

// PUT /api/cars/:id
router.put(
  '/:id',
  verifyToken,
  requireRole('staff', 'admin'),
  [
    param('id').isUUID().withMessage('Car ID không hợp lệ'),
    body('stock_code').optional({ nullable: true }).trim().isLength({ max: 50 }),
    body('vin').optional({ nullable: true }).trim().isLength({ min: 11, max: 17 }),
    body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
    body('price').optional().isFloat({ gt: 0 }),
    body('mileage').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['available', 'reserved', 'sold']),
    body('condition').optional().isIn(['new_car', 'used_car']),
    body('branch_id').optional().trim().notEmpty(),
  ],
  validateRequest,
  updateCar
);

// DELETE /api/cars/:id  (admin only)
router.delete(
  '/:id',
  verifyToken,
  requireRole('admin'),
  [param('id').isUUID().withMessage('Car ID không hợp lệ')],
  validateRequest,
  deleteCar
);

// POST /api/cars/:id/images
router.post(
  '/:id/images',
  verifyToken,
  requireRole('staff', 'admin'),
  imageUpload.single('image'),
  [
    param('id').isUUID().withMessage('Car ID không hợp lệ'),
    body('url').optional({ checkFalsy: true }).isURL().withMessage('URL ảnh không hợp lệ'),
    body('is_primary').optional().isBoolean().withMessage('Giá trị ảnh đại diện không hợp lệ'),
  ],
  validateRequest,
  addCarImage
);

// DELETE /api/cars/:id/images/:imageId
router.delete(
  '/:id/images/:imageId',
  verifyToken,
  requireRole('staff', 'admin'),
  [
    param('id').isUUID().withMessage('Car ID không hợp lệ'),
    param('imageId').isUUID().withMessage('Image ID không hợp lệ'),
  ],
  validateRequest,
  deleteCarImage
);

// PATCH /api/cars/:id/images/:imageId/primary
router.patch(
  '/:id/images/:imageId/primary',
  verifyToken,
  requireRole('staff', 'admin'),
  [
    param('id').isUUID().withMessage('Car ID không hợp lệ'),
    param('imageId').isUUID().withMessage('Image ID không hợp lệ'),
  ],
  validateRequest,
  setPrimaryCarImage
);

export default router;
