import { Request, Response } from 'express'
import prisma from '../../config/prisma'
import { sendSuccess, sendError } from '../../utils/response'
import { geminiChat } from '../../utils/gemini'
import { signChatSessionToken, verifyChatSessionToken } from '../../utils/jwt'

// ─── System Prompt ────────────────────────────────────────────────────────────
// AI sẽ tự suy nghĩ và trả lời — không cần kịch bản cứng.
// System prompt chỉ định vai trò và ngữ cảnh xe thực tế.

const SYSTEM_PROMPT = `Bạn là **AutoElite AI** — trợ lý tư vấn xe thông minh của AutoElite Showroom Việt Nam.

## Tính cách
- Thân thiện, nhiệt tình, chuyên nghiệp
- Hiểu biết sâu về ô tô (thông số kỹ thuật, so sánh hãng, kinh nghiệm mua xe)
- Nói tiếng Việt tự nhiên, dễ hiểu — tránh dùng thuật ngữ khó

## Nhiệm vụ
- Tư vấn xe phù hợp theo ngân sách, nhu cầu, sở thích của khách
- Giải thích thông số kỹ thuật một cách đơn giản
- So sánh các dòng xe khách quan
- Hỗ trợ khách đặt lịch lái thử hoặc tìm hiểu quy trình mua xe
- Trả lời mọi câu hỏi liên quan đến ô tô (bảo dưỡng, bảo hiểm, đăng ký xe...)

## Quy tắc quan trọng
- Khi giới thiệu xe cụ thể, **CHỈ dùng xe có trong danh sách kho bên dưới**
- Nếu khách hỏi xe không có trong kho → thành thật nói chưa có và gợi ý xe thay thế phù hợp
- Định dạng giá: "850 triệu" hoặc "1,2 tỷ đồng"
- Có thể trả lời câu hỏi chung về ô tô dù không liên quan đến kho xe`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function carToText(car: {
  brand: string; model: string; year: number
  price: string | number | { toString(): string }
  fuel_type: string; transmission: string
  description?: string | null; status?: string
}): string {
  return [
    `${car.brand} ${car.model} (${car.year})`,
    `Giá: ${Number(car.price).toLocaleString('vi-VN')} đồng`,
    `Nhiên liệu: ${car.fuel_type} | Hộp số: ${car.transmission}`,
    car.description ? `Mô tả: ${car.description}` : '',
  ].filter(Boolean).join(' — ')
}

