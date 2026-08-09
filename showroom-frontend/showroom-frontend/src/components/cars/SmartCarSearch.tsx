import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Loader2, Search, Sparkles, X } from 'lucide-react'
import { carsService } from '@/services/cars.service'
import { formatPrice } from '@/utils'
import type { Car } from '@/types'

type ImageMatch = { car_id: string; confidence: number; reason: string; car: Car }

export default function SmartCarSearch({
  initialQuery = '',
  onTextSearch,
}: {
  initialQuery?: string
  onTextSearch: (query: string) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [preview, setPreview] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [matches, setMatches] = useState<ImageMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function handleImage(file?: File) {
    if (!file) return
    setError('')
    setAnalysis('')
    setMatches([])
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Ảnh phải nhỏ hơn 4 MB.')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const result = await carsService.searchByImage(file)
      setAnalysis(result.analysis)
      setMatches(result.matches)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Không thể phân tích ảnh. Vui lòng thử lại.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function clearImageSearch() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview('')
    setAnalysis('')
    setMatches([])
    setError('')
  }

  return (
    <section className="card p-5 mb-6 border border-primary-100 bg-gradient-to-br from-white to-primary-50/50">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-primary-600" />
        <h2 className="font-display font-semibold text-neutral-900">Tìm xe thông minh</h2>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={event => { event.preventDefault(); onTextSearch(query.trim()) }}
      >
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-10"
            value={query}
            maxLength={300}
            onChange={event => setQuery(event.target.value)}
            placeholder="Ví dụ: xe xăng số sàn dưới 800 triệu, SUV 7 chỗ..."
          />
        </div>
        <button type="submit" className="btn-primary">Tìm bằng AI</button>
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          Chụp/tải ảnh
        </button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={event => handleImage(event.target.files?.[0])}
        />
      </form>
      <p className="text-xs text-neutral-500 mt-2">
        Tìm theo mô tả, thông số hoặc tải ảnh xe để AI đối chiếu với kho showroom.
      </p>

      {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">{error}</div>}

      {(preview || loading || analysis) && (
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <div className="flex items-start gap-4">
            {preview && <img src={preview} alt="Ảnh khách gửi" className="w-28 h-24 rounded-xl object-cover border border-neutral-200" />}
            <div className="flex-1">
              <div className="flex justify-between gap-3">
                <p className="text-sm font-medium text-neutral-900">Kết quả nhận diện</p>
                <button type="button" onClick={clearImageSearch} className="text-neutral-400 hover:text-neutral-700"><X size={16} /></button>
              </div>
              {loading
                ? <p className="text-sm text-neutral-500 mt-2 flex items-center gap-2"><Loader2 size={15} className="animate-spin" />AI đang phân tích và đối chiếu...</p>
                : <p className="text-sm text-neutral-600 mt-2">{analysis}</p>
              }
            </div>
          </div>

          {!loading && matches.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {matches.map(match => (
                <Link key={match.car_id} to={`/cars/${match.car_id}`} className="rounded-xl border border-neutral-200 bg-white p-3 hover:border-primary-300 transition-colors">
                  <div className="flex gap-3">
                    <div className="w-20 h-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                      {match.car.images?.[0]?.url && <img src={match.car.images[0].url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{match.car.brand} {match.car.model}</p>
                      <p className="text-xs text-accent font-semibold">{formatPrice(match.car.price)}</p>
                      <p className="text-xs text-primary-600 mt-1">Khớp {Math.round(match.confidence)}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{match.reason}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
