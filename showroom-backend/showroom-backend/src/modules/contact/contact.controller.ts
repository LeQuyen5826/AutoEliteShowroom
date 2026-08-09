import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { sendError, sendSuccess } from '../../utils/response';

export const createContactLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const lead = await prisma.contactLead.create({
      data: {
        name: req.body.name,
        email: String(req.body.email).trim().toLowerCase(),
        phone: req.body.phone || null,
        subject: req.body.subject || null,
        message: req.body.message,
      },
      select: { id: true, created_at: true },
    });
    sendSuccess(res, lead, 'Đã nhận yêu cầu liên hệ', 201);
  } catch (err) {
    console.error('[createContactLead]', err);
    sendError(res, 'Không thể gửi yêu cầu liên hệ');
  }
};

export const listContactLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = status ? { status } : {};
    const [leads, total] = await Promise.all([
      prisma.contactLead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.contactLead.count({ where }),
    ]);
    sendSuccess(res, { leads, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[listContactLeads]', err);
    sendError(res);
  }
};
