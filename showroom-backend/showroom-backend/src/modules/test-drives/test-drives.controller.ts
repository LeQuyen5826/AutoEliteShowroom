import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { canAccessBranch } from '../../middleware/auth.middleware';

const TEST_DRIVE_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

/**
 * POST /api/test-drives
 * Khách đặt lịch lái thử
 */
export const createTestDrive = async (req: Request, res: Response): Promise<void> => {
  try {
    const { car_id, scheduled_at, notes } = req.body;
    const customer_id = req.user!.user_id;

    const car = await prisma.car.findUnique({ where: { id: car_id } });
    if (!car) { sendError(res, 'Không tìm thấy xe', 404); return; }
    if (car.status !== 'available') { sendError(res, 'Xe hiện không sẵn sàng để lái thử', 409); return; }

    const scheduledDate = new Date(scheduled_at);
    const conflict = await prisma.testDrive.findFirst({
      where: {
        car_id,
        status: { not: 'cancelled' },
        scheduled_at: {
          gte: new Date(scheduledDate.getTime() - 60 * 60 * 1000),
          lte: new Date(scheduledDate.getTime() + 60 * 60 * 1000),
        },
      },
    });
    if (conflict) { sendError(res, 'Khung giờ này đã có lịch lái thử', 409); return; }

    const testDrive = await prisma.testDrive.create({
      data: {
        customer_id,
        car_id,
        branch_id: car.branch_id,
        scheduled_at: scheduledDate,
        status: 'pending',
        notes,
      },
      include: {
        car: { select: { id: true, brand: true, model: true, year: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
      },
    });

    sendSuccess(res, testDrive, 'Đặt lịch lái thử thành công', 201);
  } catch (err) {
    console.error('[createTestDrive]', err);
    sendError(res);
  }
};

/**
 * GET /api/test-drives
 * Staff/Admin: tất cả lịch | Customer: lịch của mình
 */
export const listTestDrives = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, user_id } = req.user!;
    const { status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};
    if (role === 'customer') where.customer_id = user_id;
    if (role === 'staff') {
      if (!req.user!.branch_id) { sendError(res, 'Nhân viên chưa được gán chi nhánh', 403); return; }
      where.branch_id = req.user!.branch_id;
    }
    if (status) where.status = status;

    const [testDrives, total] = await Promise.all([
      prisma.testDrive.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { scheduled_at: 'asc' },
        include: {
          car: { select: { id: true, brand: true, model: true, year: true } },
          customer: { select: { id: true, full_name: true, phone: true, email: true } },
        },
      }),
      prisma.testDrive.count({ where }),
    ]);

    sendSuccess(res, {
      testDrives,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[listTestDrives]', err);
    sendError(res);
  }
};

/**
 * PATCH /api/test-drives/:id
 * Staff/Admin cập nhật trạng thái lịch lái thử
 */
export const updateTestDrive = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, notes, scheduled_at } = req.body;

    const existing = await prisma.testDrive.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendError(res, 'Không tìm thấy lịch lái thử', 404); return; }
    if (req.user!.role === 'staff' && !canAccessBranch(req, existing.branch_id)) {
      sendError(res, 'Không có quyền cập nhật lịch ngoài chi nhánh', 403); return;
    }
    if (status && !TEST_DRIVE_TRANSITIONS[existing.status]?.includes(status)) {
      sendError(res, `Không thể chuyển lịch từ ${existing.status} sang ${status}`, 409); return;
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (scheduled_at) updateData.scheduled_at = new Date(scheduled_at);

    const updated = await prisma.testDrive.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        car: { select: { id: true, brand: true, model: true } },
        customer: { select: { id: true, full_name: true, phone: true } },
      },
    });

    sendSuccess(res, updated, 'Cập nhật lịch lái thử thành công');
  } catch (err) {
    console.error('[updateTestDrive]', err);
    sendError(res);
  }
};
