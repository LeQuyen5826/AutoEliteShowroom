import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersService } from '@/services/orders.service'
import { formatPrice } from '@/utils'
import { Loader2, X, ShoppingCart, CreditCard, FileText, ChevronRight } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Chờ xác nhận', color: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Đã xác nhận',  color: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Hoàn tất',     color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Đã hủy',       color: 'bg-neutral-100 text-neutral-500' },
}
const TYPE_MAP: Record<string, string> = { deposit: 'Đặt cọc', purchase: 'Mua xe' }
const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message || (err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại')
}

interface OrderRow {
  id: string
  type: string
  status: string
  total_amount: number | string
  created_at: string
  customer: { full_name: string; email: string; phone?: string }
  car: { brand: string; model: string; year: number }
  payments?: { amount: number | string; method?: string; paid_at: string }[]
}

export default function AdminOrders() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', note: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', status, page],
    queryFn: () => ordersService.getAll({ status: status || undefined, page, limit: 10 }),
  })

  const { data: detail } = useQuery({
    queryKey: ['order-detail', detailId],
    queryFn: () => ordersService.getById(detailId!),
    enabled: !!detailId,
  })

  const { data: payments } = useQuery({
    queryKey: ['order-payments', detailId],
    queryFn: () => ordersService.getPayments(detailId!),
    enabled: !!detailId,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['order-detail'] })
      setPendingStatus(null)
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const paymentMutation = useMutation({
    mutationFn: () => ordersService.addPayment(detailId!, { amount: Number(paymentForm.amount), method: paymentForm.method, note: paymentForm.note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order-payments', detailId] })
      setPaymentForm({ amount: '', method: 'cash', note: '' })
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const contractMutation = useMutation({
    mutationFn: () => ordersService.createContract(detailId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['order-detail', detailId] }),
  })

  const orders: OrderRow[] = data?.orders ?? []
  const pagination = data?.pagination

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý đơn hàng</h1>
        <p className="text-sm text-neutral-500 mt-1">{pagination?.total ?? 0} đơn hàng</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[{ v: '', l: 'Tất cả' }, ...Object.entries(STATUS_MAP).map(([v, s]) => ({ v, l: s.label }))].map(opt => (
          <button key={opt.v} onClick={() => { setStatus(opt.v); setPage(1) }}
            className={`px-4 py-2 text-sm rounded-xl border whitespace-nowrap transition-colors ${status === opt.v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
            {opt.l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                {['Khách hàng', 'Xe', 'Loại', 'Tổng tiền', 'Trạng thái', 'Ngày tạo', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-neutral-400" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-400 text-sm">Không có đơn hàng nào</td></tr>
              ) : orders.map(order => {
                const st = STATUS_MAP[order.status]
                return (
                  <tr key={order.id} onClick={() => { setDetailId(order.id); setPendingStatus(null) }} className="hover:bg-neutral-50 transition-colors cursor-pointer">
                    <td className="py-3 px-4">
                      <p className="font-medium text-neutral-900">{order.customer.full_name}</p>
                      <p className="text-xs text-neutral-400">{order.customer.email}</p>
                    </td>
                    <td className="py-3 px-4 text-neutral-700">{order.car.brand} {order.car.model} {order.car.year}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${order.type === 'purchase' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'}`}>{TYPE_MAP[order.type]}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-accent">{formatPrice(order.total_amount)}</td>
                    <td className="py-3 px-4"><span className={`badge ${st.color}`}>{st.label}</span></td>
                    <td className="py-3 px-4 text-neutral-500">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4"><ChevronRight size={16} className="text-neutral-400" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">Trang {pagination.page}/{pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Trước</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal chi tiết đơn hàng */}
      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary-600" />
                <h2 className="font-display font-semibold text-neutral-900">Chi tiết đơn hàng</h2>
              </div>
              <button onClick={() => { setDetailId(null); setPendingStatus(null) }} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-neutral-400 text-xs mb-0.5">Khách hàng</p>
                  <p className="font-medium text-neutral-900">{detail.customer.full_name}</p>
                  <p className="text-neutral-500">{detail.customer.email}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs mb-0.5">Xe</p>
                  <p className="font-medium text-neutral-900">{detail.car.brand} {detail.car.model} {detail.car.year}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs mb-0.5">Loại đơn</p>
                  <p className="font-medium text-neutral-900">{TYPE_MAP[detail.type]}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs mb-0.5">Tổng tiền</p>
                  <p className="font-bold text-accent">{formatPrice(detail.total_amount)}</p>
                </div>
              </div>

              {/* Cập nhật trạng thái — chỉ áp dụng sau khi bấm Lưu */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-2">Trạng thái đơn hàng</p>
                <div className="flex gap-2 flex-wrap">
                  {[detail.status, ...(ORDER_TRANSITIONS[detail.status] || [])].map(s => {
                    const selected = (pendingStatus ?? detail.status) === s
                    return (
                      <button key={s} type="button" onClick={() => setPendingStatus(s)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
                        {STATUS_MAP[s].label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-3">
                  {pendingStatus && pendingStatus !== detail.status ? (
                    <p className="text-xs text-amber-600">Bạn đã chọn trạng thái mới — bấm "Lưu" để áp dụng.</p>
                  ) : <span />}
                  <button
                    onClick={() => pendingStatus && statusMutation.mutate({ id: detailId, status: pendingStatus })}
                    disabled={!pendingStatus || pendingStatus === detail.status || statusMutation.isPending}
                    className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40">
                    {statusMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Lưu'}
                  </button>
                </div>
              </div>

              {/* Hợp đồng */}
              <div className="border-t border-neutral-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-neutral-700 flex items-center gap-1.5"><FileText size={14} /> Hợp đồng</p>
                  {!detail.contract && (
                    <button onClick={() => contractMutation.mutate()} disabled={contractMutation.isPending} className="btn-secondary text-xs py-1.5 px-3">
                      {contractMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Tạo hợp đồng'}
                    </button>
                  )}
                </div>
                {detail.contract ? (
                  <button type="button" onClick={() => void ordersService.openContract(detail.id)} className="text-sm text-primary-600 hover:underline">
                    Xem hợp đồng #{detail.contract.id.slice(0, 8)}
                  </button>
                ) : (
                  <p className="text-sm text-neutral-400">Chưa có hợp đồng</p>
                )}
              </div>

              {/* Lịch sử thanh toán */}
              <div className="border-t border-neutral-100 pt-4">
                <p className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-1.5"><CreditCard size={14} /> Lịch sử thanh toán</p>

                {payments?.payments?.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {payments.payments.map((p: { amount: number | string; method?: string; paid_at: string }, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-neutral-50 rounded-lg px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-neutral-800">{formatPrice(p.amount)}</p>
                          <p className="text-xs text-neutral-400">{p.method || 'Không rõ'} · {new Date(p.paid_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t border-neutral-100">
                      <span className="text-neutral-500">Còn lại</span>
                      <span className="font-bold text-neutral-900">{formatPrice(payments.remaining)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 mb-3">Chưa có thanh toán nào</p>
                )}

                {/* Thêm thanh toán */}
                <div className="flex gap-2">
                  <input type="number" min="1" max={Number(payments?.remaining || detail.total_amount)} placeholder="Số tiền" className="input text-sm flex-1"
                    value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
                  <select className="select text-sm w-32" value={paymentForm.method}
                    onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))}>
                    <option value="cash">Tiền mặt</option>
                    <option value="bank_transfer">Chuyển khoản</option>
                  </select>
                  <button onClick={() => paymentMutation.mutate()} disabled={!paymentForm.amount || paymentMutation.isPending}
                    className="btn-primary text-sm px-4">
                    {paymentMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Thêm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
