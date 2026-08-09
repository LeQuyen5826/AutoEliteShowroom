import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { carsService } from '@/services/cars.service'
import { testDrivesService } from '@/services/orders.service'
import { CalendarCheck, Loader2, CheckCircle, ChevronRight } from 'lucide-react'

export default function TestDrivePage() {
  const { carId } = useParams<{ carId: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState({ scheduled_at: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const { data: car, isLoading } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => carsService.getById(carId!),
    enabled: !!carId,
  })

  // Tối thiểu là ngày mai
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().slice(0, 16)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await testDrivesService.create({
        car_id: carId!,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Đặt lịch thất bại, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 size={32} className="animate-spin text-primary-600" />
    </div>
  )

  if (success) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="card p-10">
        <CheckCircle size={52} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="font-display font-bold text-2xl text-neutral-900 mb-2">Đặt lịch thành công!</h2>
        <p className="text-neutral-500 text-sm mb-6">
          Nhân viên sẽ liên hệ xác nhận lịch lái thử trong vòng 24 giờ.
        </p>
        <div className="flex gap-3">
          <Link to="/cars" className="btn-secondary flex-1">Xem xe khác</Link>
          <Link to="/" className="btn-primary flex-1">Về trang chủ</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link to="/cars" className="hover:text-neutral-700">Xe</Link>
        <ChevronRight size={14} />
        <Link to={`/cars/${carId}`} className="hover:text-neutral-700">{car?.brand} {car?.model}</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900">Đặt lịch lái thử</span>
      </nav>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <CalendarCheck size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-neutral-900">Đặt lịch lái thử</h1>
            {car && <p className="text-sm text-neutral-500">{car.brand} {car.model} {car.year}</p>}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Ngày & giờ lái thử
            </label>
            <input
              type="datetime-local"
              className="input"
              min={minDateStr}
              value={form.scheduled_at}
              onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              required
            />
            <p className="text-xs text-neutral-400 mt-1">Vui lòng chọn ngày ít nhất 1 ngày sau hôm nay</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              className="input resize-none h-24"
              placeholder="Yêu cầu đặc biệt hoặc câu hỏi muốn hỏi nhân viên..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="bg-neutral-50 rounded-xl p-4 text-sm space-y-1.5">
            <p className="font-medium text-neutral-700 mb-2">Lưu ý khi lái thử:</p>
            <p className="text-neutral-500">• Mang theo CMND/CCCD và bằng lái xe</p>
            <p className="text-neutral-500">• Có mặt trước giờ hẹn 10 phút</p>
            <p className="text-neutral-500">• Thời gian lái thử: 30-45 phút</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
              {loading ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
