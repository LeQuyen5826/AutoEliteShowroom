import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Fuel, Settings, MapPin, Calendar, Gauge,
  Star, Phone, CalendarCheck, ShoppingCart, Loader2, ChevronRight
} from 'lucide-react'
import { carsService } from '@/services/cars.service'
import { reviewsService } from '@/services/reviews.service'
import { useAuthStore } from '@/store/auth.store'
import { formatPrice, formatNumber, carStatusLabel, carConditionLabel } from '@/utils'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=640&q=80'

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const [activeImage, setActiveImage] = useState(0)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewError, setReviewError] = useState('')

  const { data: car, isLoading, isError } = useQuery({
    queryKey: ['car', id],
    queryFn: () => carsService.getById(id!),
    enabled: !!id,
  })

  const reviewMutation = useMutation({
    mutationFn: () => reviewsService.create(id!, { rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      setComment('')
      setRating(5)
      setReviewError('')
      setReviewMessage('Cảm ơn bạn! Đánh giá đã được gửi thành công.')
      queryClient.invalidateQueries({ queryKey: ['car', id] })
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } }
      setReviewMessage('')
      setReviewError(apiError.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 size={32} className="animate-spin text-primary-600" />
    </div>
  )

  if (isError || !car) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <p className="text-neutral-500">Không tìm thấy xe. <Link to="/cars" className="text-primary-600">Quay lại</Link></p>
    </div>
  )

  const images = car.images?.length ? car.images : [{ url: PLACEHOLDER, is_primary: true, id: '0', car_id: car.id }]
  const status = carStatusLabel[car.status]
  const condition = carConditionLabel[car.condition] || carConditionLabel.new_car
  const avgRating = car.reviews?.length
    ? car.reviews.reduce((s, r) => s + r.rating, 0) / car.reviews.length
    : null

  const specs = car.specs as Record<string, string> | undefined

  const handleOrder = (type: 'deposit' | 'purchase') => {
    if (!isAuthenticated) {
      navigate('/login', { state: { redirect: `/cars/${car.id}` } })
      return
    }
    navigate(`/order/${car.id}?type=${type}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
        <Link to="/" className="hover:text-neutral-700">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link to="/cars" className="hover:text-neutral-700">Xe</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-medium">{car.brand} {car.model}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Images + Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Image gallery */}
          <div className="card overflow-hidden">
            <div className="relative h-72 sm:h-96 bg-neutral-100">
              <img
                src={images[activeImage]?.url || PLACEHOLDER}
                alt={`${car.brand} ${car.model}`}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
              />
              <span className={`badge absolute top-4 left-4 ${status.color}`}>{status.label}</span>
              <span className={`badge absolute top-4 right-4 ${condition.color}`}>{condition.label}</span>
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === activeImage ? 'border-primary-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title + rating */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary-600 mb-1">{car.brand}</p>
                <h1 className="font-display font-bold text-2xl text-neutral-900">
                  {car.model} {car.year}
                </h1>
              </div>
              {avgRating && (
                <div className="flex items-center gap-1 shrink-0">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                  <span className="font-medium text-sm">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-neutral-400">({car.reviews?.length})</span>
                </div>
              )}
            </div>

            {/* Key specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { icon: <Fuel size={16} />, label: 'Nhiên liệu', value: car.fuel_type },
                { icon: <Settings size={16} />, label: 'Hộp số', value: car.transmission },
                { icon: <Calendar size={16} />, label: 'Năm SX', value: String(car.year) },
                { icon: <Gauge size={16} />, label: 'Số km', value: car.mileage ? `${formatNumber(car.mileage)} km` : 'Xe mới' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-neutral-50 rounded-xl p-3">
                  <div className="text-primary-500 mb-1">{icon}</div>
                  <p className="text-xs text-neutral-400">{label}</p>
                  <p className="text-sm font-medium text-neutral-800">{value}</p>
                </div>
              ))}
            </div>

            {car.branch && (
              <div className="flex items-center gap-2 mt-4 text-sm text-neutral-500">
                <MapPin size={14} className="text-primary-500" />
                {car.branch.name} {car.branch.address && `— ${car.branch.address}`}
              </div>
            )}
          </div>

          {/* Description */}
          {car.description && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-neutral-900 mb-3">Mô tả xe</h2>
              <p className="text-sm text-neutral-600 leading-relaxed">{car.description}</p>
            </div>
          )}

          {/* Tech specs */}
          {specs && Object.keys(specs).length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold text-neutral-900 mb-4">Thông số kỹ thuật</h2>
              <div className="divide-y divide-neutral-100">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2.5 text-sm">
                    <span className="text-neutral-500 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-neutral-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-neutral-900 mb-4">
              Đánh giá khách hàng ({car.reviews?.length ?? 0})
            </h2>

            {user?.role === 'customer' ? (
              <form onSubmit={event => { event.preventDefault(); setReviewError(''); setReviewMessage(''); reviewMutation.mutate() }} className="bg-neutral-50 rounded-2xl p-4 mb-6">
                <p className="text-sm font-medium text-neutral-800 mb-1">Chia sẻ trải nghiệm của bạn</p>
                <p className="text-xs text-neutral-500 mb-3">Chỉ khách hàng đã hoàn tất mua chiếc xe này mới có thể gửi đánh giá.</p>
                <div className="flex items-center gap-1 mb-3" aria-label="Chọn số sao">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button key={value} type="button" onClick={() => setRating(value)} className="p-1" aria-label={`${value} sao`}>
                      <Star size={24} className={value <= rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-300'} />
                    </button>
                  ))}
                </div>
                <textarea className="input w-full min-h-24 resize-y" maxLength={1000} value={comment} onChange={event => setComment(event.target.value)} placeholder="Nhận xét về xe và trải nghiệm mua hàng..." />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                  <div>{reviewMessage && <p className="text-sm text-emerald-600">{reviewMessage}</p>}{reviewError && <p className="text-sm text-red-600">{reviewError}</p>}</div>
                  <button type="submit" disabled={reviewMutation.isPending} className="btn-primary shrink-0 disabled:opacity-60">
                    {reviewMutation.isPending && <Loader2 size={15} className="animate-spin" />} Gửi đánh giá
                  </button>
                </div>
              </form>
            ) : !isAuthenticated ? (
              <p className="text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 mb-5">Vui lòng <Link to="/login" className="text-primary-600 font-medium">đăng nhập</Link> để gửi đánh giá.</p>
            ) : null}

            {car.reviews && car.reviews.length > 0 ? (
              <div className="space-y-4">
                {car.reviews.map((review) => (
                  <div key={review.id} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-800">
                        {review.customer?.full_name || 'Khách hàng'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-neutral-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-neutral-400 py-4 text-center">Chưa có đánh giá nào cho xe này.</p>}
          </div>
        </div>

        {/* Right: Sticky CTA */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-20 space-y-4">
            <div>
              <p className="text-xs text-neutral-400 mb-1">Giá bán</p>
              <p className="font-display font-bold text-2xl text-accent">{formatPrice(car.price)}</p>
            </div>

            {car.status === 'available' ? (
              <>
                <button
                  onClick={() => handleOrder('purchase')}
                  className="btn-primary w-full"
                >
                  <ShoppingCart size={16} /> Mua xe ngay
                </button>
                <button
                  onClick={() => handleOrder('deposit')}
                  className="btn-secondary w-full"
                >
                  Đặt cọc xe
                </button>
                <Link
                  to={isAuthenticated ? `/test-drive/${car.id}` : `/login?redirect=/cars/${car.id}`}
                  className="btn-ghost w-full justify-center border border-neutral-200 rounded-xl"
                >
                  <CalendarCheck size={16} /> Đặt lịch lái thử
                </Link>
              </>
            ) : (
              <div className={`badge w-full justify-center py-3 text-sm ${status.color}`}>
                {status.label}
              </div>
            )}

            <div className="pt-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-2">Cần tư vấn thêm?</p>
              <a href="tel:02412345678" className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline">
                <Phone size={14} /> 024-1234-5678
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="mt-8">
        <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> Quay lại danh sách xe
        </button>
      </div>
    </div>
  )
}
