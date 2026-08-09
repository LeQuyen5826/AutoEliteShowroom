import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';

/**
 * POST /api/cars/:id/reviews
 * Khách hàng đánh giá xe (phải có đơn completed)
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const car_id = req.params.id;
    const customer_id = req.user!.user_id;
    const { rating, comment } = req.body;

    // Kiểm tra xe tồn tại
    const car = await prisma.car.findUnique({ where: { id: car_id } });
    if (!car) { sendError(res, 'Không tìm thấy xe', 404); return; }

    const completedOrder = await prisma.order.findFirst({
      where: { car_id, customer_id, status: 'completed' },
      select: { id: true },
    });
    if (!completedOrder) {
      sendError(res, 'Chỉ khách đã hoàn tất mua xe mới có thể đánh giá', 403); return;
    }

    // Kiểm tra đã đánh giá chưa
    const existing = await prisma.review.findFirst({
      where: { car_id, customer_id },
    });
    if (existing) { sendError(res, 'Bạn đã đánh giá xe này rồi', 409); return; }

    const review = await prisma.review.create({
      data: { car_id, customer_id, rating: parseInt(rating), comment },
      include: {
        customer: { select: { id: true, full_name: true } },
      },
    });

    sendSuccess(res, review, 'Đánh giá thành công', 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      sendError(res, 'Bạn đã đánh giá xe này rồi', 409); return;
    }
    console.error('[createReview]', err);
    sendError(res);
  }
};

/**
 * GET /api/cars/:id/reviews
 */
export const listReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const car_id = req.params.id;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { car_id, is_visible: true },
        skip, take: limitNum,
        orderBy: { created_at: 'desc' },
        include: { customer: { select: { id: true, full_name: true } } },
      }),
      prisma.review.count({ where: { car_id, is_visible: true } }),
      prisma.review.aggregate({ where: { car_id, is_visible: true }, _avg: { rating: true } }),
    ]);

    const avgRating = aggregate._avg.rating || 0;

    sendSuccess(res, {
      reviews, avgRating: Math.round(avgRating * 10) / 10,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[listReviews]', err);
    sendError(res);
  }
};

/**
 * GET /api/reviews
 * Staff/Admin xem toàn bộ đánh giá để kiểm duyệt.
 */
export const listAllReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
    const visibility = String(req.query.visibility || '');
    const rating = Number.parseInt(String(req.query.rating || ''), 10);

    const where: Prisma.ReviewWhereInput = {};
    if (visibility === 'visible') where.is_visible = true;
    if (visibility === 'hidden') where.is_visible = false;
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) where.rating = rating;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          customer: { select: { id: true, full_name: true, email: true } },
          car: { select: { id: true, brand: true, model: true, year: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    sendSuccess(res, {
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[listAllReviews]', err);
    sendError(res);
  }
};

/**
 * PATCH /api/reviews/:id/visibility
 * Admin ẩn/hiện đánh giá
 */
export const toggleReviewVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) { sendError(res, 'Không tìm thấy đánh giá', 404); return; }

    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { is_visible: !review.is_visible },
    });

    sendSuccess(res, updated, `Đã ${updated.is_visible ? 'hiện' : 'ẩn'} đánh giá`);
  } catch (err) {
    console.error('[toggleReviewVisibility]', err);
    sendError(res);
  }
};
