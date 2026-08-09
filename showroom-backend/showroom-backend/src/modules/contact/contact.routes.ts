import { Router } from 'express';
import { body, param } from 'express-validator';
import { createContactLead, listContactLeads, updateContactLeadStatus } from './contact.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { rateLimit } from '../../middleware/rate-limit.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router();

router.post(
  '/',
  rateLimit('contact', 5, 15 * 60 * 1000),
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('vi-VN'),
    body('subject').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('message').trim().isLength({ min: 10, max: 2_000 }),
  ],
  validateRequest,
  createContactLead
);

router.get('/', verifyToken, requireRole('staff', 'admin'), listContactLeads);

router.patch(
  '/:id/status',
  verifyToken,
  requireRole('staff', 'admin'),
  [
    param('id').isUUID(),
    body('status').isIn(['new', 'contacted', 'closed']).withMessage('Trạng thái liên hệ không hợp lệ'),
  ],
  validateRequest,
  updateContactLeadStatus
);

export default router;
