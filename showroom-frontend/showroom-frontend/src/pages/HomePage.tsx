import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Shield, Headphones, FileText, Zap } from 'lucide-react'
import { carsService } from '@/services/cars.service'
import CarCard from '@/components/cars/CarCard'

const BRANDS = [
  { name: 'Toyota', logo: '🚗' },
  { name: 'Honda', logo: '🚙' },
  { name: 'Mercedes-Benz', logo: '⭐' },
  { name: 'BMW', logo: '🔵' },
  { name: 'VinFast', logo: '🇻🇳' },
  { name: 'Mazda', logo: '🔴' },
]

const FEATURES = [
  { icon: <Shield size={22} />, title: 'Xe chính hãng', desc: 'Toàn bộ xe đều có giấy tờ pháp lý đầy đủ, nguồn gốc rõ ràng.' },
  { icon: <Headphones size={22} />, title: 'Hỗ trợ 24/7', desc: 'Đội ngũ tư vấn luôn sẵn sàng hỗ trợ bạn mọi lúc mọi nơi.' },
  { icon: <FileText size={22} />, title: 'Hợp đồng minh bạch', desc: 'Quy trình mua bán rõ ràng, hợp đồng số hóa tiện lợi.' },
  { icon: <Zap size={22} />, title: 'AI tư vấn thông minh', desc: 'Chatbot AI giúp bạn tìm xe phù hợp theo ngân sách và nhu cầu.' },
]

export default function HomePage() {
  const { data } = useQuery({
    queryKey: ['cars', { limit: 6, status: 'available' }],
    queryFn: () => carsService.getAll({ limit: 6, status: 'available' }),
  })

  const featuredCars = data?.cars ?? []

  return (
    <div>

      {/* ── BANNER ảnh showroom ── */}
      <section className="relative h-[520px] md:h-[620px] overflow-hidden bg-neutral-900">
        {/* Ảnh nền — đặt file vào showroom-frontend/public/bannershowroom.jpg */}
        <img
          src="/bannershowroom.jpg"
          alt="AutoElite Showroom"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Nội dung */}
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 bg-primary-500 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-5 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                Smart Car Showroom
              </span>

              <h1 className="font-display font-extrabold text-4xl md:text-6xl text-white leading-tight mb-4 drop-shadow-lg">
                Tìm chiếc xe<br />
                <span className="text-accent">hoàn hảo</span> của bạn
              </h1>

              <p className="text-white/80 text-lg mb-8 leading-relaxed drop-shadow">
                Hàng trăm mẫu xe chính hãng, tư vấn AI thông minh, quy trình mua bán minh bạch — tất cả trong một nền tảng.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/cars"
                  className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-100">
                  Xem tất cả xe <ArrowRight size={18} />
                </Link>
                <Link to="/cars"
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium px-6 py-3 rounded-xl border border-white/30 backdrop-blur-sm transition-all">
                  Đặt lịch lái thử
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="border-b border-neutral-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-6 overflow-x-auto pb-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider shrink-0">Thương hiệu</p>
            <div className="flex items-center gap-4">
              {BRANDS.map(({ name, logo }) => (
                <Link key={name} to={`/cars?brand=${name}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-100 hover:border-primary-200 hover:bg-primary-50 transition-colors shrink-0">
                  <span className="text-lg">{logo}</span>
                  <span className="text-sm font-medium text-neutral-700">{name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured cars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">Nổi bật</p>
            <h2 className="font-display font-bold text-2xl text-neutral-900">Xe đang có sẵn</h2>
          </div>
          <Link to="/cars" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredCars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">Tại sao chọn chúng tôi</p>
            <h2 className="font-display font-bold text-2xl text-neutral-900">Mua xe dễ dàng, an tâm tuyệt đối</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="card p-6">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                  {icon}
                </div>
                <h3 className="font-display font-semibold text-neutral-900 mb-2">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-white text-center sm:text-left">
            <h3 className="font-display font-bold text-xl mb-1">Chưa tìm được xe ưng ý?</h3>
            <p className="text-primary-200 text-sm">Thử trò chuyện với AI tư vấn — cho bạn gợi ý theo ngân sách và nhu cầu thực tế.</p>
          </div>
          <Link to="/cars" className="btn-secondary shrink-0 bg-white text-primary-700 border-white hover:bg-primary-50">
            Tư vấn ngay <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  )
}