import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ordersService } from '@/services/orders.service'
import { formatPrice } from '@/utils'
import { ShoppingBag, Loader2, ChevronRight } from 'lucide-react'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Chờ xác nhận', color: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Đã xác nhận',  color: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Hoàn tất',     color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Đã hủy',       color: 'bg-neutral-100 text-neutral-500' },
}

const TYPE_MAP: Record<string, string> = {
  deposit:  'Đặt cọc',
  purchase: 'Mua xe',
}

export default function MyOrdersPage() {
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', status],
    queryFn: () => ordersService.getAll({ status: status || undefined }),
  })

  const orders = data?.orders ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-900">Đơn hàng của tôi</h1>
        <p className="text-sm text-neutral-500 mt-1">{data?.pagination?.total ?? 0} đơn hàng</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { value: '', label: 'Tất cả' },
          { value: 'pending', label: 'Chờ xác nhận' },
          { value: 'confirmed', label: 'Đã xác nhận' },
          { value: 'completed', label: 'Hoàn tất' },
          { value: 'cancelled', label: 'Đã hủy' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`px-4 py-2 text-sm rounded-xl border whitespace-nowrap transition-colors ${
              status === opt.value
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-neutral-300 mb-3" />
          <p className="font-medium text-neutral-600">Chưa có đơn hàng nào</p>
          <Link to="/cars" className="btn-primary mt-4 inline-flex">Xem xe ngay</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: {
            id: string
            type: string
            status: string
            total_amount: number | string
            created_at: string
            car?: { brand: string; model: string; year: number; images?: { url: string; is_primary: boolean }[] }
            payments?: { amount: number }[]
          }) => {
            const statusInfo = STATUS_MAP[order.status]
            const totalPaid = (order.payments || []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="card p-5 flex gap-4 hover:shadow-card-hover transition-shadow"
              >
                {/* Car image */}
                <div className="w-20 h-16 bg-neutral-100 rounded-xl overflow-hidden shrink-0">
                  {order.car?.images?.[0]?.url
                    ? <img src={order.car.images[0].url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">Xe</div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-neutral-900 text-sm">
                        {order.car?.brand} {order.car?.model} {order.car?.year}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {TYPE_MAP[order.type]} · {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span className={`badge ${statusInfo.color} shrink-0`}>{statusInfo.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-xs text-neutral-400">Tổng tiền</p>
                      <p className="font-bold text-accent text-sm">{formatPrice(order.total_amount)}</p>
                    </div>
                    {totalPaid > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-neutral-400">Đã thanh toán</p>
                        <p className="text-sm font-medium text-emerald-600">{formatPrice(totalPaid)}</p>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-neutral-400" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
