import { OrderStatus, OrderType, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { canAccessBranch } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

class OrderConflictError extends Error {}

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { car_id, type, notes } = req.body;
    const paymentPlan = req.body.payment_plan === 'installment' ? 'installment' : 'full';
    const financingMonths = paymentPlan === 'installment' ? Number(req.body.financing_months) : null;
    const requestedFinancing = paymentPlan === 'installment'
      ? new Prisma.Decimal(req.body.financing_amount || 0)
      : new Prisma.Decimal(0);
    const customer_id = req.user!.user_id;

    const order = await prisma.$transaction(async tx => {
      const car = await tx.car.findUnique({ where: { id: car_id } });
      if (!car) throw new OrderConflictError('NOT_FOUND');
      if (requestedFinancing.isNegative() || requestedFinancing.greaterThan(car.price.mul(0.8))) {
        throw new OrderConflictError('INVALID_FINANCING');
      }

      const customerPayable = car.price.minus(requestedFinancing);
      const configuredDepositPercent = Number(process.env.DEFAULT_DEPOSIT_PERCENT || 10);
      const depositPercent = Math.min(50, Math.max(1, configuredDepositPercent));
      const paymentDue = type === 'deposit'
        ? customerPayable.mul(depositPercent).div(100).toDecimalPlaces(0)
        : customerPayable;

      // The conditional update is the lock: only one concurrent request can reserve the car.
      const reserved = await tx.car.updateMany({
        where: { id: car_id, status: 'available' },
        data: { status: 'reserved' },
      });
      if (reserved.count !== 1) throw new OrderConflictError('NOT_AVAILABLE');

      return tx.order.create({
        data: {
          customer_id,
          car_id,
          branch_id: car.branch_id,
          type,
          status: 'pending',
          total_amount: car.price,
          payment_due_amount: paymentDue,
          payment_plan: paymentPlan,
          financing_amount: requestedFinancing,
          financing_months: financingMonths,
          notes,
        },
        include: {
          car: { include: { images: { where: { is_primary: true }, take: 1 } } },
          customer: { select: { id: true, full_name: true, email: true, phone: true } },
          branch: true,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    sendSuccess(res, order, 'Tạo đơn hàng thành công', 201);
  } catch (err) {
    if (err instanceof OrderConflictError) {
      const errorMap: Record<string, [string, number]> = {
        NOT_FOUND: ['Không tìm thấy xe', 404],
        NOT_AVAILABLE: ['Xe đã được khách khác giữ chỗ', 409],
        INVALID_FINANCING: ['Số tiền hỗ trợ trả góp không hợp lệ hoặc vượt quá 80% giá xe', 400],
      };
      const [message, status] = errorMap[err.message] || ['Không thể tạo đơn hàng', 409];
      sendError(res, message, status);
      return;
    }
    console.error('[createOrder]', err);
    sendError(res);
  }
};

export const listOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, user_id, branch_id } = req.user!;
    const { status, type } = req.query;
    const pageNum = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '10'), 10) || 10));

    const where: Prisma.OrderWhereInput = {};
    if (role === 'customer') where.customer_id = user_id;
    if (role === 'staff') {
      if (!branch_id) { sendError(res, 'Nhân viên chưa được gán chi nhánh', 403); return; }
      where.branch_id = branch_id;
    }
    if (typeof status === 'string') where.status = status as OrderStatus;
    if (typeof type === 'string') where.type = type as OrderType;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          car: { include: { images: { where: { is_primary: true }, take: 1 } } },
          customer: { select: { id: true, full_name: true, email: true, phone: true } },
          branch: { select: { id: true, name: true } },
          payments: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    sendSuccess(res, {
      orders,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[listOrders]', err);
    sendError(res);
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        car: { include: { images: true, branch: true } },
        customer: { select: { id: true, full_name: true, email: true, phone: true } },
        staff: { select: { id: true, full_name: true, email: true } },
        branch: true,
        payments: true,
        contract: true,
      },
    });
    if (!order) { sendError(res, 'Không tìm thấy đơn hàng', 404); return; }

    if (req.user!.role === 'customer' && order.customer_id !== req.user!.user_id) {
      sendError(res, 'Không có quyền xem đơn hàng này', 403); return;
    }
    if (req.user!.role === 'staff' && !canAccessBranch(req, order.branch_id)) {
      sendError(res, 'Không có quyền xem đơn hàng ngoài chi nhánh', 403); return;
    }
    sendSuccess(res, order);
  } catch (err) {
    console.error('[getOrderById]', err);
    sendError(res);
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.body.status as OrderStatus;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) { sendError(res, 'Không tìm thấy đơn hàng', 404); return; }
    if (req.user!.role === 'staff' && !canAccessBranch(req, order.branch_id)) {
      sendError(res, 'Không có quyền cập nhật đơn hàng ngoài chi nhánh', 403); return;
    }
    if (!allowedTransitions[order.status].includes(status)) {
      sendError(res, `Không thể chuyển đơn từ ${order.status} sang ${status}`, 409); return;
    }

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status, staff_id: req.user!.user_id },
      });
      if (changed.count !== 1) throw new OrderConflictError('ORDER_CHANGED');

      if (status === 'completed') {
        await tx.car.update({ where: { id: order.car_id }, data: { status: 'sold' } });
      } else if (status === 'cancelled') {
        await tx.car.update({ where: { id: order.car_id }, data: { status: 'available' } });
      }
      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          car: true,
          customer: { select: { id: true, full_name: true, email: true } },
          payments: true,
        },
      });
    });

    sendSuccess(res, updated, 'Cập nhật trạng thái thành công');
  } catch (err) {
    if (err instanceof OrderConflictError) {
      sendError(res, 'Đơn hàng vừa được cập nhật bởi người khác, vui lòng tải lại', 409); return;
    }
    console.error('[updateOrderStatus]', err);
    sendError(res);
  }
};
