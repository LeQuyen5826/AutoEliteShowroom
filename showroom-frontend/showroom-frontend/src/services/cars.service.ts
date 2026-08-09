import api from './api'
import type { Car, CarFilter } from '@/types'

export interface CarPayload {
  branch_id: string
  stock_code?: string
  vin?: string
  brand: string
  model: string
  year: number
  price: number
  mileage?: number
  fuel_type: string
  transmission: string
  status?: string
  condition?: string
  description?: string
  specs?: Record<string, unknown>
}

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Không thể xử lý ảnh đã chọn')),
      'image/jpeg',
      quality,
    )
  })

async function compressCarImage(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()

    const maxSide = 1200
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    let quality = 0.76
    let blob = await canvasToBlob(canvas, quality)
    while (blob.size > 600 * 1024 && quality > 0.45) {
      quality -= 0.1
      blob = await canvasToBlob(canvas, quality)
    }
    if (blob.size > 1 * 1024 * 1024) {
      throw new Error('Ảnh quá lớn sau khi nén, vui lòng chọn ảnh khác')
    }

    const outputName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], outputName, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export const carsService = {
  getAll: async (filter: CarFilter = {}) => {
    const params = new URLSearchParams()
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get(`/cars?${params}`)
    return data.data as { cars: Car[]; pagination: { total: number; page: number; limit: number; totalPages: number } }
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/cars/${id}`)
    return data.data as Car
  },

  searchByImage: async (image: File) => {
    const form = new FormData()
    form.append('image', image)
    const { data } = await api.post('/cars/image-search', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45_000,
    })
    return data.data as {
      analysis: string
      matches: { car_id: string; confidence: number; reason: string; car: Car }[]
    }
  },

  getBranches: async () => {
    const { data } = await api.get('/branches')
    return data.data
  },

  // (Staff/Admin) Thêm xe mới — dùng chung axios instance `api` để có
  // sẵn Authorization header + tự refresh token + ném lỗi đúng khi
  // request thất bại (fetch() thô trước đây không báo lỗi khi response 4xx/5xx).
  create: async (payload: CarPayload) => {
    const { data } = await api.post('/cars', payload)
    return data.data as Car
  },

  // (Staff/Admin) Cập nhật xe
  update: async (id: string, payload: Partial<CarPayload>) => {
    const { data } = await api.put(`/cars/${id}`, payload)
    return data.data as Car
  },

  // (Admin) Xoá xe
  remove: async (id: string) => {
    const { data } = await api.delete(`/cars/${id}`)
    return data.data
  },

  // Thêm ảnh cho xe (theo URL)
  addImage: async (id: string, url: string, is_primary = false) => {
    const { data } = await api.post(`/cars/${id}/images`, { url, is_primary })
    return data.data
  },

  // Tải ảnh trực tiếp từ máy lên kho ảnh của hệ thống
  uploadImage: async (id: string, file: File, is_primary = false) => {
    const compressedFile = await compressCarImage(file)
    const form = new FormData()
    form.append('image', compressedFile)
    form.append('is_primary', String(is_primary))
    const { data } = await api.post(`/cars/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    })
    return data.data
  },

  // Xóa ảnh của xe
  removeImage: async (carId: string, imageId: string) => {
    const { data } = await api.delete(`/cars/${carId}/images/${imageId}`)
    return data.data
  },

  // Đặt ảnh làm ảnh đại diện
  setPrimaryImage: async (carId: string, imageId: string) => {
    const { data } = await api.patch(`/cars/${carId}/images/${imageId}/primary`)
    return data.data
  },
}
