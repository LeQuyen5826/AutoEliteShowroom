import { Router } from 'express';
import { body } from 'express-validator';
import { createContactLead, listContactLeads } from './contact.controller';
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

router.get('/', verifyToken, requireRole('admin'), listContactLeads);

export default router;
