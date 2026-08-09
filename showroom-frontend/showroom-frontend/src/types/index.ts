// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'customer' | 'staff' | 'admin'
export type CarStatus = 'available' | 'reserved' | 'sold'
export type CarCondition = 'new_car' | 'used_car'
export type OrderType = 'deposit' | 'purchase'
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  role: Role
  branch_id?: string
  created_at: string
}

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  _count?: { cars: number; users: number }
}

export interface CarImage {
  id: string
  car_id: string
  url: string
  is_primary: boolean
}

export interface Car {
  id: string
  stock_code?: string
  vin?: string
  branch_id: string
  brand: string
  model: string
  year: number
  price: number | string
  mileage: number
  fuel_type: string
  transmission: string
  status: CarStatus
  condition: CarCondition
  specs?: Record<string, unknown>
  description?: string
  created_at: string
  images: CarImage[]
  branch?: Branch
  reviews?: Review[]
}

export interface Order {
  id: string
  customer_id: string
  staff_id?: string
  car_id: string
  branch_id: string
  type: OrderType
  status: OrderStatus
  total_amount: number | string
  payment_due_amount: number | string
  payment_plan: 'full' | 'installment'
  financing_amount: number | string
  financing_months?: number
  notes?: string
  created_at: string
  car?: Car
  customer?: User
}

export interface Review {
  id: string
  customer_id: string
  car_id: string
  rating: number
  comment?: string
  created_at: string
  customer?: Pick<User, 'id' | 'full_name'>
}

export type TestDriveStatus = 'pending' | 'confirmed' | 'done' | 'cancelled'

export interface TestDrive {
  id: string
  customer_id: string
  car_id: string
  branch_id: string
  scheduled_at: string
  status: TestDriveStatus
  notes?: string
  created_at: string
  car?: Pick<Car, 'id' | 'brand' | 'model' | 'year'>
  customer?: Pick<User, 'id' | 'full_name' | 'phone' | 'email'>
}

export type MaintenanceStatus = 'pending' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'

export interface Maintenance {
  id: string
  customer_id: string
  car_id?: string
  branch_id?: string
  service_type: string
  scheduled_at: string
  status: MaintenanceStatus
  notes?: string
  cost?: number | string
  created_at: string
  car?: Pick<Car, 'id' | 'brand' | 'model' | 'year'>
  customer?: Pick<User, 'id' | 'full_name' | 'phone' | 'email'>
  branch?: Pick<Branch, 'id' | 'name'>
}

// ─── API Response wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    [key: string]: T[]
  } & {
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  full_name: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export interface CarFilter {
  search?: string
  brand?: string
  fuel_type?: string
  transmission?: string
  status?: CarStatus
  condition?: CarCondition
  min_price?: number
  max_price?: number
  min_year?: number
  max_year?: number
  branch_id?: string
  page?: number
  limit?: number
}
