import { Router } from 'express';
import { body, param } from 'express-validator';
import { createReview, listReviews, listAllReviews, toggleReviewVisibility } from './reviews.controller';
import { verifyToken, requireRole } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';

// Router cho /api/cars/:id/reviews
export const carReviewsRouter = Router({ mergeParams: true });

carReviewsRouter.get('/', [param('id').isUUID()], validateRequest, listReviews);
carReviewsRouter.post(
  '/',
  verifyToken,
  [
    param('id').isUUID(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating từ 1 đến 5'),
    body('comment').optional().isString().isLength({ max: 2_000 }),
  ],
  validateRequest,
  createReview
);

// Router cho /api/reviews
export const reviewsRouter = Router();

reviewsRouter.get(
  '/',
  verifyToken,
  requireRole('staff', 'admin'),
  listAllReviews
);

reviewsRouter.patch(
  '/:id/visibility',
  verifyToken,
  requireRole('staff', 'admin'),
  [param('id').isUUID()],
  validateRequest,
  toggleReviewVisibility
);
