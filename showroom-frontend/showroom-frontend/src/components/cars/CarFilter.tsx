import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { CarFilter } from '@/types'

interface CarFilterProps {
  filter: CarFilter
  onChange: (filter: CarFilter) => void
  onReset: () => void
}

const BRANDS = ['Toyota', 'Honda', 'Mazda', 'Mercedes-Benz', 'BMW', 'Audi', 'VinFast', 'Hyundai', 'Kia', 'Ford']
const FUEL_TYPES = ['Xăng', 'Dầu', 'Điện', 'Hybrid']
const TRANSMISSIONS = ['Tự động', 'Số sàn']

export default function CarFilter({ filter, onChange, onReset }: CarFilterProps) {
  const [showMobile, setShowMobile] = useState(false)

  const update = (key: keyof CarFilter, value: string | number | undefined) => {
    onChange({ ...filter, [key]: value || undefined, page: 1 })
  }

  const hasActiveFilter = Object.entries(filter).some(([k, v]) => k !== 'page' && k !== 'limit' && v !== undefined)

  const FilterContent = () => (
    <div className="space-y-5">
      {/* Tìm kiếm */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Hãng xe</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Tìm hãng xe..."
            className="input pl-8 text-sm"
            value={filter.brand || ''}
            onChange={(e) => update('brand', e.target.value)}
          />
        </div>
      </div>

      {/* Hãng xe nhanh */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Chọn nhanh</label>
        <div className="flex flex-wrap gap-1.5">
          {BRANDS.map((brand) => (
            <button
              key={brand}
              onClick={() => update('brand', filter.brand === brand ? undefined : brand)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                filter.brand === brand
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Nhiên liệu */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Nhiên liệu</label>
        <div className="grid grid-cols-2 gap-1.5">
          {FUEL_TYPES.map((fuel) => (
            <button
              key={fuel}
              onClick={() => update('fuel_type', filter.fuel_type === fuel ? undefined : fuel)}
              className={`px-3 py-2 text-xs rounded-lg border text-center transition-colors ${
                filter.fuel_type === fuel
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'
              }`}
            >
              {fuel}
            </button>
          ))}
        </div>
      </div>

      {/* Hộp số */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Hộp số</label>
        <div className="grid grid-cols-2 gap-1.5">
          {TRANSMISSIONS.map((t) => (
            <button
              key={t}
              onClick={() => update('transmission', filter.transmission === t ? undefined : t)}
              className={`px-3 py-2 text-xs rounded-lg border text-center transition-colors ${
                filter.transmission === t
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Khoảng giá */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Khoảng giá (triệu VNĐ)</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Từ"
            className="input text-sm"
            value={filter.min_price ? filter.min_price / 1_000_000 : ''}
            onChange={(e) => update('min_price', e.target.value ? Number(e.target.value) * 1_000_000 : undefined)}
          />
          <span className="text-neutral-400 shrink-0">—</span>
          <input
            type="number"
            placeholder="Đến"
            className="input text-sm"
            value={filter.max_price ? filter.max_price / 1_000_000 : ''}
            onChange={(e) => update('max_price', e.target.value ? Number(e.target.value) * 1_000_000 : undefined)}
          />
        </div>
      </div>

      {/* Năm sản xuất */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Năm sản xuất</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Từ năm"
            className="input text-sm"
            value={filter.min_year || ''}
            onChange={(e) => update('min_year', e.target.value ? Number(e.target.value) : undefined)}
          />
          <span className="text-neutral-400 shrink-0">—</span>
          <input
            type="number"
            placeholder="Đến năm"
            className="input text-sm"
            value={filter.max_year || ''}
            onChange={(e) => update('max_year', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* Reset */}
      {hasActiveFilter && (
        <button onClick={onReset} className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
          <X size={14} /> Xóa bộ lọc
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="card p-5 sticky top-20">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-neutral-900 text-sm">Bộ lọc</h3>
            {hasActiveFilter && (
              <span className="badge bg-primary-100 text-primary-700">Đang lọc</span>
            )}
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* Mobile filter toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowMobile(true)}
          className="btn-secondary w-full text-sm flex items-center gap-2"
        >
          <SlidersHorizontal size={14} />
          Bộ lọc {hasActiveFilter && <span className="badge bg-primary-100 text-primary-700 ml-1">Đang lọc</span>}
        </button>

        {showMobile && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobile(false)} />
            <div className="relative ml-auto w-80 bg-white h-full overflow-y-auto p-5 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold text-neutral-900">Bộ lọc</h3>
                <button onClick={() => setShowMobile(false)} className="p-1 rounded-lg hover:bg-neutral-100">
                  <X size={18} />
                </button>
              </div>
              <FilterContent />
              <button onClick={() => setShowMobile(false)} className="btn-primary w-full mt-4">Áp dụng</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
