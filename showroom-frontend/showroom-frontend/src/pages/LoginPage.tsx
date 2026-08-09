import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Car, Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useAuthStore()
  const redirect = (location.state as { redirect?: string })?.redirect || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authService.login(form)
      setAuth(data.user, data.access_token)
      navigate(redirect, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Email hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 justify-center">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <Car size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-neutral-900">
              Auto<span className="text-primary-600">Elite</span>
            </span>
          </Link>
          <h1 className="mt-5 font-display font-bold text-2xl text-neutral-900">Đăng nhập</h1>
          <p className="text-sm text-neutral-500 mt-1">Chào mừng bạn quay lại!</p>
        </div>

        {/* Form */}
        <div className="card p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-neutral-700">Mật khẩu</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/*
            Đã ẩn khối gợi ý "Tài khoản demo" khỏi giao diện theo yêu cầu.
            Các tài khoản demo dưới đây VẪN HOẠT ĐỘNG để đăng nhập bình thường
            (dữ liệu seed ở backend không bị xoá), chỉ là không còn hiển thị
            nút bấm nhanh trên màn hình đăng nhập nữa:
              - Admin:    admin@showroom.vn    / admin123
              - Staff:    staff@showroom.vn    / staff123
              - Customer: customer@example.com / customer123
          */}
        </div>

        <p className="text-center text-sm text-neutral-500 mt-5">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-primary-600 font-medium hover:underline">Đăng ký</Link>
        </p>
      </div>
    </div>
  )
}
