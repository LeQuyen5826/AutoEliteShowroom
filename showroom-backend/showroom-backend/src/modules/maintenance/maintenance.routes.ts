import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createMaintenance, listMaintenance, updateMaintenance, deleteMaintenance,
} from './maintenance.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router();
router.use(verifyToken);

// POST /api/maintenance
router.post(
  '/',
  [
    body('car_id').optional().isUUID().withMessage('car_id không hợp lệ'),
    body('branch_id').optional().trim().notEmpty().withMessage('branch_id không hợp lệ'),
    body('customer_id').optional().isUUID().withMessage('customer_id không hợp lệ'),
    body('service_type').trim().isLength({ min: 2, max: 100 }).withMessage('Loại dịch vụ không hợp lệ'),
    body('scheduled_at').isISO8601().custom(value => new Date(value).getTime() > Date.now()).withMessage('Lịch phải ở tương lai'),
    body('notes').optional().isString().isLength({ max: 1_000 }),
  ],
  validateRequest,
  createMaintenance
);

// GET /api/maintenance
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'done', 'cancelled']),
  ],
  validateRequest,
  listMaintenance
);

// PATCH /api/maintenance/:id
router.patch(
  '/:id',
  requireRole('staff', 'admin'),
  [
    param('id').isUUID(),
    body('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'done', 'cancelled']),
    body('cost').optional().isFloat({ min: 0 }),
    body('scheduled_at').optional().isISO8601().custom(value => new Date(value).getTime() > Date.now()),
    body('notes').optional().isString().isLength({ max: 1_000 }),
    body('service_type').optional().trim().isLength({ min: 2, max: 100 }),
  ],
  validateRequest,
  updateMaintenance
);

// DELETE /api/maintenance/:id
router.delete(
  '/:id',
  requireRole('admin'),
  [param('id').isUUID()],
  validateRequest,
  deleteMaintenance
);

export default router;
