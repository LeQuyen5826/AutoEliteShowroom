import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { canAccessBranch } from '../../middleware/auth.middleware';

const MAINTENANCE_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

/**
 * POST /api/maintenance
 * Khách đặt lịch bảo dưỡng (hoặc Staff/Admin tạo hộ khách)
 */
export const createMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { car_id, branch_id, service_type, scheduled_at, notes, customer_id } = req.body;
    const requester = req.user!;

    // Staff/Admin có thể tạo lịch hộ khách (truyền customer_id), customer chỉ tạo cho chính mình
    const finalCustomerId =
      (requester.role === 'staff' || requester.role === 'admin') && customer_id
        ? customer_id
        : requester.user_id;

    if (car_id) {
      const car = await prisma.car.findUnique({ where: { id: car_id } });
      if (!car) { sendError(res, 'Không tìm thấy xe', 404); return; }
      if (requester.role === 'customer') {
        const owned = await prisma.order.findFirst({
          where: { car_id, customer_id: requester.user_id, status: 'completed' },
          select: { id: true },
        });
        if (!owned) { sendError(res, 'Bạn không có xe này trong lịch sử mua hàng', 403); return; }
      }
    }

    if (branch_id) {
      const branch = await prisma.branch.findUnique({ where: { id: branch_id } });
      if (!branch) { sendError(res, 'Chi nhánh không tồn tại', 422); return; }
      if (requester.role === 'staff' && !canAccessBranch(req, branch_id)) {
        sendError(res, 'Không được tạo lịch cho chi nhánh khác', 403); return;
      }
    }
    if (requester.role !== 'customer' && customer_id) {
      const customer = await prisma.user.findUnique({ where: { id: customer_id } });
      if (!customer || customer.role !== 'customer') { sendError(res, 'Khách hàng không hợp lệ', 422); return; }
    }

    const maintenance = await prisma.maintenance.create({
      data: {
        customer_id: finalCustomerId,
        car_id: car_id || null,
        branch_id: branch_id || null,
        service_type,
        scheduled_at: new Date(scheduled_at),
        status: 'pending',
        notes,
      },
      include: {
        car: { select: { id: true, brand: true, model: true, year: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    sendSuccess(res, maintenance, 'Đặt lịch bảo dưỡng thành công', 201);
  } catch (err) {
    console.error('[createMaintenance]', err);
    sendError(res);
  }
};

/**
 * GET /api/maintenance
 * Staff/Admin: tất cả lịch bảo dưỡng | Customer: lịch của mình
 */
export const listMaintenance = async (req: Request, res: Response): Promise<void> => {
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

    const [maintenances, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { scheduled_at: 'asc' },
        include: {
          car: { select: { id: true, brand: true, model: true, year: true } },
          customer: { select: { id: true, full_name: true, phone: true, email: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
      prisma.maintenance.count({ where }),
    ]);

    sendSuccess(res, {
      maintenances,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[listMaintenance]', err);
    sendError(res);
  }
};

/**
 * PATCH /api/maintenance/:id
 * Staff/Admin cập nhật trạng thái / thông tin lịch bảo dưỡng
 */
export const updateMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, notes, scheduled_at, cost, service_type } = req.body;

    const existing = await prisma.maintenance.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendError(res, 'Không tìm thấy lịch bảo dưỡng', 404); return; }
    if (req.user!.role === 'staff' && !canAccessBranch(req, existing.branch_id)) {
      sendError(res, 'Không có quyền cập nhật lịch ngoài chi nhánh', 403); return;
    }
    if (status && !MAINTENANCE_TRANSITIONS[existing.status]?.includes(status)) {
      sendError(res, `Không thể chuyển lịch từ ${existing.status} sang ${status}`, 409); return;
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (scheduled_at !== undefined) updateData.scheduled_at = new Date(scheduled_at);
    if (cost !== undefined) updateData.cost = cost;
    if (service_type !== undefined) updateData.service_type = service_type;

    const updated = await prisma.maintenance.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        car: { select: { id: true, brand: true, model: true, year: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    sendSuccess(res, updated, 'Cập nhật lịch bảo dưỡng thành công');
  } catch (err) {
    console.error('[updateMaintenance]', err);
    sendError(res);
  }
};

/**
 * DELETE /api/maintenance/:id
 * (Admin) Xóa lịch bảo dưỡng
 */
export const deleteMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.maintenance.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendError(res, 'Không tìm thấy lịch bảo dưỡng', 404); return; }

    await prisma.maintenance.delete({ where: { id: req.params.id } });

    sendSuccess(res, null, 'Xóa lịch bảo dưỡng thành công');
  } catch (err) {
    console.error('[deleteMaintenance]', err);
    sendError(res);
  }
};
