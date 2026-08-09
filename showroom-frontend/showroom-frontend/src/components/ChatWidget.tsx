import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, Bot, RefreshCw } from 'lucide-react'
import { chatService } from '@/services/chat.service'
import type { ChatMessage } from '@/services/chat.service'

const WELCOME: ChatMessage = {
  id: 'welcome',
  session_id: '',
  role: 'assistant',
  content: '👋 Xin chào! Tôi là **AutoElite AI**, trợ lý tư vấn xe thông minh.\n\nTôi có thể giúp bạn tìm xe phù hợp, tư vấn thông số kỹ thuật, so sánh các dòng xe và hỗ trợ đặt lịch lái thử.\n\nBạn đang tìm loại xe như thế nào?',
  created_at: new Date().toISOString(),
}

const QUICK = ['Xe nào phù hợp ngân sách 800 triệu?', 'Có xe điện không?', 'Xe gia đình 7 chỗ?']

function RenderContent({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="shrink-0">•</span>
              <span>{renderBold(line.replace(/^[-•]\s/, ''))}</span>
            </div>
          )
        }
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i}>{renderBold(line)}</p>
      })}
    </div>
  )
}

function renderBold(text: string) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <span key={index}>{part}</span>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && !sessionId) {
      setInitializing(true)
      chatService.getOrCreateSession()
        .then(s => {
          setSessionId(s.id)
          // Không load lại tin cũ — bắt đầu fresh với WELCOME
        })
        .catch(() => setError('Không thể kết nối chatbot.'))
        .finally(() => setInitializing(false))
    }
  }, [open, sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading || !sessionId) return
    setInput('')
    setError('')

    const tmp: ChatMessage = {
      id: `tmp-${Date.now()}`, session_id: sessionId,
      role: 'user', content: msg, created_at: new Date().toISOString(),
    }
    setMessages(p => [...p, tmp])
    setLoading(true)

    try {
      const reply = await chatService.sendMessage(sessionId, msg)
      setMessages(p => [...p, reply])
    } catch (e) {
      setMessages(p => p.filter(m => m.id !== tmp.id))
      setInput(msg)
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || 'Gửi thất bại, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const reset = async () => {
    if (!confirm('Bắt đầu cuộc trò chuyện mới?')) return
    chatService.clearSession()
    setSessionId(null)
    setMessages([WELCOME])
    setError('')
    setInput('')
    setInitializing(true)
    try {
      const s = await chatService.getOrCreateSession()
      setSessionId(s.id)
    } catch {
      setError('Không thể tạo phiên mới.')
    } finally {
      setInitializing(false)
    }
  }

  return (
    <>
      {/* Nút mở/đóng */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Đóng trợ lý tư vấn' : 'Mở trợ lý tư vấn'}
        className="fixed bottom-5 right-5 z-50 w-[52px] h-[52px] rounded-full shadow-lg bg-primary-600 hover:bg-primary-700 flex items-center justify-center transition-all active:scale-95"
      >
        {open ? <X size={20} className="text-white" /> : <MessageCircle size={20} className="text-white" />}
        {!open && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />}
      </button>

      {/* Widget — dùng inset để không bao giờ tràn */}
      {open && (
        <div
          className="fixed z-40 flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden"
          style={{
            // Cố định 4 cạnh để không bao giờ tràn màn hình
            bottom: '72px',
            right: '16px',
            left: 'max(16px, calc(100vw - 376px))',  // tối đa 360px, không tràn trái
            top: 'max(72px, calc(100vh - 580px))',   // không tràn lên trên
          }}
        >
          {/* Header — luôn nhìn thấy ở trên cùng */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-primary-600 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm leading-tight">AutoElite AI</p>
              <p className="text-white/70 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Trợ lý tư vấn xe
              </p>
            </div>
            {/* Nút Reset — hiển thị rõ */}
            <button
              onClick={reset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors shrink-0"
            >
              <RefreshCw size={11} />
              Chat mới
            </button>
            {/* Nút đóng */}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0 ml-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Vùng tin nhắn — flex-1 + overflow-y-auto */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {initializing && (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-neutral-400" />
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={11} className="text-primary-600" />
                  </div>
                )}
                <div className={`flex flex-col gap-0.5 max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant'
                      ? <RenderContent text={msg.content} />
                      : <p className="text-sm">{msg.content}</p>}
                  </div>
                  <span className="text-[10px] text-neutral-400 px-1">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <Bot size={11} className="text-primary-600" />
                </div>
                <div className="bg-neutral-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Câu hỏi gợi ý */}
          {messages.length === 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-neutral-100 shrink-0">
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-50 transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Nhập câu hỏi về xe..."
                maxLength={1000}
                disabled={loading || initializing}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 disabled:opacity-50 min-w-0"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading || initializing || !sessionId}
                className="w-8 h-8 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-200 flex items-center justify-center mr-1 shrink-0 transition-colors"
              >
                {loading
                  ? <Loader2 size={13} className="animate-spin text-white" />
                  : <Send size={13} className="text-white" />}
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 text-center mt-1.5">
              Trả lời bởi Gemini AI · Kết quả mang tính tham khảo
            </p>
          </div>
        </div>
      )}
    </>
  )
}
