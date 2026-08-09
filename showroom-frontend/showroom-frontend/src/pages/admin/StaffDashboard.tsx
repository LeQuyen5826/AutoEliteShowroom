import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Car, ClipboardList, CalendarCheck, Wrench, Users, Wallet, Loader2, ArrowRight } from 'lucide-react'
import { dashboardService } from '@/services/orders.service'
import { formatPrice } from '@/utils'

type StaffOverview = {
  branch: { id: string; name: string } | null
  cars: { total: number; available: number }
  orders: { pending: number; confirmed: number }
  testDrives: { pending: number }
  maintenances: { active: number }
  customers: { total: number }
  revenue: { total: number | string }
  recentOrders: Array<{
    id: string
    type: string
    status: string
    total_amount: number | string
    created_at: string
    customer: { full_name: string; phone?: string }
    car: { brand: string; model: string; year: number }
  }>
}

export default function StaffDashboard() {
  const { data, isLoading } = useQuery<StaffOverview>({
    queryKey: ['staff-dashboard'],
    queryFn: dashboardService.getStaffOverview,
  })

  if (isLoading) return <div className="min-h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" /></div>

  const cards = [
    { label: 'Xe sẵn sàng bán', value: data?.cars.available ?? 0, icon: <Car size={20} />, to: '/admin/inventory', color: 'bg-blue-50 text-blue-700' },
    { label: 'Đơn chờ xử lý', value: data?.orders.pending ?? 0, icon: <ClipboardList size={20} />, to: '/admin/orders', color: 'bg-amber-50 text-amber-700' },
    { label: 'Lịch lái thử chờ xử lý', value: data?.testDrives.pending ?? 0, icon: <CalendarCheck size={20} />, to: '/admin/test-drives', color: 'bg-violet-50 text-violet-700' },
    { label: 'Bảo dưỡng chờ xử lý', value: data?.maintenances.active ?? 0, icon: <Wrench size={20} />, to: '/admin/maintenance', color: 'bg-orange-50 text-orange-700' },
    { label: 'Khách hàng phụ trách', value: data?.customers.total ?? 0, icon: <Users size={20} />, to: '/admin/customers', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Doanh thu hoàn tất', value: formatPrice(data?.revenue.total ?? 0), icon: <Wallet size={20} />, to: '/admin/orders', color: 'bg-cyan-50 text-cyan-700' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display font-bold text-2xl text-neutral-900">Dashboard nhân viên</h1>
        <p className="text-sm text-neutral-500 mt-1">Tổng quan công việc {data?.branch?.name ? `tại ${data.branch.name}` : 'được giao'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-7">
        {cards.map(card => (
          <Link key={card.label} to={card.to} className="card p-5 hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>{card.icon}</div>
            <p className="font-display font-bold text-2xl text-neutral-900">{card.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-neutral-600">{card.label}</p>
              <ArrowRight size={14} className="text-neutral-400" />
            </div>
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-neutral-100">
          <h2 className="font-display font-semibold text-neutral-900">Đơn hàng gần đây</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50"><tr>{['Khách hàng', 'Xe', 'Hình thức', 'Giá trị', 'Ngày tạo'].map(h => <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-neutral-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {(data?.recentOrders ?? []).map(order => (
                <tr key={order.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-4"><p className="font-medium text-neutral-900">{order.customer.full_name}</p><p className="text-xs text-neutral-400">{order.customer.phone || 'Chưa có số điện thoại'}</p></td>
                  <td className="py-3 px-4">{order.car.brand} {order.car.model} {order.car.year}</td>
                  <td className="py-3 px-4">{order.type === 'purchase' ? 'Mua xe' : 'Đặt cọc'}</td>
                  <td className="py-3 px-4 font-medium">{formatPrice(order.total_amount)}</td>
                  <td className="py-3 px-4 text-neutral-500">{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.recentOrders?.length && <p className="text-center py-10 text-sm text-neutral-400">Chưa có đơn hàng tại chi nhánh</p>}
        </div>
      </div>
    </div>
  )
}
