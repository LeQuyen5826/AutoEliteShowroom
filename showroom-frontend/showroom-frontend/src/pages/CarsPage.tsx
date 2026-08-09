import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Car, Loader2 } from 'lucide-react'
import { carsService } from '@/services/cars.service'
import CarCard from '@/components/cars/CarCard'
import CarFilter from '@/components/cars/CarFilter'
import SmartCarSearch from '@/components/cars/SmartCarSearch'
import type { CarFilter as CarFilterType } from '@/types'

interface CarsPageProps {
  defaultFilter?: CarFilterType
  title?: string
}

export default function CarsPage({ defaultFilter, title }: CarsPageProps) {
  const DEFAULT_FILTER: CarFilterType = { page: 1, limit: 12, ...defaultFilter }
  const [filter, setFilter] = useState<CarFilterType>(DEFAULT_FILTER)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cars', filter],
    queryFn: () => carsService.getAll(filter),
    staleTime: 30_000,
  })

  const cars = data?.cars ?? []
  const pagination = data?.pagination

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-900">{title || 'Tất cả xe'}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {pagination ? `${pagination.total} xe đang có sẵn` : 'Đang tải...'}
        </p>
      </div>

      <SmartCarSearch
        initialQuery={filter.search || ''}
        onTextSearch={search => setFilter(current => ({ ...current, search: search || undefined, page: 1 }))}
      />

      <div className="flex gap-6 items-start">
        <CarFilter filter={filter} onChange={setFilter} onReset={() => setFilter(DEFAULT_FILTER)} />

        <div className="flex-1 min-w-0">
          <div className="lg:hidden mb-4">
            <CarFilter filter={filter} onChange={setFilter} onReset={() => setFilter(DEFAULT_FILTER)} />
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
              <Loader2 size={32} className="animate-spin mb-3" />
              <p className="text-sm">Đang tải danh sách xe...</p>
            </div>
          )}

          {isError && (
            <div className="card p-8 text-center">
              <p className="text-neutral-500 text-sm">Không thể tải dữ liệu. Vui lòng thử lại.</p>
              <button onClick={() => setFilter({ ...filter })} className="btn-primary mt-4 text-sm">Thử lại</button>
            </div>
          )}

          {!isLoading && !isError && cars.length === 0 && (
            <div className="card p-12 text-center">
              <Car size={40} className="mx-auto text-neutral-300 mb-3" />
              <p className="font-medium text-neutral-600">Không tìm thấy xe phù hợp</p>
              <p className="text-sm text-neutral-400 mt-1">Thử thay đổi bộ lọc để xem thêm kết quả</p>
              <button onClick={() => setFilter(DEFAULT_FILTER)} className="btn-secondary mt-4 text-sm">Xóa bộ lọc</button>
            </div>
          )}

          {!isLoading && cars.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {cars.map((car) => (<CarCard key={car.id} car={car} />))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-100">
              <p className="text-sm text-neutral-500">
                Trang <span className="font-medium">{pagination.page}</span> / {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setFilter(f => ({ ...f, page: (f.page || 1) - 1 }))}
                  disabled={pagination.page <= 1} className="btn-secondary px-3 py-2 disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button key={p} onClick={() => setFilter(f => ({ ...f, page: p }))}
                      className={`w-9 h-9 text-sm rounded-xl border transition-colors ${p === pagination.page
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setFilter(f => ({ ...f, page: (f.page || 1) + 1 }))}
                  disabled={pagination.page >= pagination.totalPages} className="btn-secondary px-3 py-2 disabled:opacity-40">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
