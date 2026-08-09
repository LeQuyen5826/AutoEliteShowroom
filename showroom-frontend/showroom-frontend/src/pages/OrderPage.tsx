import { useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { carsService } from '@/services/cars.service'
import { ordersService } from '@/services/orders.service'
import { formatPrice } from '@/utils'
import { ChevronRight, Car, Loader2 } from 'lucide-react'

export default function OrderPage() {
  const { carId } = useParams<{ carId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const type = (searchParams.get('type') || 'purchase') as 'deposit' | 'purchase'

  const [notes, setNotes] = useState('')
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'installment'>('full')
  const [financingPercent, setFinancingPercent] = useState(50)
  const [financingMonths, setFinancingMonths] = useState(36)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: car, isLoading } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => carsService.getById(carId!),
    enabled: !!carId,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!car) return
    setError('')
    setLoading(true)
    try {
      const financingAmount = paymentPlan === 'installment'
        ? Math.round(Number(car.price) * financingPercent / 100)
        : 0
      const order = await ordersService.create({
        car_id: car.id,
        type,
        notes,
        payment_plan: paymentPlan,
        financing_amount: financingAmount,
        financing_months: paymentPlan === 'installment' ? financingMonths : undefined,
      })
      navigate(`/orders/${order.id}/payment`, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Đặt hàng thất bại, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 size={32} className="animate-spin text-primary-600" />
    </div>
  )

  if (!car) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-neutral-500">Không tìm thấy xe.</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link to="/cars" className="hover:text-neutral-700">Xe</Link>
        <ChevronRight size={14} />
        <Link to={`/cars/${car.id}`} className="hover:text-neutral-700">{car.brand} {car.model}</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900">{type === 'deposit' ? 'Đặt cọc' : 'Mua xe'}</span>
      </nav>

      <h1 className="font-display font-bold text-2xl text-neutral-900 mb-6">
        {type === 'deposit' ? 'Đặt cọc xe' : 'Mua xe'}
      </h1>

      <div className="grid gap-6">
        {/* Thông tin xe */}
        <div className="card p-5 flex gap-4">
          <div className="w-20 h-16 bg-neutral-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
            {car.images?.[0]?.url
              ? <img src={car.images[0].url} alt="" className="w-full h-full object-cover" />
              : <Car size={24} className="text-neutral-400" />
            }
          </div>
          <div>
            <p className="text-xs text-primary-600 font-medium mb-0.5">{car.brand}</p>
            <p className="font-display font-semibold text-neutral-900">{car.model} {car.year}</p>
            <p className="text-sm text-neutral-500">{car.fuel_type} · {car.transmission}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-neutral-400">Giá</p>
            <p className="font-display font-bold text-accent">{formatPrice(car.price)}</p>
          </div>
        </div>

        {/* Form */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-neutral-900 mb-5">Xác nhận thông tin</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Loại giao dịch</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'deposit', label: 'Đặt cọc', desc: 'Giữ xe, thanh toán sau' },
                  { value: 'purchase', label: 'Mua xe', desc: 'Thanh toán đầy đủ' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      type === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                    onClick={() => navigate(`/order/${car.id}?type=${opt.value}`)}
                  >
                    <p className="font-medium text-sm text-neutral-900">{opt.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Phương án thanh toán</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'full', label: 'Thanh toán toàn bộ', desc: 'Không dùng hỗ trợ trả góp' },
                  { value: 'installment', label: 'Hỗ trợ trả góp', desc: 'Lưu số tiền và kỳ hạn vay' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentPlan(option.value as 'full' | 'installment')}
                    className={`p-4 text-left rounded-xl border-2 transition-colors ${paymentPlan === option.value ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'}`}
                  >
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {paymentPlan === 'installment' && (
              <div className="rounded-xl bg-neutral-50 p-4 space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label className="font-medium text-neutral-700">Tỷ lệ hỗ trợ dự kiến</label>
                    <span className="font-semibold text-primary-600">{financingPercent}% · {formatPrice(Number(car.price) * financingPercent / 100)}</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    step={10}
                    value={financingPercent}
                    onChange={event => setFinancingPercent(Number(event.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Kỳ hạn</label>
                  <select className="select" value={financingMonths} onChange={event => setFinancingMonths(Number(event.target.value))}>
                    {[12, 24, 36, 48, 60].map(month => <option key={month} value={month}>{month} tháng</option>)}
                  </select>
                </div>
                <p className="text-xs text-neutral-500">Đây là số tiền hỗ trợ dự kiến để lưu hồ sơ. Showroom sẽ thẩm định và xác nhận điều kiện vay sau.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Ghi chú (tuỳ chọn)</label>
              <textarea
                className="input resize-none h-24"
                placeholder="Yêu cầu đặc biệt, màu sắc, phụ kiện..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Tóm tắt */}
            <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Xe</span>
                <span className="font-medium">{car.brand} {car.model} {car.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Loại</span>
                <span className="font-medium">{type === 'deposit' ? 'Đặt cọc' : 'Mua xe'}</span>
              </div>
              {paymentPlan === 'installment' && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Hỗ trợ trả góp</span>
                  <span className="font-medium">{formatPrice(Number(car.price) * financingPercent / 100)} / {financingMonths} tháng</span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-200 pt-2 mt-2">
                <span className="font-semibold">{type === 'deposit' ? 'Cọc dự kiến (10%)' : 'Cần thanh toán'}</span>
                <span className="font-bold text-accent text-base">
                  {formatPrice(
                    (Number(car.price) - (paymentPlan === 'installment' ? Number(car.price) * financingPercent / 100 : 0))
                    * (type === 'deposit' ? 0.1 : 1)
                  )}
                </span>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Đang xử lý...' : 'Tiếp tục đến thanh toán'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
