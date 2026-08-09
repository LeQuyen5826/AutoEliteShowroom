import { Prisma } from '@prisma/client'
import prisma from '../config/prisma'

type SearchableCar = {
  id: string
  stock_code?: string | null
  vin?: string | null
  brand: string
  model: string
  year: number
  price: Prisma.Decimal | number | string
  mileage?: number | null
  fuel_type: string
  transmission: string
  condition?: string
  description?: string | null
  specs?: unknown
}

export function buildCarSearchContent(car: SearchableCar): string {
  return [
    car.stock_code,
    car.vin,
    car.brand,
    car.model,
    String(car.year),
    String(car.price),
    car.mileage != null ? `${car.mileage} km` : '',
    car.fuel_type,
    car.transmission,
    car.condition,
    car.description,
    car.specs ? JSON.stringify(car.specs) : '',
  ].filter(Boolean).join(' | ')
}

export async function syncCarSearchDocument(car: SearchableCar): Promise<void> {
  await prisma.carEmbedding.upsert({
    where: { car_id: car.id },
    update: { content: buildCarSearchContent(car) },
    create: { car_id: car.id, content: buildCarSearchContent(car) },
  })
}

function normalizeVietnamese(value: string): string {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function parseMoney(raw: string, unit?: string): number {
  const number = Number(raw.replace(',', '.'))
  if (!Number.isFinite(number)) return 0
  const normalizedUnit = normalizeVietnamese(unit || '')
  if (normalizedUnit.startsWith('ty')) return Math.round(number * 1_000_000_000)
  if (normalizedUnit.startsWith('tr')) return Math.round(number * 1_000_000)
  return Math.round(number)
}

/** Chuyển câu tự nhiên thành Prisma filter, hoạt động cả khi không có API key. */
export function buildNaturalLanguageWhere(search: string): Prisma.CarWhereInput {
  const normalized = normalizeVietnamese(search).replace(/[^a-z0-9.,\s-]/g, ' ')
  const and: Prisma.CarWhereInput[] = []

  if (/\b(xang|gasoline)\b/.test(normalized)) and.push({ fuel_type: { contains: 'xăng', mode: 'insensitive' } })
  else if (/\b(dau|diesel)\b/.test(normalized)) and.push({ fuel_type: { contains: 'dầu', mode: 'insensitive' } })
  else if (/\b(dien|electric|ev)\b/.test(normalized)) and.push({ fuel_type: { contains: 'điện', mode: 'insensitive' } })
  else if (/\bhybrid\b/.test(normalized)) and.push({ fuel_type: { contains: 'hybrid', mode: 'insensitive' } })

  if (/\b(so san|manual)\b/.test(normalized)) and.push({ transmission: { contains: 'sàn', mode: 'insensitive' } })
  else if (/\b(so tu dong|tu dong|automatic)\b/.test(normalized)) and.push({ transmission: { contains: 'động', mode: 'insensitive' } })

  if (/\b(xe cu|da qua su dung|used)\b/.test(normalized)) and.push({ condition: 'used_car' })
  else if (/\b(xe moi|new)\b/.test(normalized)) and.push({ condition: 'new_car' })

  const moneyPattern = /(\d+(?:[.,]\d+)?)\s*(ty|ti|trieu|tr)?/g
  for (const match of normalized.matchAll(moneyPattern)) {
    const value = parseMoney(match[1], match[2])
    if (value < 1_000_000) continue
    const before = normalized.slice(Math.max(0, (match.index || 0) - 18), match.index)
    if (/duoi|khong qua|toi da|nho hon/.test(before)) and.push({ price: { lte: value } })
    else if (/tren|toi thieu|lon hon|tu/.test(before)) and.push({ price: { gte: value } })
  }

  const yearMatch = normalized.match(/\b(19\d{2}|20\d{2})\b/)
  if (yearMatch) and.push({ year: Number(yearMatch[1]) })

  const stopWords = new Set([
    'tim', 'kiem', 'xe', 'cho', 'toi', 'can', 'muon', 'co', 'gia', 'khoang', 'duoi', 'tren',
    'khong', 'qua', 'tu', 'den', 'trieu', 'ty', 'ti', 'so', 'san', 'dong', 'xang', 'dau',
    'dien', 'moi', 'cu', 'da', 'qua', 'su', 'dung', 'nam', 'doi', 'loai', 'chiec', 'mot',
  ])
  const keywords = normalized.split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.has(word) && !/^\d/.test(word))
    .slice(0, 5)

  if (keywords.length) {
    and.push({
      AND: keywords.map(keyword => ({
        OR: [
          { brand: { contains: keyword, mode: 'insensitive' } },
          { model: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          { stock_code: { contains: keyword, mode: 'insensitive' } },
          { vin: { contains: keyword, mode: 'insensitive' } },
          { embedding: { is: { content: { contains: keyword, mode: 'insensitive' } } } },
        ],
      })),
    })
  }

  return and.length ? { AND: and } : {}
}
