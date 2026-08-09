import { Router } from 'express';
import { createContract, downloadContract, getContract, signContract } from './contracts.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { param } from 'express-validator';
import { validateRequest } from '../../middleware/validate.middleware';

const router = Router({ mergeParams: true });

router.use(verifyToken);
router.use([param('id').isUUID()], validateRequest);

router.post('/', requireRole('staff', 'admin'), createContract);
router.get('/', getContract);
router.get('/file', downloadContract);
router.patch('/sign', requireRole('staff', 'admin'), signContract);

export default router;
