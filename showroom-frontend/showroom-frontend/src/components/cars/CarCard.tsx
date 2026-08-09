import { Link } from 'react-router-dom'
import { Fuel, Settings, MapPin, ArrowRight } from 'lucide-react'
import type { Car } from '@/types'
import { formatPrice, carStatusLabel } from '@/utils'

interface CarCardProps {
  car: Car
}

const PLACEHOLDER = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=640&q=80'

export default function CarCard({ car }: CarCardProps) {
  const primaryImage = car.images?.find(img => img.is_primary)?.url || car.images?.[0]?.url || PLACEHOLDER
  const status = carStatusLabel[car.status]

  return (
    <Link
      to={`/cars/${car.id}`}
      className="card group flex flex-col overflow-hidden hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-48 bg-neutral-100">
        <img
          src={primaryImage}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER }}
        />
        <span className={`badge absolute top-3 left-3 ${status.color}`}>
          {status.label}
        </span>
        {car.year >= 2024 && (
          <span className="badge absolute top-3 right-3 bg-primary-600 text-white">Mới</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-1">
          <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">{car.brand}</p>
          <h3 className="font-display font-semibold text-neutral-900 text-base leading-tight">
            {car.model} {car.year}
          </h3>
        </div>

        {/* Specs row */}
        <div className="flex items-center gap-3 mt-2 mb-3">
          <span className="flex items-center gap-1 text-xs text-neutral-500">
            <Fuel size={12} /> {car.fuel_type}
          </span>
          <span className="text-neutral-200">|</span>
          <span className="flex items-center gap-1 text-xs text-neutral-500">
            <Settings size={12} /> {car.transmission}
          </span>
          {car.branch && (
            <>
              <span className="text-neutral-200">|</span>
              <span className="flex items-center gap-1 text-xs text-neutral-500 truncate">
                <MapPin size={12} /> {car.branch.name}
              </span>
            </>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-neutral-100">
          <div>
            <p className="text-xs text-neutral-400">Giá bán</p>
            <p className="font-display font-bold text-accent text-base">
              {formatPrice(car.price)}
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-primary-600 group-hover:gap-2 transition-all">
            Xem chi tiết <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  )
}
