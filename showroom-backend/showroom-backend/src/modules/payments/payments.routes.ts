import { Router } from 'express';
import { body, param } from 'express-validator';
import { createPayment, listPayments, getPaymentQr } from './payments.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router({ mergeParams: true }); // để dùng :id từ orders

router.use(verifyToken);

// GET /api/orders/:id/payments/qr
router.get('/qr', [param('id').isUUID()], validateRequest, getPaymentQr);

// POST /api/orders/:id/payments
router.post(
  '/',
  requireRole('staff', 'admin'),
  [
    param('id').isUUID(),
    body('amount').isFloat({ gt: 0 }).withMessage('Số tiền phải lớn hơn 0'),
    body('method').optional().isIn(['cash', 'bank_transfer', 'card', 'other']),
    body('note').optional().isString().isLength({ max: 500 }),
    body('reference').optional().trim().isLength({ min: 3, max: 100 }),
  ],
  validateRequest,
  createPayment
);

// GET /api/orders/:id/payments
router.get('/', [param('id').isUUID()], validateRequest, listPayments);

export default router;
