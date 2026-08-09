import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { CarStatus, CarCondition, Prisma } from '@prisma/client';
import { canAccessBranch } from '../../middleware/auth.middleware';
import { buildNaturalLanguageWhere, syncCarSearchDocument } from '../../utils/car-search';
import { geminiVisionSearch } from '../../utils/gemini';

/**
 * GET /api/cars
 * Danh sách xe với filter và phân trang
 */
export const listCars = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      brand, model, fuel_type, transmission, status, condition,
      min_price, max_price, min_year, max_year,
      branch_id, search, page = '1', limit = '12',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.CarWhereInput = {};
    if (brand) where.brand = { contains: String(brand), mode: 'insensitive' };
    if (model) where.model = { contains: String(model), mode: 'insensitive' };
    if (fuel_type) where.fuel_type = String(fuel_type);
    if (transmission) where.transmission = String(transmission);
    if (status) where.status = status as CarStatus;
    if (condition) where.condition = condition as CarCondition;
    if (branch_id) where.branch_id = String(branch_id);
    if (min_price || max_price) {
      where.price = {};
      if (min_price) (where.price as Prisma.DecimalFilter).gte = parseFloat(min_price as string);
      if (max_price) (where.price as Prisma.DecimalFilter).lte = parseFloat(max_price as string);
    }
    if (min_year || max_year) {
      where.year = {};
      if (min_year) (where.year as Prisma.IntFilter).gte = parseInt(min_year as string);
      if (max_year) (where.year as Prisma.IntFilter).lte = parseInt(max_year as string);
    }
    if (typeof search === 'string' && search.trim()) {
      where.AND = [buildNaturalLanguageWhere(search.trim())];
    }

    const [cars, total] = await Promise.all([
      prisma.car.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          images: { where: { is_primary: true }, take: 1 },
          branch: { select: { id: true, name: true } },
        },
      }),
      prisma.car.count({ where }),
    ]);

    sendSuccess(res, {
      cars,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error('[listCars]', err);
    sendError(res);
  }
};

/**
 * GET /api/cars/:id
 * Chi tiết một xe
 */
export const getCarById = async (req: Request, res: Response): Promise<void> => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.id },
      include: {
        images: true,
        branch: true,
        reviews: {
          where: { is_visible: true },
          include: { customer: { select: { id: true, full_name: true } } },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!car) {
      sendError(res, 'Không tìm thấy xe', 404);
      return;
    }

    sendSuccess(res, car);
  } catch (err) {
    console.error('[getCarById]', err);
    sendError(res);
  }
};

/**
 * POST /api/cars
 * (Staff/Admin) Thêm xe mới
 */
export const createCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      branch_id, stock_code, vin, brand, model, year, price, mileage,
      fuel_type, transmission, status, condition, specs, description,
    } = req.body;

    if (req.user!.role === 'staff' && !canAccessBranch(req, branch_id)) {
      sendError(res, 'Nhân viên chỉ được thêm xe vào chi nhánh của mình', 403); return;
    }

    const car = await prisma.car.create({
      data: {
        branch_id, stock_code: stock_code || null, vin: vin || null, brand, model,
        year: parseInt(year),
        price,
        mileage: mileage ? parseInt(mileage) : 0,
        fuel_type, transmission,
        status: status || 'available',
        condition: condition || 'new_car',
        specs, description,
      },
    });

    await syncCarSearchDocument(car).catch(err => console.error('[syncCarSearchDocument:create]', err));

    sendSuccess(res, car, 'Thêm xe thành công', 201);
  } catch (err) {
    console.error('[createCar]', err);
    sendError(res);
  }
};

/**
 * PUT /api/cars/:id
 * (Staff/Admin) Cập nhật thông tin xe
 */
export const updateCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      sendError(res, 'Không tìm thấy xe', 404);
      return;
    }
    if (req.user!.role === 'staff' && !canAccessBranch(req, existing.branch_id)) {
      sendError(res, 'Không có quyền sửa xe ngoài chi nhánh', 403); return;
    }

    const {
      stock_code, vin, brand, model, year, price, mileage,
      fuel_type, transmission, status, condition, specs, description, branch_id,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    if (stock_code !== undefined) updateData.stock_code = stock_code || null;
    if (vin !== undefined) updateData.vin = vin || null;
    if (brand !== undefined) updateData.brand = brand;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = parseInt(year);
    if (price !== undefined) updateData.price = price;
    if (mileage !== undefined) updateData.mileage = parseInt(mileage);
    if (fuel_type !== undefined) updateData.fuel_type = fuel_type;
    if (transmission !== undefined) updateData.transmission = transmission;
    if (status !== undefined) updateData.status = status;
    if (condition !== undefined) updateData.condition = condition;
    if (specs !== undefined) updateData.specs = specs;
    if (description !== undefined) updateData.description = description;
    if (branch_id !== undefined) {
      if (req.user!.role === 'staff' && !canAccessBranch(req, branch_id)) {
        sendError(res, 'Không được chuyển xe sang chi nhánh khác', 403); return;
      }
      updateData.branch_id = branch_id;
    }

    const car = await prisma.car.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await syncCarSearchDocument(car).catch(err => console.error('[syncCarSearchDocument:update]', err));

    sendSuccess(res, car, 'Cập nhật xe thành công');
  } catch (err) {
    console.error('[updateCar]', err);
    sendError(res);
  }
};

