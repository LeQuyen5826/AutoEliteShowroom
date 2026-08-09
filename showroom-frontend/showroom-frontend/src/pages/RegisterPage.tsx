import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Car, Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth.store'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (form.password.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự')
      return
    }

    setLoading(true)
    try {
      await authService.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      })
      // Tự động đăng nhập sau khi đăng ký
      const data = await authService.login({ email: form.email, password: form.password })
      setAuth(data.user, data.access_token)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Đăng ký thất bại, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        required={key !== 'phone'}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
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
          <h1 className="mt-5 font-display font-bold text-2xl text-neutral-900">Tạo tài khoản</h1>
          <p className="text-sm text-neutral-500 mt-1">Đăng ký để bắt đầu trải nghiệm</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('full_name', 'Họ và tên', 'text', 'Nguyễn Văn A')}
            {field('email', 'Email', 'email', 'you@example.com')}
            {field('phone', 'Số điện thoại (tuỳ chọn)', 'tel', '0901234567')}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Tối thiểu 8 ký tự"
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

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="input"
                placeholder="Nhập lại mật khẩu"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-5">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
