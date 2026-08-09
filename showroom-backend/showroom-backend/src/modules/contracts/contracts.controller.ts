import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../../config/prisma';
import { canAccessBranch } from '../../middleware/auth.middleware';
import { sendSuccess, sendError } from '../../utils/response';

const OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'contracts');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function mayAccessOrder(req: Request, order: { customer_id: string; branch_id: string }): boolean {
  if (req.user!.role === 'admin') return true;
  if (req.user!.role === 'staff') return canAccessBranch(req, order.branch_id);
  return order.customer_id === req.user!.user_id;
}

export const createContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const order_id = req.params.id;
    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: {
        car: { select: { brand: true, model: true, year: true, fuel_type: true, transmission: true } },
        customer: { select: { full_name: true, email: true, phone: true } },
        branch: { select: { name: true, address: true, phone: true } },
        contract: true,
      },
    });
    if (!order) { sendError(res, 'Không tìm thấy đơn hàng', 404); return; }
    if (!mayAccessOrder(req, order)) { sendError(res, 'Không có quyền với đơn hàng ngoài chi nhánh', 403); return; }
    if (order.status === 'cancelled') { sendError(res, 'Không thể tạo hợp đồng cho đơn đã hủy', 409); return; }
    if (order.contract) { sendError(res, 'Hợp đồng đã tồn tại', 409); return; }

    const filename = `contract_${order_id}_${Date.now()}.html`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), generateContractHtml(order), 'utf-8');

    const contract = await prisma.contract.create({
      data: { order_id, file_url: `/api/orders/${order_id}/contract/file`, signed_at: null },
    });
    sendSuccess(res, contract, 'Tạo hợp đồng thành công', 201);
  } catch (err) {
    console.error('[createContract]', err);
    sendError(res);
  }
};

export const getContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { order_id: req.params.id },
      include: {
        order: {
          include: {
            car: true,
            customer: { select: { id: true, full_name: true, email: true, phone: true } },
          },
        },
      },
    });
    if (!contract) { sendError(res, 'Chưa có hợp đồng cho đơn này', 404); return; }
    if (!mayAccessOrder(req, contract.order)) { sendError(res, 'Không có quyền xem hợp đồng này', 403); return; }
    sendSuccess(res, contract);
  } catch (err) {
    console.error('[getContract]', err);
    sendError(res);
  }
};

export const downloadContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { order_id: req.params.id },
      include: { order: { select: { customer_id: true, branch_id: true } } },
    });
    if (!contract) { sendError(res, 'Không tìm thấy hợp đồng', 404); return; }
    if (!mayAccessOrder(req, contract.order)) { sendError(res, 'Không có quyền tải hợp đồng này', 403); return; }

    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(name => name.startsWith(`contract_${req.params.id}_`) && name.endsWith('.html'))
      .sort()
      .reverse();
    if (!files[0]) { sendError(res, 'Tệp hợp đồng không tồn tại', 404); return; }

    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
    res.sendFile(path.join(OUTPUT_DIR, path.basename(files[0])));
  } catch (err) {
    console.error('[downloadContract]', err);
    sendError(res);
  }
};

export const signContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { order_id: req.params.id },
      include: { order: { select: { customer_id: true, branch_id: true } } },
    });
    if (!contract) { sendError(res, 'Không tìm thấy hợp đồng', 404); return; }
    if (!mayAccessOrder(req, contract.order)) { sendError(res, 'Không có quyền ký hợp đồng ngoài chi nhánh', 403); return; }
    if (contract.signed_at) { sendError(res, 'Hợp đồng đã được ký', 409); return; }

    const updated = await prisma.contract.update({
      where: { order_id: req.params.id },
      data: { signed_at: new Date(), signed_by_id: req.user!.user_id },
    });
    sendSuccess(res, updated, 'Ký hợp đồng thành công');
  } catch (err) {
    console.error('[signContract]', err);
    sendError(res);
  }
};

function generateContractHtml(order: {
  id: string;
  type: string;
  total_amount: unknown;
  created_at: Date;
  notes?: string | null;
  car: { brand: string; model: string; year: number; fuel_type: string; transmission: string };
  customer: { full_name: string; email: string; phone?: string | null };
  branch: { name: string; address?: string | null; phone?: string | null };
}) {
  const typeLabel = order.type === 'deposit' ? 'ĐẶT CỌC XE' : 'MUA XE';
  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>Hợp đồng ${typeLabel}</title>
<style>body{font-family:'Times New Roman',serif;max-width:800px;margin:40px auto;color:#1a1a1a;line-height:1.8}h1{text-align:center;font-size:20px}.subtitle{text-align:center;color:#555;margin-bottom:30px}.section{margin-bottom:24px}.section h2{font-size:15px;border-bottom:1px solid #333}.row{display:flex;gap:8px}.label{font-weight:bold;min-width:200px}.signatures{display:flex;justify-content:space-between;margin-top:60px}.sig-box{text-align:center;width:200px}.sig-line{border-top:1px solid #333;margin-top:60px}</style>
</head><body>
<h1>Hợp đồng ${typeLabel}</h1><div class="subtitle">Số: HD-${escapeHtml(order.id.slice(0, 8).toUpperCase())} | Ngày: ${formatDate(order.created_at)}</div>
<div class="section"><h2>I. Thông tin khách hàng</h2>
<div class="row"><span class="label">Họ và tên:</span><span>${escapeHtml(order.customer.full_name)}</span></div>
<div class="row"><span class="label">Email:</span><span>${escapeHtml(order.customer.email)}</span></div>
<div class="row"><span class="label">Điện thoại:</span><span>${escapeHtml(order.customer.phone || '—')}</span></div></div>
<div class="section"><h2>II. Thông tin xe</h2>
<div class="row"><span class="label">Xe:</span><span>${escapeHtml(order.car.brand)} ${escapeHtml(order.car.model)} (${order.car.year})</span></div>
<div class="row"><span class="label">Nhiên liệu:</span><span>${escapeHtml(order.car.fuel_type)}</span></div>
<div class="row"><span class="label">Hộp số:</span><span>${escapeHtml(order.car.transmission)}</span></div></div>
<div class="section"><h2>III. Điều khoản giao dịch</h2>
<div class="row"><span class="label">Loại hợp đồng:</span><span>${typeLabel}</span></div>
<div class="row"><span class="label">Giá trị:</span><strong>${formatCurrency(Number(order.total_amount))}</strong></div>
<div class="row"><span class="label">Chi nhánh:</span><span>${escapeHtml(order.branch.name)} — ${escapeHtml(order.branch.address)}</span></div>
${order.notes ? `<div class="row"><span class="label">Ghi chú:</span><span>${escapeHtml(order.notes)}</span></div>` : ''}</div>
<div class="section"><h2>IV. Cam kết</h2><p>Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng này. Mọi tranh chấp sẽ được giải quyết theo pháp luật Việt Nam.</p></div>
<div class="signatures"><div class="sig-box"><div class="sig-line">Đại diện Showroom</div></div><div class="sig-box"><div class="sig-line">Khách hàng</div></div></div>
</body></html>`;
}
