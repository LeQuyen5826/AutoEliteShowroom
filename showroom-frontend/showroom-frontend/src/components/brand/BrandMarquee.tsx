import { Link } from 'react-router-dom'

type Brand = {
  name: string
  country: string
  flag: string
  slug: string
  color: string
  fallback: string
  logoUrl?: string
}

const BRANDS: Brand[] = [
  { name: 'Toyota', country: 'Nhật Bản', flag: '🇯🇵', slug: 'toyota', color: 'EB0A1E', fallback: 'T' },
  { name: 'Honda', country: 'Nhật Bản', flag: '🇯🇵', slug: 'honda', color: 'E40521', fallback: 'H' },
  {
    name: 'Mercedes-Benz', country: 'Đức', flag: '🇩🇪', slug: 'mercedes', color: '111827', fallback: 'MB',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Logo.svg',
  },
  { name: 'BMW', country: 'Đức', flag: '🇩🇪', slug: 'bmw', color: '0066B1', fallback: 'B' },
  {
    name: 'VinFast', country: 'Việt Nam', flag: '🇻🇳', slug: 'vinfast', color: '1464F4', fallback: 'VF',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/43/VinFast_logo_%28simple_variant%29.svg',
  },
  { name: 'Mazda', country: 'Nhật Bản', flag: '🇯🇵', slug: 'mazda', color: '101010', fallback: 'M' },
  { name: 'Audi', country: 'Đức', flag: '🇩🇪', slug: 'audi', color: 'BB0A30', fallback: 'A' },
  { name: 'Hyundai', country: 'Hàn Quốc', flag: '🇰🇷', slug: 'hyundai', color: '002C5F', fallback: 'H' },
  { name: 'Kia', country: 'Hàn Quốc', flag: '🇰🇷', slug: 'kia', color: '05141F', fallback: 'K' },
  { name: 'Ford', country: 'Hoa Kỳ', flag: '🇺🇸', slug: 'ford', color: '003478', fallback: 'F' },
]

function BrandGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="brand-marquee__group" aria-hidden={duplicate || undefined}>
      {BRANDS.map((brand) => (
        <Link
          key={`${duplicate ? 'duplicate-' : ''}${brand.name}`}
          to={`/cars?brand=${encodeURIComponent(brand.name)}`}
          tabIndex={duplicate ? -1 : undefined}
          className="group flex min-w-[190px] items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-50 ring-1 ring-neutral-100">
            <span className="text-xs font-extrabold text-neutral-300">{brand.fallback}</span>
            <img
              src={brand.logoUrl ?? `https://cdn.simpleicons.org/${brand.slug}/${brand.color}`}
              alt={`Logo ${brand.name}`}
              loading="lazy"
              className="absolute inset-2 h-7 w-7 object-contain transition-transform duration-200 group-hover:scale-110"
              onError={(event) => { event.currentTarget.style.display = 'none' }}
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-neutral-900">{brand.name}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
              <span aria-hidden="true">{brand.flag}</span>
              {brand.country}
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}

export default function BrandMarquee() {
  return (
    <section className="border-b border-neutral-100 bg-white py-7" aria-labelledby="brand-marquee-title">
      <div className="mx-auto mb-4 flex max-w-7xl items-end justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Thương hiệu toàn cầu</p>
          <h2 id="brand-marquee-title" className="mt-1 font-display text-xl font-bold text-neutral-900">
            Khám phá xe theo hãng và quốc gia
          </h2>
        </div>
        <span className="hidden text-xs text-neutral-400 sm:block">Di chuột để tạm dừng</span>
      </div>

      <div className="brand-marquee" role="region" aria-label="Danh sách hãng xe chuyển động">
        <div className="brand-marquee__track">
          <BrandGroup />
          <BrandGroup duplicate />
        </div>
      </div>
    </section>
  )
}
