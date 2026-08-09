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
