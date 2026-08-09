import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clipboard, CreditCard, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { ordersService } from '@/services/orders.service'
import { formatPrice } from '@/utils'
import type { Order } from '@/types'

function getErrorMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error instanceof Error ? error.message : 'Không thể tải thông tin thanh toán')
}

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>()
  const [copied, setCopied] = useState('')

  const orderQuery = useQuery({
    queryKey: ['order-payment', id],
    queryFn: () => ordersService.getById(id!),
    enabled: !!id,
  })
  const qrQuery = useQuery({
    queryKey: ['payment-qr', id],
    queryFn: () => ordersService.getPaymentQr(id!),
    enabled: !!id,
    retry: false,
  })
  const paymentsQuery = useQuery({
    queryKey: ['payments', id],
    queryFn: () => ordersService.getPayments(id!),
    enabled: !!id,
  })

  const order = orderQuery.data as Order | undefined
  const qr = qrQuery.data
  const payments = paymentsQuery.data?.payments || []
  const loading = orderQuery.isLoading || qrQuery.isLoading || paymentsQuery.isLoading

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1500)
  }

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={30} className="animate-spin text-primary-600" />
    </div>
  )

  if (orderQuery.isError || !order) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <p className="text-red-600">{getErrorMessage(orderQuery.error)}</p>
      <Link to="/orders" className="btn-secondary mt-5 inline-flex">Quay lại đơn hàng</Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <p className="text-sm text-primary-600 font-medium">Đơn #{order.id.slice(0, 8).toUpperCase()}</p>
        <h1 className="font-display font-bold text-2xl text-neutral-900 mt-1">Thanh toán đơn hàng</h1>
        <p className="text-sm text-neutral-500 mt-1">Quét mã QR hoặc chuyển khoản đúng nội dung để nhân viên đối soát.</p>
      </div>

      <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-6 items-start">
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard size={19} className="text-primary-600" />
            <h2 className="font-display font-semibold">Thông tin thanh toán</h2>
          </div>

          {qrQuery.isError ? (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
              {getErrorMessage(qrQuery.error)}. Vui lòng liên hệ showroom để nhận thông tin chuyển khoản.
            </div>
          ) : qr?.is_checkout_paid ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-6 text-center">
              <CheckCircle size={42} className="mx-auto text-emerald-500 mb-3" />
              <p className="font-semibold text-emerald-800">Đã thanh toán đủ số tiền cần trả ở bước này</p>
              <p className="text-sm text-emerald-700 mt-1">Nhân viên showroom sẽ tiếp tục xử lý đơn hàng.</p>
            </div>
          ) : qr ? (
            <>
              <div className="flex justify-center bg-white rounded-2xl border border-neutral-100 p-3">
                {qr.qr_image_url && (
                  <img
                    src={qr.qr_image_url}
                    alt="Mã VietQR thanh toán đơn hàng"
                    className="w-full max-w-sm rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {[
                  ['Số tiền', formatPrice(qr.amount), String(qr.amount)],
                  ['Số tài khoản', qr.account_no, qr.account_no],
                  ['Chủ tài khoản', qr.account_name, qr.account_name],
                  ['Nội dung', qr.reference, qr.reference],
                ].map(([label, shown, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 last:border-0">
                    <span className="text-neutral-500">{label}</span>
                    <div className="flex items-center gap-2 text-right">
                      <span className={label === 'Số tiền' ? 'font-bold text-accent' : 'font-medium'}>{shown}</span>
                      <button type="button" onClick={() => copy(label, value)} className="text-neutral-400 hover:text-primary-600" title="Sao chép">
                        {copied === label ? <CheckCircle size={15} className="text-emerald-500" /> : <Clipboard size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <p>Mã QR không tự đánh dấu đã thanh toán. Showroom chỉ xác nhận sau khi giao dịch thực tế được đối soát.</p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-display font-semibold mb-4">Tóm tắt đơn hàng</h2>
            <div className="flex gap-3 mb-4">
              <div className="w-24 h-20 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                {order.car?.images?.[0]?.url && <img src={order.car.images[0].url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="font-medium">{order.car?.brand} {order.car?.model} {order.car?.year}</p>
                <p className="text-xs text-neutral-500 mt-1">{order.type === 'deposit' ? 'Đặt cọc giữ xe' : 'Mua xe'}</p>
                <p className="text-xs text-neutral-500">{order.payment_plan === 'installment' ? `Trả góp ${order.financing_months} tháng` : 'Thanh toán toàn bộ'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Giá xe</span><span>{formatPrice(order.total_amount)}</span></div>
              {Number(order.financing_amount) > 0 && <div className="flex justify-between"><span className="text-neutral-500">Hỗ trợ trả góp</span><span>- {formatPrice(order.financing_amount)}</span></div>}
              <div className="flex justify-between border-t border-neutral-100 pt-2 font-semibold"><span>Cần trả bước này</span><span className="text-accent">{formatPrice(order.payment_due_amount)}</span></div>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold">Lịch sử ghi nhận</h2>
              <button type="button" onClick={() => { paymentsQuery.refetch(); qrQuery.refetch() }} className="text-primary-600" title="Tải lại"><RefreshCw size={16} /></button>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-neutral-500">Chưa có khoản thanh toán nào được xác nhận.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((payment: { id: string; amount: number | string; method?: string; paid_at: string }) => (
                  <div key={payment.id} className="flex justify-between text-sm py-2 border-b border-neutral-100 last:border-0">
                    <div><p className="font-medium">{formatPrice(payment.amount)}</p><p className="text-xs text-neutral-400">{new Date(payment.paid_at).toLocaleString('vi-VN')}</p></div>
                    <span className="text-emerald-600">Đã xác nhận</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Link to="/orders" className="btn-secondary w-full">Xem tất cả đơn hàng</Link>
        </div>
      </div>
    </div>
  )
}
