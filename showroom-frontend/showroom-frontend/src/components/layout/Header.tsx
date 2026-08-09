import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Car, Menu, X, User, LogOut, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/utils'
import { authService } from '@/services/auth.service'

const CAR_MENU = [
  { label: 'Tất cả xe', to: '/cars', desc: 'Xem toàn bộ danh sách xe' },
  { label: 'Xe mới', to: '/cars/new', desc: 'Xe mới nhập từ 2023 trở lên' },
  { label: 'Xe đã qua sử dụng', to: '/cars/used', desc: 'Xe cũ đã qua kiểm định' },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [carDropdown, setCarDropdown] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const carRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (carRef.current && !carRef.current.contains(e.target as Node)) setCarDropdown(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    try { await authService.logout() } finally { logout(); navigate('/') }
  }
  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Car className="text-white" size={18} />
            </div>
            <span className="font-display font-bold text-neutral-900 text-lg tracking-tight">
              Auto<span className="text-primary-600">Elite</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive('/') ? 'text-primary-600 bg-primary-50' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50')}>
              Trang chủ
            </Link>

            {/* Xe dropdown */}
            <div ref={carRef} className="relative">
              <button
                onClick={() => setCarDropdown(!carDropdown)}
                className={cn('flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  location.pathname.startsWith('/cars') ? 'text-primary-600 bg-primary-50' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50')}
              >
                Xe <ChevronDown size={14} className={cn('transition-transform', carDropdown && 'rotate-180')} />
              </button>

              {carDropdown && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 py-1.5 z-50">
                  {CAR_MENU.map(item => (
                    <Link key={item.to} to={item.to}
                      onClick={() => setCarDropdown(false)}
                      className="block px-4 py-2.5 hover:bg-neutral-50 transition-colors">
                      <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/services" className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive('/services') ? 'text-primary-600 bg-primary-50' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50')}>
              Dịch vụ
            </Link>

            <Link to="/contact" className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive('/contact') ? 'text-primary-600 bg-primary-50' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50')}>
              Liên hệ
            </Link>
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div ref={userRef} className="relative">
                <button onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-700">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-neutral-700">{user.full_name.split(' ').pop()}</span>
                  <ChevronDown size={14} className="text-neutral-400" />
                </button>

                {userDropdown && (
                  <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-50">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <p className="text-xs text-neutral-500">Đăng nhập với</p>
                      <p className="text-sm font-medium text-neutral-800 truncate">{user.email}</p>
                    </div>
                    <Link to="/orders" className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      onClick={() => setUserDropdown(false)}>
                      <Car size={14} /> Đơn hàng của tôi
                    </Link>
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setUserDropdown(false)}>
                        <User size={14} /> Quản trị
                      </Link>
                    )}
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Đăng nhập</Link>
                <Link to="/register" className="btn-primary text-sm">Đăng ký</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white px-4 py-3 space-y-1">
          <Link to="/" className="block px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg"
            onClick={() => setMobileOpen(false)}>Trang chủ</Link>

          <div className="px-3 py-1.5">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Xe</p>
            {CAR_MENU.map(item => (
              <Link key={item.to} to={item.to}
                className="block py-2 text-sm text-neutral-700 hover:text-primary-600"
                onClick={() => setMobileOpen(false)}>{item.label}</Link>
            ))}
          </div>

          <Link to="/services" className="block px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg"
            onClick={() => setMobileOpen(false)}>Dịch vụ</Link>
          <Link to="/contact" className="block px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg"
            onClick={() => setMobileOpen(false)}>Liên hệ</Link>

          <div className={cn('pt-2 border-t border-neutral-100 flex gap-2', 'mt-2')}>
            {isAuthenticated ? (
              <button onClick={() => { void handleLogout(); setMobileOpen(false) }} className="btn-secondary w-full text-sm">
                Đăng xuất
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-secondary flex-1 text-sm" onClick={() => setMobileOpen(false)}>Đăng nhập</Link>
                <Link to="/register" className="btn-primary flex-1 text-sm" onClick={() => setMobileOpen(false)}>Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
