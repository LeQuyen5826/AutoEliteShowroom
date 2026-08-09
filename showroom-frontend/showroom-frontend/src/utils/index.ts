import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatPrice = (price: number | string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price))

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n)

export const carStatusLabel: Record<string, { label: string; color: string }> = {
  available:   { label: 'Còn hàng',     color: 'bg-emerald-50 text-emerald-700' },
  reserved:    { label: 'Đã đặt cọc',   color: 'bg-amber-50 text-amber-700' },
  sold:        { label: 'Đã bán',        color: 'bg-neutral-100 text-neutral-500' },
}

export const carConditionLabel: Record<string, { label: string; color: string }> = {
  new_car:  { label: 'Xe mới',           color: 'bg-primary-50 text-primary-700' },
  used_car: { label: 'Đã qua sử dụng',   color: 'bg-orange-50 text-orange-700' },
}

export const maintenanceStatusLabel: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Chờ xác nhận',   color: 'bg-amber-50 text-amber-700' },
  confirmed:   { label: 'Đã xác nhận',    color: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'Đang thực hiện', color: 'bg-purple-50 text-purple-700' },
  done:        { label: 'Hoàn tất',       color: 'bg-emerald-50 text-emerald-700' },
  cancelled:   { label: 'Đã hủy',         color: 'bg-neutral-100 text-neutral-500' },
}

export const fuelTypeLabel: Record<string, string> = {
  'Xăng': 'Xăng',
  'Dầu': 'Dầu diesel',
  'Điện': 'Điện',
  'Hybrid': 'Hybrid',
}
