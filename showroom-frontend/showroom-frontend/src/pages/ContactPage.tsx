import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle } from 'lucide-react'
import api from '@/services/api'

const BRANCHES = [
  {
    name: 'Showroom Hà Nội',
    address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    phone: '024-1234-5678',
    email: 'hanoi@autoelite.vn',
    hours: 'Thứ 2 - Chủ nhật: 8:00 - 20:00',
    map: 'https://maps.google.com/?q=123+Pho+Hue+Hanoi',
  },
  {
    name: 'Showroom Hồ Chí Minh',
    address: '456 Điện Biên Phủ, Bình Thạnh, TP.HCM',
    phone: '028-8765-4321',
    email: 'hcm@autoelite.vn',
    hours: 'Thứ 2 - Chủ nhật: 8:00 - 20:00',
    map: 'https://maps.google.com/?q=456+Dien+Bien+Phu+HCMC',
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/contact', form)
      setSuccess(true)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(message || 'Không thể gửi yêu cầu. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-neutral-400 text-sm font-medium tracking-widest uppercase mb-3">Liên hệ</p>
          <h1 className="font-display font-bold text-4xl mb-3">Chúng tôi luôn lắng nghe</h1>
          <p className="text-neutral-400 max-w-xl mx-auto">Hãy liên hệ với chúng tôi — đội ngũ tư vấn sẽ phản hồi trong vòng 24 giờ.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Left: Branch info */}
          <div className="space-y-6">
            <h2 className="font-display font-bold text-xl text-neutral-900">Thông tin chi nhánh</h2>

            {BRANCHES.map((b) => (
              <div key={b.name} className="card p-6 space-y-3">
                <h3 className="font-display font-semibold text-neutral-900 text-base">{b.name}</h3>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 text-sm text-neutral-600">
                    <MapPin size={16} className="text-primary-500 shrink-0 mt-0.5" />
                    <span>{b.address}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-600">
                    <Phone size={16} className="text-primary-500 shrink-0" />
                    <a href={`tel:${b.phone}`} className="hover:text-primary-600">{b.phone}</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-600">
                    <Mail size={16} className="text-primary-500 shrink-0" />
                    <a href={`mailto:${b.email}`} className="hover:text-primary-600">{b.email}</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-600">
                    <Clock size={16} className="text-primary-500 shrink-0" />
                    <span>{b.hours}</span>
                  </div>
                </div>
                <a href={b.map} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline mt-1">
                  <MapPin size={13} /> Xem bản đồ
                </a>
              </div>
            ))}

            {/* Hotline box */}
            <div className="card p-6 bg-primary-600 border-primary-600">
              <p className="text-primary-200 text-xs font-medium uppercase tracking-wide mb-1">Hotline hỗ trợ 24/7</p>
              <p className="font-display font-bold text-white text-3xl">024-1234-5678</p>
              <p className="text-primary-200 text-sm mt-1">Miễn phí cuộc gọi trong giờ hành chính</p>
            </div>
          </div>

          {/* Right: Contact form */}
          <div className="card p-6">
            <h2 className="font-display font-bold text-xl text-neutral-900 mb-5">Gửi tin nhắn cho chúng tôi</h2>

            {success ? (
              <div className="text-center py-10">
                <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg text-neutral-900 mb-2">Gửi thành công!</h3>
                <p className="text-neutral-500 text-sm">Chúng tôi sẽ liên hệ lại với bạn trong vòng 24 giờ.</p>
                <button onClick={() => { setSuccess(false); setForm({ name:'', email:'', phone:'', subject:'', message:'' }) }}
                  className="btn-secondary mt-6 text-sm">Gửi tin nhắn khác</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Họ và tên *</label>
                    <input className="input" placeholder="Nguyễn Văn A" required
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Số điện thoại</label>
                    <input className="input" placeholder="0901234567" type="tel"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email *</label>
                  <input className="input" placeholder="ban@email.com" type="email" required
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Chủ đề</label>
                  <select className="select"
                    value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                    <option value="">Chọn chủ đề...</option>
                    <option value="mua-xe">Tư vấn mua xe</option>
                    <option value="lai-thu">Đặt lịch lái thử</option>
                    <option value="bao-duong">Bảo dưỡng & Sửa chữa</option>
                    <option value="tai-chinh">Hỗ trợ tài chính</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nội dung tin nhắn *</label>
                  <textarea className="input resize-none h-32" required
                    placeholder="Mô tả câu hỏi hoặc yêu cầu của bạn..."
                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {loading ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>

                <p className="text-xs text-neutral-400 text-center">
                  Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