/** Lấy xe liên quan từ DB để đưa vào context cho AI */
async function getCarContext(userQuery: string): Promise<string> {
  // Tìm kiếm keyword trong brand/model/description
  const keywords = userQuery
    .toLowerCase()
    .replace(/[^\w\sàáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/g, '')
    .split(/\s+/)
    .filter(k => k.length > 1)
    .slice(0, 8)

  let cars: {
    brand: string; model: string; year: number; price: unknown
    fuel_type: string; transmission: string; description: string | null
  }[] = []

  if (keywords.length > 0) {
    cars = await prisma.car.findMany({
      where: {
        status: 'available',
        OR: keywords.flatMap(k => [
          { brand: { contains: k, mode: 'insensitive' as const } },
          { model: { contains: k, mode: 'insensitive' as const } },
          { fuel_type: { contains: k, mode: 'insensitive' as const } },
          { description: { contains: k, mode: 'insensitive' as const } },
        ]),
      },
      orderBy: { price: 'asc' },
      take: 6,
      select: {
        brand: true, model: true, year: true, price: true,
        fuel_type: true, transmission: true, description: true,
      },
    })
  }

  // Nếu không tìm thấy theo keyword → lấy xe mới nhất
  if (cars.length === 0) {
    cars = await prisma.car.findMany({
      where: { status: 'available' },
      orderBy: { created_at: 'desc' },
      take: 6,
      select: {
        brand: true, model: true, year: true, price: true,
        fuel_type: true, transmission: true, description: true,
      },
    })
  }

  if (cars.length === 0) {
    return '\n\n**Kho xe hiện tại:** Showroom đang cập nhật kho xe, vui lòng liên hệ trực tiếp để biết thêm.'
  }

  const lines = cars.map((c, i) => `${i + 1}. ${carToText({ ...c, price: c.price?.toString() ?? '0' })}`).join('\n')
  return `\n\n**Kho xe hiện tại của showroom (xe đang có sẵn):**\n${lines}\n\n*Lưu ý: Chỉ giới thiệu xe từ danh sách trên khi khách hỏi xe cụ thể.*`
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function canAccessSession(req: Request, session: { id: string; user_id: string | null }): boolean {
  if (session.user_id) return req.user?.user_id === session.user_id
  const token = req.header('x-chat-session-token')
  if (!token) return false
  try {
    return verifyChatSessionToken(token).session_id === session.id
  } catch {
    return false
  }
}

export const getOrCreateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id ?? null
    const { session_id } = req.body

    if (session_id) {
      const session = await prisma.chatSession.findUnique({
        where: { id: session_id },
        include: { messages: { orderBy: { created_at: 'asc' }, take: 30 } },
      })
      if (session) {
        if (!canAccessSession(req, session)) {
          sendError(res, 'Không có quyền truy cập phiên chat này', 403); return
        }
        sendSuccess(res, { ...session, session_access_token: signChatSessionToken(session.id) }); return
      }
    }

    const session = await prisma.chatSession.create({
      data: { user_id: userId },
      include: { messages: true },
    })

    sendSuccess(res, {
      ...session,
      session_access_token: signChatSessionToken(session.id),
    }, 'Tạo phiên chat thành công', 201)
  } catch (err) {
    console.error('[getOrCreateSession]', err)
    sendError(res, 'Không thể tạo phiên chat')
  }
}

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params
    const { message } = req.body

    if (!message?.trim()) {
      sendError(res, 'Nội dung tin nhắn không được trống', 400); return
    }

    // 1. Xác nhận session
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { created_at: 'asc' }, take: 20 } },
    })
    if (!session) { sendError(res, 'Không tìm thấy phiên chat', 404); return }
    if (!canAccessSession(req, session)) {
      sendError(res, 'Không có quyền truy cập phiên chat này', 403); return
    }

    // 2. Lưu tin nhắn user
    await prisma.chatMessage.create({
      data: { session_id: sessionId, role: 'user', content: message.trim() },
    })

    // 3. Lấy context xe từ DB
    const carContext = await getCarContext(message)
    const systemWithContext = SYSTEM_PROMPT + carContext

    // 4. Chuyển lịch sử sang định dạng Gemini
    //    Gemini dùng role 'model' thay vì 'assistant'
    const history = session.messages.slice(-12).map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      content: m.content,
    }))

    // 5. Gọi Gemini AI — tự do trả lời, không kịch bản cứng
    const aiReply = await geminiChat(systemWithContext, history, message.trim())

    // 6. Lưu câu trả lời
    const assistantMsg = await prisma.chatMessage.create({
      data: { session_id: sessionId, role: 'assistant', content: aiReply },
    })

    sendSuccess(res, { message: assistantMsg, session_id: sessionId })

  } catch (err) {
    console.error('[sendMessage]', err)
    const msg = err instanceof Error ? err.message : 'Lỗi hệ thống'

    // Trả về lỗi có nghĩa cho frontend
    if (msg.includes('GEMINI_API_KEY')) {
      sendError(res, 'Chưa cấu hình API key cho chatbot. Vui lòng liên hệ admin.', 503)
    } else if (msg.includes('429')) {
      sendError(res, 'Chatbot đang bận, vui lòng thử lại sau vài giây.', 429)
    } else {
      sendError(res, 'Không thể xử lý tin nhắn, vui lòng thử lại.', 500)
    }
  }
}

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await prisma.chatSession.findUnique({ where: { id: req.params.sessionId } })
    if (!session) { sendError(res, 'Không tìm thấy phiên chat', 404); return }
    if (!canAccessSession(req, session)) {
      sendError(res, 'Không có quyền truy cập phiên chat này', 403); return
    }
    const messages = await prisma.chatMessage.findMany({
      where: { session_id: req.params.sessionId },
      orderBy: { created_at: 'asc' },
    })
    sendSuccess(res, messages)
  } catch (err) {
    console.error('[getMessages]', err)
    sendError(res)
  }
}

// (Admin) Sinh embedding nếu đã cấu hình OpenAI
export const generateEmbeddings = async (req: Request, res: Response): Promise<void> => {
  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    if (!hasOpenAI) {
      sendError(res, 'Chức năng này cần OPENAI_API_KEY. Chatbot vẫn hoạt động bình thường mà không cần embedding.', 400)
      return
    }
    sendSuccess(res, { note: 'Tính năng embedding cần tích hợp riêng với OpenAI.' })
  } catch (err) {
    console.error('[generateEmbeddings]', err)
    sendError(res)
  }
}
