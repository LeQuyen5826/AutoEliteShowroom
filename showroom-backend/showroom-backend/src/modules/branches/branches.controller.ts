import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';

/**
 * GET /api/branches
 * Danh sách tất cả chi nhánh
 */
export const listBranches = async (_req: Request, res: Response): Promise<void> => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { cars: true, users: true } },
      },
    });
    sendSuccess(res, branches);
  } catch (err) {
    console.error('[listBranches]', err);
    sendError(res);
  }
};

/**
 * GET /api/branches/:id
 * Chi tiết chi nhánh
 */
export const getBranchById = async (req: Request, res: Response): Promise<void> => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { cars: true, users: true } },
      },
    });
    if (!branch) {
      sendError(res, 'Không tìm thấy chi nhánh', 404);
      return;
    }
    sendSuccess(res, branch);
  } catch (err) {
    console.error('[getBranchById]', err);
    sendError(res);
  }
};

/**
 * POST /api/branches  (admin)
 */
export const createBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, phone } = req.body;
    const branch = await prisma.branch.create({ data: { name, address, phone } });
    sendSuccess(res, branch, 'Tạo chi nhánh thành công', 201);
  } catch (err) {
    console.error('[createBranch]', err);
    sendError(res);
  }
};

/**
 * PUT /api/branches/:id  (admin)
 */
export const updateBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, phone } = req.body;
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { name, address, phone },
    });
    sendSuccess(res, branch, 'Cập nhật chi nhánh thành công');
  } catch (err) {
    console.error('[updateBranch]', err);
    sendError(res);
  }
};

/**
 * DELETE /api/branches/:id  (admin)
 */
export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.branch.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Xóa chi nhánh thành công');
  } catch (err) {
    console.error('[deleteBranch]', err);
    sendError(res);
  }
};
