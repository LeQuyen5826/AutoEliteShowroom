import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';

/**
 * GET /api/dashboard/overview
 * Tổng quan hệ thống
 */
export const getOverview = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalCars, availableCars, soldCars, reservedCars,
      totalOrders, pendingOrders, completedOrders,
      totalCustomers, totalStaff,
      totalTestDrives, pendingTestDrives,
      recentOrders,
    ] = await Promise.all([
      prisma.car.count(),
      prisma.car.count({ where: { status: 'available' } }),
      prisma.car.count({ where: { status: 'sold' } }),
      prisma.car.count({ where: { status: 'reserved' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.order.count({ where: { status: 'completed' } }),
      prisma.user.count({ where: { role: 'customer' } }),
      prisma.user.count({ where: { role: 'staff' } }),
      prisma.testDrive.count(),
      prisma.testDrive.count({ where: { status: 'pending' } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          customer: { select: { full_name: true, email: true } },
          car: { select: { brand: true, model: true, year: true } },
        },
      }),
    ]);

    // Tổng doanh thu từ payments
    const revenueResult = await prisma.payment.aggregate({
      _sum: { amount: true },
    });
    const totalRevenue = Number(revenueResult._sum.amount || 0);

    sendSuccess(res, {
      cars: { total: totalCars, available: availableCars, sold: soldCars, reserved: reservedCars },
      orders: { total: totalOrders, pending: pendingOrders, completed: completedOrders },
      users: { customers: totalCustomers, staff: totalStaff },
      testDrives: { total: totalTestDrives, pending: pendingTestDrives },
      revenue: { total: totalRevenue },
      recentOrders,
    });
  } catch (err) {
    console.error('[getOverview]', err);
    sendError(res);
  }
};

/**
 * GET /api/dashboard/revenue
 * Doanh thu theo tháng trong năm hiện tại
 */
export const getRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const payments = await prisma.payment.findMany({
      where: {
        paid_at: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: { amount: true, paid_at: true },
    });

    // Nhóm theo tháng
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: `T${i + 1}`,
      revenue: 0,
      orders: 0,
    }));

    payments.forEach((p) => {
      const month = new Date(p.paid_at).getUTCMonth();
      monthlyRevenue[month].revenue += Number(p.amount);
      monthlyRevenue[month].orders += 1;
    });

    const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);

    sendSuccess(res, { year, monthlyRevenue, totalRevenue });
  } catch (err) {
    console.error('[getRevenue]', err);
    sendError(res);
  }
};

/**
 * GET /api/dashboard/cars-status
 * Thống kê xe theo trạng thái và chi nhánh
 */
export const getCarsStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [byStatus, byBrand, byBranch] = await Promise.all([
      prisma.car.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.car.groupBy({
        by: ['brand'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.branch.findMany({
        select: {
          name: true,
          _count: { select: { cars: true } },
        },
      }),
    ]);

    sendSuccess(res, {
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      byBrand: byBrand.map(b => ({ brand: b.brand, count: b._count.id })),
      byBranch: byBranch.map(b => ({ branch: b.name, count: b._count.cars })),
    });
  } catch (err) {
    console.error('[getCarsStatus]', err);
    sendError(res);
  }
};

/** Tổng quan công việc theo chi nhánh dành cho nhân viên. */
export const getStaffOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedBranch = typeof req.query.branch_id === 'string' ? req.query.branch_id : undefined;
    const branchId = req.user?.role === 'admin' ? requestedBranch : req.user?.branch_id;
    if (!branchId) {
      sendError(res, 'Tài khoản chưa được gán chi nhánh', 422);
      return;
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, address: true },
    });
    if (!branch) {
      sendError(res, 'Không tìm thấy chi nhánh', 404);
      return;
    }

    const [
      totalCars, availableCars, pendingOrders, confirmedOrders,
      pendingTestDrives, pendingMaintenances, customerCount, revenue,
      recentOrders,
    ] = await Promise.all([
      prisma.car.count({ where: { branch_id: branchId } }),
      prisma.car.count({ where: { branch_id: branchId, status: 'available' } }),
      prisma.order.count({ where: { branch_id: branchId, status: 'pending' } }),
      prisma.order.count({ where: { branch_id: branchId, status: 'confirmed' } }),
      prisma.testDrive.count({ where: { branch_id: branchId, status: 'pending' } }),
      prisma.maintenance.count({ where: { branch_id: branchId, status: { in: ['pending', 'confirmed', 'in_progress'] } } }),
      prisma.user.count({
        where: {
          role: 'customer',
          OR: [
            { orders_as_customer: { some: { branch_id: branchId } } },
            { test_drives: { some: { branch_id: branchId } } },
            { maintenances: { some: { branch_id: branchId } } },
          ],
        },
      }),
      prisma.payment.aggregate({ where: { order: { branch_id: branchId } }, _sum: { amount: true } }),
      prisma.order.findMany({
        where: { branch_id: branchId },
        take: 6,
        orderBy: { created_at: 'desc' },
        include: {
          customer: { select: { full_name: true, phone: true } },
          car: { select: { brand: true, model: true, year: true } },
        },
      }),
    ]);

    sendSuccess(res, {
      branch,
      cars: { total: totalCars, available: availableCars },
      orders: { pending: pendingOrders, confirmed: confirmedOrders },
      testDrives: { pending: pendingTestDrives },
      maintenances: { active: pendingMaintenances },
      customers: { total: customerCount },
      revenue: { total: Number(revenue._sum.amount || 0) },
      recentOrders,
    });
  } catch (err) {
    console.error('[getStaffOverview]', err);
    sendError(res);
  }
};
