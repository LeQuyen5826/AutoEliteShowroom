import api from './api'
import type { TestDrive, Maintenance } from '@/types'

export const ordersService = {
  create: async (data: {
    car_id: string
    type: 'deposit' | 'purchase'
    payment_plan?: 'full' | 'installment'
    financing_amount?: number
    financing_months?: number
    notes?: string
  }) => {
    const { data: res } = await api.post('/orders', data)
    return res.data
  },

  getAll: async (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) query.append(k, String(v)) })
    const { data } = await api.get(`/orders?${query}`)
    return data.data
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/orders/${id}`)
    return data.data
  },

  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/orders/${id}/status`, { status })
    return data.data
  },

  getPayments: async (orderId: string) => {
    const { data } = await api.get(`/orders/${orderId}/payments`)
    return data.data
  },

  getPaymentQr: async (orderId: string) => {
    const { data } = await api.get(`/orders/${orderId}/payments/qr`)
    return data.data as {
      order_id: string
      car_name: string
      amount: number | string
      reference: string
      qr_image_url: string | null
      bank_id: string
      account_no: string
      account_name: string
      payment_due: number | string
      total_paid: number | string
      is_checkout_paid: boolean
    }
  },

  addPayment: async (orderId: string, payload: { amount: number; method?: string; note?: string }) => {
    const { data } = await api.post(`/orders/${orderId}/payments`, payload)
    return data.data
  },

  createContract: async (orderId: string) => {
    const { data } = await api.post(`/orders/${orderId}/contract`)
    return data.data
  },

  getContract: async (orderId: string) => {
    const { data } = await api.get(`/orders/${orderId}/contract`)
    return data.data
  },

  openContract: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}/contract/file`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const popup = window.open(url, '_blank', 'noopener,noreferrer')
    if (!popup) URL.revokeObjectURL(url)
    else setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}

export const testDrivesService = {
  create: async (data: { car_id: string; scheduled_at: string; notes?: string }) => {
    const { data: res } = await api.post('/test-drives', data)
    return res.data
  },

  getAll: async (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) query.append(k, String(v)) })
    const { data } = await api.get(`/test-drives?${query}`)
    // Trả về đúng cấu trúc { testDrives, pagination }
    return data.data as { testDrives: TestDrive[]; pagination: { total: number; page: number; limit: number; totalPages: number } }
  },

  update: async (id: string, data: { status?: string; notes?: string; scheduled_at?: string }) => {
    const { data: res } = await api.patch(`/test-drives/${id}`, data)
    return res.data
  },
}

export const dashboardService = {
  getStaffOverview: async () => {
    const { data } = await api.get('/dashboard/staff-overview')
    return data.data
  },

  getOverview: async () => {
    const { data } = await api.get('/dashboard/overview')
    return data.data
  },

  getRevenue: async (year?: number) => {
    const { data } = await api.get(`/dashboard/revenue${year ? `?year=${year}` : ''}`)
    return data.data
  },

  getCarsStatus: async () => {
    const { data } = await api.get('/dashboard/cars-status')
    return data.data
  },
}

export const maintenanceService = {
  create: async (data: { car_id?: string; branch_id?: string; customer_id?: string; service_type: string; scheduled_at: string; notes?: string }) => {
    const { data: res } = await api.post('/maintenance', data)
    return res.data
  },

  getAll: async (params: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) query.append(k, String(v)) })
    const { data } = await api.get(`/maintenance?${query}`)
    return data.data as { maintenances: Maintenance[]; pagination: { total: number; page: number; limit: number; totalPages: number } }
  },

  update: async (id: string, data: { status?: string; notes?: string; scheduled_at?: string; cost?: number; service_type?: string }) => {
    const { data: res } = await api.patch(`/maintenance/${id}`, data)
    return res.data
  },

  remove: async (id: string) => {
    const { data } = await api.delete(`/maintenance/${id}`)
    return data.data
  },
}
