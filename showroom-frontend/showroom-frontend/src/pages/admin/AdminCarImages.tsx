import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { carsService } from '@/services/cars.service'
import { Loader2, Star, Trash2, ImagePlus, Car as CarIcon, Upload } from 'lucide-react'

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message || (err instanceof Error ? err.message : 'Có lỗi xảy ra')
}

export default function AdminCarImages() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [carId, setCarId] = useState(searchParams.get('carId') || '')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [isPrimary, setIsPrimary] = useState(false)
  const [error, setError] = useState('')

  const { data: carsData, isLoading: loadingCars, error: carsError } = useQuery({
    queryKey: ['cars-for-images'],
    // Backend validates `limit` with a maximum value of 50.
    queryFn: () => carsService.getAll({ limit: 50 }),
  })

  const { data: car, isLoading: loadingCar } = useQuery({
    queryKey: ['car-detail-images', carId],
    queryFn: () => carsService.getById(carId),
    enabled: !!carId,
  })

  useEffect(() => {
    if (carId) setSearchParams({ carId })
    else setSearchParams({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId])

  const addMutation = useMutation({
    mutationFn: () => carsService.addImage(carId, imageUrl.trim(), isPrimary),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['car-detail-images', carId] })
      qc.invalidateQueries({ queryKey: ['cars-admin'] })
      setImageUrl('')
      setIsPrimary(false)
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Vui lòng chọn ảnh từ máy')
      return carsService.uploadImage(carId, selectedFile, isPrimary)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['car-detail-images', carId] })
      qc.invalidateQueries({ queryKey: ['cars-admin'] })
      setSelectedFile(null)
      setFileInputKey(key => key + 1)
      setIsPrimary(false)
      setError('')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const chooseFile = (file?: File) => {
    setError('')
    if (!file) {
      setSelectedFile(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh gốc không được lớn hơn 10 MB')
      return
    }
    setSelectedFile(file)
  }

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => carsService.removeImage(carId, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['car-detail-images', carId] })
      qc.invalidateQueries({ queryKey: ['cars-admin'] })
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const primaryMutation = useMutation({
    mutationFn: (imageId: string) => carsService.setPrimaryImage(carId, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['car-detail-images', carId] })
      qc.invalidateQueries({ queryKey: ['cars-admin'] })
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const cars = carsData?.cars ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý ảnh xe</h1>
        <p className="text-sm text-neutral-500 mt-1">Thêm, xóa và chọn ảnh đại diện cho từng xe</p>
      </div>

      {/* Chọn xe */}
      <div className="card p-5 mb-6">
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Chọn xe *</label>
        <select className="select" value={carId} onChange={e => setCarId(e.target.value)} disabled={loadingCars}>
          <option value="">-- Chọn xe cần thêm ảnh --</option>
          {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} {c.year} — {c.branch?.name || ''}</option>)}
        </select>
        {carsError && (
          <p className="mt-2 text-sm text-red-600">
            Không tải được danh sách xe: {getErrorMessage(carsError)}
          </p>
        )}
        {!loadingCars && !carsError && cars.length === 0 && (
          <p className="mt-2 text-sm text-amber-600">
            Chưa có xe trong cơ sở dữ liệu. Hãy thêm xe hoặc chạy dữ liệu mẫu trước.
          </p>
        )}
      </div>

      {!carId ? (
        <div className="card p-12 text-center">
          <CarIcon size={40} className="mx-auto text-neutral-300 mb-3" />
          <p className="text-neutral-400 text-sm">Chọn một xe ở trên để bắt đầu quản lý ảnh</p>
        </div>
      ) : loadingCar ? (
        <div className="card p-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-neutral-400" /></div>
      ) : car ? (
        <>
          {/* Form thêm ảnh */}
          <div className="card p-5 mb-6">
            <p className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-1.5"><ImagePlus size={16} /> Thêm ảnh mới</p>
            {error && <div className="px-4 py-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}

            <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="btn-secondary cursor-pointer inline-flex items-center justify-center gap-2 shrink-0">
                  <Upload size={16} /> Chọn ảnh từ máy
                  <input
                    key={fileInputKey}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={event => chooseFile(event.target.files?.[0])}
                  />
                </label>
                <div className="min-w-0 flex-1 text-sm">
                  {selectedFile ? (
                    <>
                      <p className="font-medium text-neutral-800 truncate">{selectedFile.name}</p>
                      <p className="text-neutral-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <p className="text-neutral-500">JPG, PNG hoặc WebP, hệ thống sẽ tự động nén ảnh</p>
                  )}
                </div>
                <button
                  onClick={() => selectedFile && uploadMutation.mutate()}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="btn-primary shrink-0"
                >
                  {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Tải ảnh lên'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-600 mt-3">
              <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
              Đặt làm ảnh đại diện
            </label>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-neutral-200 flex-1" />
              <span className="text-xs text-neutral-400">hoặc thêm bằng URL</span>
              <div className="h-px bg-neutral-200 flex-1" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input className="input flex-1" placeholder="Dán URL ảnh (vd: https://...jpg)"
                value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              <button onClick={() => imageUrl.trim() && addMutation.mutate()} disabled={!imageUrl.trim() || addMutation.isPending}
                className="btn-primary shrink-0">
                {addMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Thêm ảnh'}
              </button>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Có thể chọn ảnh từ máy hoặc giữ cách thêm bằng URL. Ảnh từ máy sẽ được nén trước khi lưu.
            </p>
          </div>

          {/* Danh sách ảnh hiện có */}
          <div className="card p-5">
            <p className="text-sm font-medium text-neutral-700 mb-3">
              Ảnh hiện có ({car.images?.length ?? 0}) — {car.brand} {car.model} {car.year}
            </p>
            {!car.images || car.images.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">Chưa có ảnh nào cho xe này</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {car.images.map(img => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-neutral-100">
                    <img src={img.url} alt="" className="w-full h-32 object-cover" />
                    {img.is_primary && (
                      <span className="absolute top-2 left-2 badge bg-primary-600 text-white flex items-center gap-1 text-[10px]">
                        <Star size={10} fill="currentColor" /> Đại diện
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!img.is_primary && (
                        <button onClick={() => primaryMutation.mutate(img.id)} title="Đặt làm ảnh đại diện"
                          className="p-2 bg-white rounded-full hover:bg-primary-50 text-primary-600">
                          <Star size={14} />
                        </button>
                      )}
                      <button onClick={() => { if (confirm('Xóa ảnh này?')) deleteMutation.mutate(img.id) }} title="Xóa ảnh"
                        className="p-2 bg-white rounded-full hover:bg-red-50 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