/**
 * DELETE /api/cars/:id
 * (Admin) Xóa xe
 */
export const deleteCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      sendError(res, 'Không tìm thấy xe', 404);
      return;
    }

    await prisma.car.delete({ where: { id: req.params.id } });

    sendSuccess(res, null, 'Xóa xe thành công');
  } catch (err) {
    console.error('[deleteCar]', err);
    sendError(res);
  }
};

/**
 * POST /api/cars/:id/images
 * Upload ảnh cho xe (lưu URL từ body, tích hợp storage ở Sprint 2)
 */
export const addCarImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, is_primary = false } = req.body;

    const car = await prisma.car.findUnique({ where: { id: req.params.id } });
    if (!car) {
      sendError(res, 'Không tìm thấy xe', 404);
      return;
    }
    if (req.user!.role === 'staff' && !canAccessBranch(req, car.branch_id)) {
      sendError(res, 'Không có quyền quản lý ảnh xe ngoài chi nhánh', 403); return;
    }

    // Nếu đây là ảnh chính, bỏ is_primary của ảnh khác
    if (is_primary) {
      await prisma.carImage.updateMany({
        where: { car_id: req.params.id },
        data: { is_primary: false },
      });
    }

    const image = await prisma.carImage.create({
      data: { car_id: req.params.id, url, is_primary },
    });

    sendSuccess(res, image, 'Thêm ảnh thành công', 201);
  } catch (err) {
    console.error('[addCarImage]', err);
    sendError(res);
  }
};

/**
 * DELETE /api/cars/:id/images/:imageId
 * Xóa 1 ảnh của xe
 */
export const deleteCarImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, imageId } = req.params;

    const image = await prisma.carImage.findUnique({ where: { id: imageId }, include: { car: true } });
    if (!image || image.car_id !== id) {
      sendError(res, 'Không tìm thấy ảnh', 404);
      return;
    }
    if (req.user!.role === 'staff' && !canAccessBranch(req, image.car.branch_id)) {
      sendError(res, 'Không có quyền quản lý ảnh xe ngoài chi nhánh', 403); return;
    }

    await prisma.carImage.delete({ where: { id: imageId } });

    sendSuccess(res, null, 'Xóa ảnh thành công');
  } catch (err) {
    console.error('[deleteCarImage]', err);
    sendError(res);
  }
};

/**
 * PATCH /api/cars/:id/images/:imageId/primary
 * Đặt 1 ảnh làm ảnh đại diện (primary) cho xe
 */
export const setPrimaryCarImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, imageId } = req.params;

    const image = await prisma.carImage.findUnique({ where: { id: imageId }, include: { car: true } });
    if (!image || image.car_id !== id) {
      sendError(res, 'Không tìm thấy ảnh', 404);
      return;
    }
    if (req.user!.role === 'staff' && !canAccessBranch(req, image.car.branch_id)) {
      sendError(res, 'Không có quyền quản lý ảnh xe ngoài chi nhánh', 403); return;
    }

    await prisma.carImage.updateMany({ where: { car_id: id }, data: { is_primary: false } });
    const updated = await prisma.carImage.update({ where: { id: imageId }, data: { is_primary: true } });

    sendSuccess(res, updated, 'Đã đặt làm ảnh đại diện');
  } catch (err) {
    console.error('[setPrimaryCarImage]', err);
    sendError(res);
  }
};

/** POST /api/cars/image-search - tìm xe trong kho bằng ảnh khách tải lên. */
export const searchCarsByImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'Vui lòng chọn ảnh xe', 400);
      return;
    }

    const inventory = await prisma.car.findMany({
      where: { status: 'available' },
      orderBy: { created_at: 'desc' },
      take: 30,
      include: {
        images: { orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }], take: 2 },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!inventory.length) {
      sendSuccess(res, { analysis: 'Kho xe hiện chưa có dữ liệu để đối chiếu.', matches: [] });
      return;
    }

    const result = await geminiVisionSearch(req.file.buffer, req.file.mimetype, inventory);
    const carsById = new Map(inventory.map(car => [car.id, car]));
    const matches = result.matches
      .map(match => ({ ...match, car: carsById.get(match.car_id) }))
      .filter(match => Boolean(match.car));

    sendSuccess(res, { analysis: result.analysis, matches });
  } catch (err) {
    console.error('[searchCarsByImage]', err);
    const message = err instanceof Error ? err.message : '';
    if (message.includes('GEMINI_API_KEY')) {
      sendError(res, 'Chưa cấu hình Gemini API key cho chức năng tìm bằng ảnh', 503);
    } else if (/429|quota/i.test(message)) {
      sendError(res, 'Dịch vụ nhận diện ảnh đang bận, vui lòng thử lại sau', 429);
    } else {
      sendError(res, 'Không thể phân tích ảnh xe, vui lòng thử ảnh khác', 502);
    }
  }
};
