import { Router } from 'express';
import { getOverview, getRevenue, getCarsStatus } from './dashboard.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { query } from 'express-validator';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router();

router.use(verifyToken, requireRole('admin'));

router.get('/overview', getOverview);
router.get('/revenue', [query('year').optional().isInt({ min: 2000, max: 2100 })], validateRequest, getRevenue);
router.get('/cars-status', getCarsStatus);

export default router;
