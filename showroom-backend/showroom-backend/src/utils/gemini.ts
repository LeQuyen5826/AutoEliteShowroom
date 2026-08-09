import https from 'https'

function getGeminiConfig() {
  return {
    key: process.env.GEMINI_API_KEY?.trim() || '',
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash',
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

function httpsPost(url: string, body: object, apiKey: string, timeoutMs = 30_000): Promise<string> {
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
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Gemini API timeout sau ${Math.round(timeoutMs / 1000)} giây`)))
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
    generationConfig: {
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }, key, 30_000)

  const json = JSON.parse(raw) as {
    candidates?: {
      finishReason?: string
      content?: { parts?: { text?: string; thought?: boolean }[] }
    }[]
    promptFeedback?: { blockReason?: string }
  }

  if (json.promptFeedback?.blockReason) throw new Error(`Bị chặn: ${json.promptFeedback.blockReason}`)

  const candidate = json.candidates?.[0]
  const text = candidate?.content?.parts
    ?.filter(part => !part.thought)
    .map(part => part.text || '')
    .join('')
    .trim()
  if (!text) {
    throw new Error(`Gemini không trả về nội dung (${candidate?.finishReason || 'UNKNOWN'})`)
  }

  return text
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
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingLevel: 'minimal' },
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        required: ['analysis', 'matches'],
        properties: {
          analysis: { type: 'string' },
          matches: {
            type: 'array',
            maxItems: 5,
            items: {
              type: 'object',
              required: ['car_id', 'confidence', 'reason'],
              properties: {
                car_id: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 100 },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, key, 75_000)

  const json = JSON.parse(raw) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[]
  }
  const candidate = json.candidates?.[0]
  const text = candidate?.content?.parts
    ?.filter(part => !part.thought)
    .map(part => part.text || '')
    .join('')
    .trim()
  if (!text) throw new Error('Gemini không trả về kết quả nhận diện ảnh')

  const withoutFence = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const firstBrace = withoutFence.indexOf('{')
  const lastBrace = withoutFence.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error(`Gemini trả về JSON không hoàn chỉnh (${candidate?.finishReason || 'UNKNOWN'})`)
  }
  const parsed = JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as VisionSearchResult
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
