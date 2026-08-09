import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'
import BrandLogo from '@/components/brand/BrandLogo'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return }
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể đặt lại mật khẩu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-7"><BrandLogo size="lg" /></div>
        <div className="card p-6">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={46} className="text-emerald-500 mx-auto mb-3" />
              <h1 className="font-display font-bold text-xl">Đổi mật khẩu thành công</h1>
              <p className="text-sm text-neutral-500 mt-2 mb-5">Tất cả phiên đăng nhập cũ đã được thu hồi.</p>
              <Link to="/login" className="btn-primary inline-flex">Đăng nhập lại</Link>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl">Đặt mật khẩu mới</h1>
              <p className="text-sm text-neutral-500 mt-1 mb-5">Mật khẩu cần có ít nhất 8 ký tự.</p>
              {!token && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">Liên kết không có token hợp lệ.</div>}
              {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <form onSubmit={submit} className="space-y-4">
                <input type="password" className="input" minLength={8} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Mật khẩu mới" />
                <input type="password" className="input" minLength={8} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu" />
                <button type="submit" className="btn-primary w-full" disabled={loading || !token}>
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
