import https from 'https'

function getGeminiConfig() {
  return {
    key: process.env.GEMINI_API_KEY?.trim() || '',
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  }
}

export interface GeminiMessage {
  role: 'user' | 'model'
  content: string
}

function sanitizeHistory(history: GeminiMessage[]): GeminiMessage[] {
  const result: GeminiMessage[] = []
  for (const msg of history) {
    if (result.length === 0) {
      if (msg.role === 'user') result.push(msg)
      continue
    }
    if (msg.role !== result[result.length - 1].role) {
      result.push(msg)
    }
  }
  if (result.length > 0 && result[result.length - 1].role === 'user') {
    result.pop()
  }
  return result
}

function httpsPost(url: string, body: object, apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-goog-api-key': apiKey,
      },
    }
    const req = https.request(options, (res) => {
      let raw = ''
      res.on('data', (chunk) => {
        raw += chunk
        if (raw.length > 1_000_000) req.destroy(new Error('Phản hồi AI vượt giới hạn cho phép'))
      })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Gemini API lỗi ${res.statusCode}: ${raw}`))
        } else {
          resolve(raw)
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(20_000, () => req.destroy(new Error('Gemini API timeout')))
    req.write(data)
    req.end()
  })
}

export async function geminiChat(
  systemPrompt: string,
  history: GeminiMessage[],
  userMessage: string
): Promise<string> {
  const { key, model } = getGeminiConfig()
  if (!key) throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env')

  const clean = sanitizeHistory(history)
  const contents = [
    ...clean.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ]

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const raw = await httpsPost(url, {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }, key)

  const json = JSON.parse(raw) as {
    candidates?: { content: { parts: { text: string }[] } }[]
    promptFeedback?: { blockReason?: string }
  }

  if (json.promptFeedback?.blockReason) throw new Error(`Bị chặn: ${json.promptFeedback.blockReason}`)

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini không trả về nội dung')

  return text.trim()
}

export interface VisionInventoryCar {
  id: string
  brand: string
  model: string
  year: number
  fuel_type: string
  transmission: string
  description: string | null
  specs: unknown
}

export interface VisionMatch {
  car_id: string
  confidence: number
  reason: string
}

export interface VisionSearchResult {
  analysis: string
  matches: VisionMatch[]
}

/** Phân tích ảnh khách gửi và đối chiếu với dữ liệu xe thật trong kho. */
export async function geminiVisionSearch(
  image: Buffer,
  mimeType: string,
  inventory: VisionInventoryCar[]
): Promise<VisionSearchResult> {
  const { key, model } = getGeminiConfig()
  if (!key) throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env')

  const inventoryText = inventory.map(car => ({
    id: car.id,
    name: `${car.brand} ${car.model} ${car.year}`,
    fuel_type: car.fuel_type,
    transmission: car.transmission,
    description: car.description,
    specs: car.specs,
  }))

  const prompt = `Bạn là hệ thống tìm xe bằng hình ảnh của AutoElite Showroom.
Hãy nhận diện loại xe, kiểu dáng, hãng/model có khả năng, màu sắc và đặc điểm nổi bật trong ảnh khách gửi.
Sau đó đối chiếu với DANH SÁCH XE THẬT bên dưới. Chỉ được trả về car_id có trong danh sách.
Không khẳng định chắc chắn nếu ảnh mờ hoặc góc chụp không đủ thông tin.

DANH SÁCH XE:
${JSON.stringify(inventoryText)}

Trả về duy nhất JSON hợp lệ theo dạng:
{"analysis":"mô tả ngắn bằng tiếng Việt","matches":[{"car_id":"uuid","confidence":0-100,"reason":"lý do ngắn"}]}
Tối đa 5 kết quả, sắp xếp confidence giảm dần.`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const raw = await httpsPost(url, {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: image.toString('base64') } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  }, key)

  const json = JSON.parse(raw) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = json.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
  if (!text) throw new Error('Gemini không trả về kết quả nhận diện ảnh')

  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')) as VisionSearchResult
  const validIds = new Set(inventory.map(car => car.id))
  return {
    analysis: String(parsed.analysis || 'Đã phân tích ảnh xe.'),
    matches: Array.isArray(parsed.matches)
      ? parsed.matches
        .filter(match => validIds.has(match.car_id))
        .map(match => ({
          car_id: match.car_id,
          confidence: Math.max(0, Math.min(100, Number(match.confidence) || 0)),
          reason: String(match.reason || ''),
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
      : [],
  }
}
