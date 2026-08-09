import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Loader2, Star } from 'lucide-react'
import { reviewsService } from '@/services/reviews.service'

export default function AdminReviews() {
  const qc = useQueryClient()
  const [visibility, setVisibility] = useState<'visible' | 'hidden' | ''>('')
  const [rating, setRating] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['managed-reviews', visibility, rating, page],
    queryFn: () => reviewsService.getAll({ visibility, rating, page, limit: 15 }),
  })
  const toggle = useMutation({
    mutationFn: reviewsService.toggleVisibility,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['managed-reviews'] }),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý đánh giá</h1><p className="text-sm text-neutral-500 mt-1">Kiểm duyệt {data?.pagination.total ?? 0} đánh giá của khách hàng</p></div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input max-w-48" value={visibility} onChange={e => { setVisibility(e.target.value as typeof visibility); setPage(1) }}><option value="">Tất cả trạng thái</option><option value="visible">Đang hiển thị</option><option value="hidden">Đã ẩn</option></select>
        <select className="input max-w-40" value={rating} onChange={e => { setRating(e.target.value ? Number(e.target.value) : ''); setPage(1) }}><option value="">Tất cả số sao</option>{[5,4,3,2,1].map(v => <option key={v} value={v}>{v} sao</option>)}</select>
      </div>
      <div className="space-y-3">
        {isLoading && <div className="card py-12"><Loader2 className="animate-spin mx-auto text-primary-600" /></div>}
        {data?.reviews.map(review => (
          <div key={review.id} className="card p-5 flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2"><span className="font-semibold text-neutral-900">{review.customer?.full_name || 'Khách hàng'}</span><span className="text-xs text-neutral-400">{review.customer?.email}</span><span className={`badge ${review.is_visible === false ? 'bg-neutral-100 text-neutral-500' : 'bg-emerald-50 text-emerald-700'}`}>{review.is_visible === false ? 'Đã ẩn' : 'Đang hiển thị'}</span></div>
              <div className="flex gap-0.5 mb-2">{[1,2,3,4,5].map(v => <Star key={v} size={15} className={v <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />)}</div>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{review.comment || 'Không có nội dung nhận xét.'}</p>
              <p className="text-xs text-neutral-400 mt-3">Xe: {review.car ? `${review.car.brand} ${review.car.model} ${review.car.year}` : '—'} · {new Date(review.created_at).toLocaleString('vi-VN')}</p>
            </div>
            <button disabled={toggle.isPending} onClick={() => toggle.mutate(review.id)} className={review.is_visible === false ? 'btn-primary shrink-0' : 'btn-secondary shrink-0'}>{review.is_visible === false ? <Eye size={15} /> : <EyeOff size={15} />}{review.is_visible === false ? 'Hiện đánh giá' : 'Ẩn đánh giá'}</button>
          </div>
        ))}
        {!isLoading && !data?.reviews.length && <div className="card py-12 text-center text-sm text-neutral-400">Không có đánh giá phù hợp</div>}
      </div>
      {data && data.pagination.totalPages > 1 && <div className="flex justify-end gap-2 mt-4"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button><button className="btn-secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Sau →</button></div>}
    </div>
  )
}
