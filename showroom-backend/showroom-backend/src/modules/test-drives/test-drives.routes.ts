import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { createTestDrive, listTestDrives, updateTestDrive } from './test-drives.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router();
router.use(verifyToken);

// POST /api/test-drives
router.post(
  '/',
  requireRole('customer'),
  [
    body('car_id').isUUID().withMessage('car_id không hợp lệ'),
    body('scheduled_at').isISO8601().custom(value => new Date(value).getTime() > Date.now()).withMessage('Lịch phải ở tương lai'),
    body('notes').optional().isString().isLength({ max: 1_000 }),
  ],
  validateRequest,
  createTestDrive
);

// GET /api/test-drives
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['pending', 'confirmed', 'done', 'cancelled']),
  ],
  validateRequest,
  listTestDrives
);

// PATCH /api/test-drives/:id
router.patch(
  '/:id',
  requireRole('staff', 'admin'),
  [
    param('id').isUUID(),
    body('status').optional().isIn(['confirmed', 'done', 'cancelled']),
    body('scheduled_at').optional().isISO8601().custom(value => new Date(value).getTime() > Date.now()),
    body('notes').optional().isString().isLength({ max: 1_000 }),
  ],
  validateRequest,
  updateTestDrive
);

export default router;
