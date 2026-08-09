import { Router } from 'express';
import { getOverview, getRevenue, getCarsStatus, getStaffOverview } from './dashboard.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { query } from 'express-validator';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router();

router.use(verifyToken);

router.get('/staff-overview', requireRole('staff', 'admin'), getStaffOverview);

router.get('/overview', requireRole('admin'), getOverview);
router.get('/revenue', requireRole('admin'), [query('year').optional().isInt({ min: 2000, max: 2100 })], validateRequest, getRevenue);
router.get('/cars-status', requireRole('admin'), getCarsStatus);

export default router;
