import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { createOrder, listOrders, getOrderById, updateOrderStatus } from './orders.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router();

router.use(verifyToken);

// POST /api/orders
router.post(
  '/',
  requireRole('customer'),
  [
    body('car_id').isUUID().withMessage('car_id không hợp lệ'),
    body('type').isIn(['deposit', 'purchase']).withMessage('type phải là deposit hoặc purchase'),
    body('payment_plan').optional().isIn(['full', 'installment']).withMessage('Phương án thanh toán không hợp lệ'),
    body('financing_amount').optional().isFloat({ min: 0 }).withMessage('Số tiền hỗ trợ không hợp lệ'),
    body('financing_months').optional({ nullable: true }).isInt({ min: 6, max: 84 }).withMessage('Kỳ hạn phải từ 6 đến 84 tháng'),
    body('notes').optional().isString().isLength({ max: 1_000 }),
  ],
  validateRequest,
  createOrder
);

// GET /api/orders
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']),
    query('type').optional().isIn(['deposit', 'purchase']),
  ],
  validateRequest,
  listOrders
);

// GET /api/orders/:id
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  getOrderById
);

// PATCH /api/orders/:id/status
router.patch(
  '/:id/status',
  requireRole('staff', 'admin'),
  [
    param('id').isUUID(),
    body('status').isIn(['confirmed', 'completed', 'cancelled']).withMessage('Trạng thái không hợp lệ'),
  ],
  validateRequest,
  updateOrderStatus
);

export default router;
