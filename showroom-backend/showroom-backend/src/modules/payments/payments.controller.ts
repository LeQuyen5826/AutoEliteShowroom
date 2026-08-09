import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { canAccessBranch } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const amount = new Prisma.Decimal(req.body.amount);
    const { method, note, reference } = req.body;
    const order_id = req.params.id;

    if (reference) {
      const existing = await prisma.payment.findUnique({ where: { reference } });
      if (existing) {
        sendSuccess(res, existing, 'Giao dịch đã được ghi nhận trước đó');
        return;
      }
    }

    const payment = await prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id: order_id } });
      if (!order) throw new Error('ORDER_NOT_FOUND');
      if (req.user!.role === 'staff' && !canAccessBranch(req, order.branch_id)) throw new Error('FORBIDDEN');
      if (order.status === 'cancelled') throw new Error('ORDER_CANCELLED');

      const aggregate = await tx.payment.aggregate({
        where: { order_id },
        _sum: { amount: true },
      });
      const paid = aggregate._sum.amount || new Prisma.Decimal(0);
      const remaining = order.total_amount.minus(order.financing_amount).minus(paid);
      if (amount.greaterThan(remaining)) throw new Error('OVERPAYMENT');

      return tx.payment.create({
        data: {
          order_id,
          amount,
          method,
          note,
          reference: reference || null,
          recorded_by_id: req.user!.user_id,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    sendSuccess(res, payment, 'Ghi nhận thanh toán thành công', 201);
  } catch (err) {
    if (err instanceof Error) {
      const known: Record<string, [string, number]> = {
        ORDER_NOT_FOUND: ['Không tìm thấy đơn hàng', 404],
        FORBIDDEN: ['Không có quyền ghi nhận thanh toán cho chi nhánh này', 403],
        ORDER_CANCELLED: ['Đơn hàng đã bị hủy', 409],
        OVERPAYMENT: ['Số tiền vượt quá giá trị còn lại của đơn hàng', 409],
      };
      if (known[err.message]) {
        sendError(res, known[err.message][0], known[err.message][1]);
        return;
      }
    }
    console.error('[createPayment]', err);
    sendError(res);
  }
};

export const listPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const order_id = req.params.id;
    const order = await prisma.order.findUnique({ where: { id: order_id } });
    if (!order) { sendError(res, 'Không tìm thấy đơn hàng', 404); return; }
    if (req.user!.role === 'customer' && order.customer_id !== req.user!.user_id) {
      sendError(res, 'Không có quyền', 403); return;
    }
    if (req.user!.role === 'staff' && !canAccessBranch(req, order.branch_id)) {
      sendError(res, 'Không có quyền xem thanh toán ngoài chi nhánh', 403); return;
    }

    const payments = await prisma.payment.findMany({
      where: { order_id },
      orderBy: { paid_at: 'desc' },
    });
    const totalPaid = payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
    const orderRemaining = Prisma.Decimal.max(
      order.total_amount.minus(order.financing_amount).minus(totalPaid),
      new Prisma.Decimal(0)
    );
    const checkoutRemaining = Prisma.Decimal.max(
      order.payment_due_amount.minus(totalPaid),
      new Prisma.Decimal(0)
    );
    sendSuccess(res, {
      payments,
      totalPaid,
      remaining: orderRemaining,
      checkoutRemaining,
      total: order.total_amount,
      paymentDue: order.payment_due_amount,
      financingAmount: order.financing_amount,
    });
  } catch (err) {
    console.error('[listPayments]', err);
    sendError(res);
  }
};

export const getPaymentQr = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        payments: { select: { amount: true } },
        car: { select: { brand: true, model: true, year: true } },
      },
    });
    if (!order) { sendError(res, 'Không tìm thấy đơn hàng', 404); return; }
    if (req.user!.role === 'customer' && order.customer_id !== req.user!.user_id) {
      sendError(res, 'Không có quyền xem mã thanh toán này', 403); return;
    }
    if (req.user!.role === 'staff' && !canAccessBranch(req, order.branch_id)) {
      sendError(res, 'Không có quyền xem thanh toán ngoài chi nhánh', 403); return;
    }
    if (order.status === 'cancelled') {
      sendError(res, 'Đơn hàng đã bị hủy', 409); return;
    }

    const bankId = process.env.VIETQR_BANK_ID?.trim();
    const accountNo = process.env.VIETQR_ACCOUNT_NO?.trim();
    const accountName = process.env.VIETQR_ACCOUNT_NAME?.trim();
    if (!bankId || !accountNo || !accountName || !/^[a-zA-Z0-9]+$/.test(bankId) || !/^[a-zA-Z0-9]+$/.test(accountNo)) {
      sendError(res, 'Chưa cấu hình tài khoản VietQR trên máy chủ', 503); return;
    }

    const totalPaid = order.payments.reduce(
      (sum, payment) => sum.plus(payment.amount),
      new Prisma.Decimal(0)
    );
    const amount = Prisma.Decimal.max(order.payment_due_amount.minus(totalPaid), new Prisma.Decimal(0));
    const reference = `AE${order.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const qrImageUrl = amount.greaterThan(0)
      ? `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-compact2.png` +
        `?amount=${amount.toFixed(0)}&addInfo=${encodeURIComponent(reference)}&accountName=${encodeURIComponent(accountName)}`
      : null;

    sendSuccess(res, {
      order_id: order.id,
      car_name: `${order.car.brand} ${order.car.model} ${order.car.year}`,
      amount,
      reference,
      qr_image_url: qrImageUrl,
      bank_id: bankId,
      account_no: accountNo,
      account_name: accountName,
      payment_due: order.payment_due_amount,
      total_paid: totalPaid,
      is_checkout_paid: amount.equals(0),
    });
  } catch (err) {
    console.error('[getPaymentQr]', err);
    sendError(res, 'Không thể tạo mã thanh toán', 500);
  }
};
