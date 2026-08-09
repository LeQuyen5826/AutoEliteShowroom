import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/orders.service'
import { formatPrice } from '@/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts'
import {
  Car, ShoppingCart, Users, CalendarCheck,
  TrendingUp, Package, Loader2
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  available:   '#10b981',
  reserved:    '#f59e0b',
  sold:        '#6366f1',
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Còn hàng', reserved: 'Đã đặt', sold: 'Đã bán',
}

export default function AdminDashboard() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardService.getOverview,
    refetchInterval: 30_000,
  })

  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: () => dashboardService.getRevenue(),
  })

  const { data: carsStatus } = useQuery({
    queryKey: ['dashboard-cars-status'],
    queryFn: dashboardService.getCarsStatus,
  })

  if (loadingOverview) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 size={32} className="animate-spin text-primary-600" />
    </div>
  )

  const statCards = [
    {
      label: 'Tổng doanh thu',
      value: formatPrice(overview?.revenue?.total || 0),
      icon: <TrendingUp size={20} />,
      color: 'bg-emerald-50 text-emerald-600',
      sub: 'Từ các giao dịch',
    },
    {
      label: 'Tổng xe',
      value: overview?.cars?.total || 0,
      icon: <Car size={20} />,
      color: 'bg-blue-50 text-blue-600',
      sub: `${overview?.cars?.available || 0} còn hàng`,
    },
    {
      label: 'Đơn hàng',
      value: overview?.orders?.total || 0,
      icon: <ShoppingCart size={20} />,
      color: 'bg-violet-50 text-violet-600',
      sub: `${overview?.orders?.pending || 0} chờ xác nhận`,
    },
    {
      label: 'Khách hàng',
      value: overview?.users?.customers || 0,
      icon: <Users size={20} />,
      color: 'bg-amber-50 text-amber-600',
      sub: `${overview?.users?.staff || 0} nhân viên`,
    },
    {
      label: 'Lịch lái thử',
      value: overview?.testDrives?.total || 0,
      icon: <CalendarCheck size={20} />,
      color: 'bg-rose-50 text-rose-600',
      sub: `${overview?.testDrives?.pending || 0} chờ xác nhận`,
    },
    {
      label: 'Xe đã bán',
      value: overview?.cars?.sold || 0,
      icon: <Package size={20} />,
      color: 'bg-neutral-100 text-neutral-600',
      sub: `${overview?.cars?.reserved || 0} đang đặt cọc`,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-7">
        <h1 className="font-display font-bold text-2xl text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Tổng quan hệ thống showroom</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon, color, sub }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              {icon}
            </div>
            <p className="text-2xl font-display font-bold text-neutral-900">{value}</p>
            <p className="text-sm font-medium text-neutral-700 mt-0.5">{label}</p>
            <p className="text-xs text-neutral-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ doanh thu */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display font-semibold text-neutral-900 mb-5">
            Doanh thu theo tháng {revenue?.year}
          </h2>
          {loadingRevenue ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-neutral-400" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenue?.monthlyRevenue || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : String(v)}
                />
                <Tooltip
                  formatter={(value) => [formatPrice(Number(value ?? 0)), 'Doanh thu']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Biểu đồ trạng thái xe */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-neutral-900 mb-5">Trạng thái xe</h2>
          {carsStatus?.byStatus ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={carsStatus.byStatus}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="count"
                  nameKey="status"
                >
                  {carsStatus.byStatus.map((entry: { status: string }, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    Number(value ?? 0), STATUS_LABELS[String(name)] || String(name)
                  ]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => STATUS_LABELS[value] || value}
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-neutral-400" />
            </div>
          )}
        </div>
      </div>

      {/* Đơn hàng gần đây */}
      <div className="card p-6 mt-6">
        <h2 className="font-display font-semibold text-neutral-900 mb-4">Đơn hàng gần đây</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                {['Khách hàng', 'Xe', 'Loại', 'Ngày tạo'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {(overview?.recentOrders || []).map((order: {
                id: string
                type: string
                created_at: string
                customer: { full_name: string; email: string }
                car: { brand: string; model: string; year: number }
              }) => (
                <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-medium text-neutral-900">{order.customer.full_name}</p>
                    <p className="text-xs text-neutral-400">{order.customer.email}</p>
                  </td>
                  <td className="py-3 px-3 text-neutral-700">
                    {order.car.brand} {order.car.model} {order.car.year}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`badge ${order.type === 'purchase' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'}`}>
                      {order.type === 'purchase' ? 'Mua xe' : 'Đặt cọc'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-neutral-500">
                    {new Date(order.created_at).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!overview?.recentOrders || overview.recentOrders.length === 0) && (
            <p className="text-center py-8 text-sm text-neutral-400">Chưa có đơn hàng nào</p>
          )}
        </div>
      </div>
    </div>
  )
}
