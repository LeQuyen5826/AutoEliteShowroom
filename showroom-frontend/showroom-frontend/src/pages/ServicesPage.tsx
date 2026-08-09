import { Link } from 'react-router-dom'
import {
  Car, CalendarCheck, Shield, Wrench, FileText,
  CreditCard, Headphones, Star, ChevronRight
} from 'lucide-react'

const SERVICES = [
  {
    id: 'mua-xe',
    icon: <Car size={28} />,
    color: 'bg-blue-50 text-blue-600',
    title: 'Mua xe mới',
    desc: 'Chúng tôi cung cấp hàng trăm mẫu xe mới từ các thương hiệu uy tín. Đội ngũ tư vấn tận tâm hỗ trợ bạn chọn xe phù hợp với nhu cầu và ngân sách.',
    features: ['Xe chính hãng, đầy đủ giấy tờ', 'Tư vấn chọn xe miễn phí', 'Hỗ trợ thủ tục đăng ký xe', 'Giao xe tận nơi'],
  },
  {
    id: 'xe-cu',
    icon: <Star size={28} />,
    color: 'bg-amber-50 text-amber-600',
    title: 'Xe đã qua sử dụng',
    desc: 'Xe đã qua sử dụng được kiểm định kỹ lưỡng, nguồn gốc rõ ràng, giá cả hợp lý. Cam kết chất lượng và bảo hành sau mua.',
    features: ['Kiểm định 150 hạng mục', 'Bảo hành 6-12 tháng', 'Lịch sử xe minh bạch', 'Hỗ trợ vay vốn ngân hàng'],
  },
  {
    id: 'lai-thu',
    icon: <CalendarCheck size={28} />,
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Đặt lịch lái thử',
    desc: 'Trải nghiệm xe thực tế trước khi quyết định mua. Đội ngũ hướng dẫn viên chuyên nghiệp đồng hành cùng bạn.',
    features: ['Đặt lịch online 24/7', 'Lái thử miễn phí', 'Thời gian lái thử 30-45 phút', 'Hướng dẫn viên chuyên nghiệp'],
    link: '/cars',
  },
  {
    id: 'bao-hanh',
    icon: <Shield size={28} />,
    color: 'bg-violet-50 text-violet-600',
    title: 'Bảo hành & Bảo hiểm',
    desc: 'Dịch vụ bảo hành chính hãng và tư vấn các gói bảo hiểm xe toàn diện, bảo vệ tài sản của bạn trong mọi tình huống.',
    features: ['Bảo hành chính hãng', 'Bảo hiểm thân vỏ, dân sự', 'Hỗ trợ bồi thường 24/7', 'Đại lý bảo hiểm uy tín'],
  },
  {
    id: 'bao-duong',
    icon: <Wrench size={28} />,
    color: 'bg-rose-50 text-rose-600',
    title: 'Bảo dưỡng & Sửa chữa',
    desc: 'Trung tâm bảo dưỡng hiện đại với đội ngũ kỹ thuật viên được đào tạo chính hãng. Sử dụng phụ tùng chính hãng 100%.',
    features: ['Kỹ thuật viên được chứng nhận', 'Phụ tùng chính hãng', 'Báo giá minh bạch', 'Trả xe đúng hẹn'],
  },
  {
    id: 'tai-chinh',
    icon: <CreditCard size={28} />,
    color: 'bg-teal-50 text-teal-600',
    title: 'Hỗ trợ tài chính',
    desc: 'Kết nối với các ngân hàng và tổ chức tài chính uy tín, giúp bạn sở hữu xe nhanh chóng với lãi suất ưu đãi.',
    features: ['Lãi suất từ 6.5%/năm', 'Trả góp đến 84 tháng', 'Thủ tục nhanh trong 24h', 'Hỗ trợ trả trước từ 20%'],
  },
  {
    id: 'hop-dong',
    icon: <FileText size={28} />,
    color: 'bg-indigo-50 text-indigo-600',
    title: 'Hợp đồng điện tử',
    desc: 'Quy trình mua bán được số hóa hoàn toàn. Hợp đồng minh bạch, ký kết nhanh chóng, lưu trữ an toàn trên hệ thống.',
    features: ['Ký hợp đồng online', 'Lưu trữ đám mây an toàn', 'Tra cứu mọi lúc mọi nơi', 'Pháp lý đầy đủ'],
  },
  {
    id: 'tu-van',
    icon: <Headphones size={28} />,
    color: 'bg-orange-50 text-orange-600',
    title: 'Tư vấn 24/7',
    desc: 'Đội ngũ tư vấn viên luôn sẵn sàng hỗ trợ bạn qua điện thoại, chat hoặc đặt lịch gặp trực tiếp tại showroom.',
    features: ['Hotline 24/7', 'Chat trực tuyến', 'Tư vấn tại showroom', 'AI chatbot thông minh'],
  },
]

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-300 text-sm font-medium tracking-widest uppercase mb-3">Dịch vụ của chúng tôi</p>
          <h1 className="font-display font-bold text-4xl mb-4">Trọn gói dịch vụ xe hơi</h1>
          <p className="text-primary-200 text-lg max-w-2xl mx-auto">
            Từ mua xe đến bảo dưỡng, chúng tôi đồng hành cùng bạn trong suốt hành trình sở hữu xe.
          </p>
        </div>
      </div>

      {/* Services grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {SERVICES.map((s) => (
            <div key={s.id} id={s.id} className="card p-6 flex gap-5 scroll-mt-24">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${s.color}`}>
                {s.icon}
              </div>
              <div className="flex-1">
                <h2 className="font-display font-bold text-lg text-neutral-900 mb-2">{s.title}</h2>
                <p className="text-sm text-neutral-500 leading-relaxed mb-4">{s.desc}</p>
                <ul className="space-y-1.5 mb-4">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {s.link && (
                  <Link to={s.link} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
                    Tìm hiểu thêm <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-neutral-50 border-t border-neutral-100 py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h3 className="font-display font-bold text-2xl text-neutral-900 mb-3">Bạn cần tư vấn thêm?</h3>
          <p className="text-neutral-500 mb-6">Liên hệ với chúng tôi để được hỗ trợ tốt nhất.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/contact" className="btn-primary">Liên hệ ngay</Link>
            <Link to="/cars" className="btn-secondary">Xem xe ngay</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
