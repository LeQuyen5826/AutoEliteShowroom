import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Car, CheckCircle, Loader2 } from 'lucide-react'
import { authService } from '@/services/auth.service'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [devUrl, setDevUrl] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const response = await authService.forgotPassword(email)
      setMessage(response.message)
      setDevUrl(response.data?.dev_reset_url || '')
    } catch {
      setMessage('Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 justify-center mb-7">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center"><Car size={20} className="text-white" /></div>
          <span className="font-display font-bold text-xl">Auto<span className="text-primary-600">Elite</span></span>
        </Link>
        <div className="card p-6">
          <h1 className="font-display font-bold text-2xl">Quên mật khẩu</h1>
          <p className="text-sm text-neutral-500 mt-1 mb-5">Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</p>
          {message ? (
            <div className="text-center py-3">
              <CheckCircle size={42} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-neutral-700">{message}</p>
              {devUrl && (
                <a href={devUrl} className="btn-primary mt-4 inline-flex text-sm">Mở link demo đặt lại mật khẩu</a>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
                <input type="email" className="input" required autoFocus value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Đang xử lý...' : 'Gửi liên kết đặt lại'}
              </button>
            </form>
          )}
        </div>
        <Link to="/login" className="mt-5 flex items-center justify-center gap-1.5 text-sm text-primary-600"><ArrowLeft size={15} />Quay lại đăng nhập</Link>
      </div>
    </div>
  )
}
