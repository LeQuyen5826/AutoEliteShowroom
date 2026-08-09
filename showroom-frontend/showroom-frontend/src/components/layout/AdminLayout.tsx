import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart,
  Users, CalendarCheck, ArrowLeft, LogOut, Wrench, Image as ImageIcon,
} from 'lucide-react'
import { cn } from '@/utils'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import BrandLogo from '@/components/brand/BrandLogo'

// Cấu hình menu phân theo vai trò:
// - admin  → thấy toàn bộ kể cả Dashboard & Quản lý người dùng
// - staff  → thấy tồn kho, đơn hàng, lái thử (KHÔNG thấy Dashboard & Người dùng)
const ALL_NAV = [
  {
    to: '/admin',
    label: 'Tổng quan',
    icon: <LayoutDashboard size={18} />,
    exact: true,
    roles: ['admin'],          // chỉ admin
  },
  {
    to: '/admin/inventory',
    label: 'Quản lý tồn kho',
    icon: <Package size={18} />,
    exact: false,
    roles: ['admin', 'staff'],
  },
  {
    to: '/admin/orders',
    label: 'Quản lý đơn hàng',
    icon: <ShoppingCart size={18} />,
    exact: false,
    roles: ['admin', 'staff'],
  },
  {
    to: '/admin/test-drives',
    label: 'Lịch lái thử',
    icon: <CalendarCheck size={18} />,
    exact: false,
    roles: ['admin', 'staff'],
  },
  {
    to: '/admin/maintenance',
    label: 'Bảo dưỡng',
    icon: <Wrench size={18} />,
    exact: false,
    roles: ['admin', 'staff'],
  },
  {
    to: '/admin/car-images',
    label: 'Ảnh xe',
    icon: <ImageIcon size={18} />,
    exact: false,
    roles: ['admin', 'staff'],
  },
  {
    to: '/admin/users',
    label: 'Người dùng',
    icon: <Users size={18} />,
    exact: false,
    roles: ['admin'],          // chỉ admin
  },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const role = user?.role ?? 'customer'

  // Lọc menu theo role người dùng hiện tại
  const nav = ALL_NAV.filter(item => item.roles.includes(role))

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to)

  const handleLogout = async () => {
    try { await authService.logout() } finally { logout(); navigate('/') }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* ── Sidebar desktop ── */}
      <aside className="w-60 bg-white border-r border-neutral-100 hidden md:flex flex-col shrink-0">
        {/* Logo + info */}
        <div className="p-5 border-b border-neutral-100">
          <div className="mb-1">
            <BrandLogo size="sm" />
          </div>
          <p className="text-xs text-neutral-400">
            {role === 'admin' ? '🔐 Quản trị viên' : '👤 Nhân viên bán hàng'}
          </p>
          {user && (
            <p className="text-xs font-medium text-neutral-600 mt-0.5 truncate">{user.full_name}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => (
            <Link key={item.to} to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive(item.to, item.exact)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-50'
              )}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer links */}
        <div className="p-3 border-t border-neutral-100 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-neutral-500 hover:bg-neutral-50 transition-colors">
            <ArrowLeft size={16} /> Về trang chủ
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Bottom nav mobile ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 flex z-40">
        {nav.map(item => (
          <Link key={item.to} to={item.to}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs',
              isActive(item.to, item.exact) ? 'text-primary-600' : 'text-neutral-500'
            )}>
            {item.icon}
            <span className="leading-none">{item.label.split(' ').pop()}</span>
          </Link>
        ))}
      </div>

      {/* ── Nội dung chính ── */}
      <div className="flex-1 min-w-0 pb-16 md:pb-0">
        <Outlet />
      </div>
    </div>
  )
}
