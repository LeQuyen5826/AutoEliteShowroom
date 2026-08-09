import { Link } from 'react-router-dom'
import { Car, Phone, MapPin, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Car size={18} className="text-white" />
              </div>
              <span className="font-display font-bold text-white text-lg">
                Auto<span className="text-primary-400">Elite</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-500">
              Hệ thống showroom ô tô thông minh — mua xe dễ dàng, tư vấn tận tâm.
            </p>
          </div>

          {/* Xe */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Khám phá xe</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/cars" className="hover:text-white transition-colors">Tất cả xe</Link></li>
              <li><Link to="/cars/new" className="hover:text-white transition-colors">Xe mới</Link></li>
              <li><Link to="/cars/used" className="hover:text-white transition-colors">Xe đã qua sử dụng</Link></li>
            </ul>
          </div>

          {/* Dịch vụ — dẫn đến các mục trong trang dịch vụ */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Dịch vụ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services#lai-thu" className="hover:text-white transition-colors">Đặt lịch lái thử</Link></li>
              <li><Link to="/services#tai-chinh" className="hover:text-white transition-colors">Hỗ trợ tài chính</Link></li>
              <li><Link to="/services#bao-duong" className="hover:text-white transition-colors">Bảo hành & bảo dưỡng</Link></li>
              <li><Link to="/services#tu-van" className="hover:text-white transition-colors">Tư vấn 24/7</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Hỗ trợ khách hàng</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Liên hệ</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 text-primary-400 shrink-0" />
                <span>123 Phố Huế, Hai Bà Trưng, Hà Nội</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-primary-400" />
                <a href="tel:02412345678" className="hover:text-white">024-1234-5678</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-primary-400" />
                <a href="mailto:hello@autoelite.vn" className="hover:text-white">hello@autoelite.vn</a>
              </li>
            </ul>
            <Link to="/contact" className="inline-block mt-4 text-xs text-primary-400 hover:text-primary-300 hover:underline">
              Xem tất cả chi nhánh →
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-800 text-xs text-neutral-600 flex flex-col sm:flex-row justify-between gap-2">
          <span>© 2026 AutoElite Showroom. All rights reserved.</span>
          <span>Đồ án chuyên ngành — Hệ thống quản lý showroom thông minh</span>
        </div>
      </div>
    </footer>
  )
}
