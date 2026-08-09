import api from './api'

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

const SESSION_KEY = 'chat_session_id'
const SESSION_TOKEN_KEY = 'chat_session_access_token'

export const chatService = {
  /** Tạo hoặc khôi phục session từ localStorage */
  getOrCreateSession: async (): Promise<{ id: string; messages: ChatMessage[] }> => {
    const existingId = localStorage.getItem(SESSION_KEY)
    const existingToken = localStorage.getItem(SESSION_TOKEN_KEY)
    const { data } = await api.post('/chat/session', { session_id: existingId }, {
      headers: existingToken ? { 'X-Chat-Session-Token': existingToken } : undefined,
    })
    const session = data.data
    localStorage.setItem(SESSION_KEY, session.id)
    localStorage.setItem(SESSION_TOKEN_KEY, session.session_access_token)
    return session
  },

  /** Gửi tin nhắn và nhận câu trả lời AI */
  sendMessage: async (sessionId: string, message: string): Promise<ChatMessage> => {
    const token = localStorage.getItem(SESSION_TOKEN_KEY)
    const { data } = await api.post(`/chat/${sessionId}/message`, { message }, {
      headers: token ? { 'X-Chat-Session-Token': token } : undefined,
    })
    return data.data.message as ChatMessage
  },

  /** Xóa session cũ (bắt đầu cuộc trò chuyện mới) */
  clearSession: () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_TOKEN_KEY)
  },
}
