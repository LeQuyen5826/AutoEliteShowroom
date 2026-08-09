import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceService } from '@/services/orders.service'
import { usersService } from '@/services/users.service'
import { carsService } from '@/services/cars.service'
import { formatPrice, maintenanceStatusLabel } from '@/utils'
import { Loader2, Wrench, X, ChevronRight, Plus } from 'lucide-react'
import type { Maintenance, MaintenanceStatus } from '@/types'

const NEXT_STATUSES: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done:        [],
  cancelled:   [],
}

const emptyForm = { customer_id: '', car_id: '', service_type: '', scheduled_at: '', notes: '' }

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message || (err instanceof Error ? err.message : 'Có lỗi xảy ra')
}

export default function AdminMaintenance() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Maintenance | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-maintenance', statusFilter, page],
    queryFn: () => maintenanceService.getAll({ status: statusFilter || undefined, page, limit: 12 }),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-maintenance'],
    queryFn: () => usersService.getAll({ role: 'customer', limit: 100 }),
    enabled: showAdd,
  })

  const { data: carsData } = useQuery({
    queryKey: ['cars-for-maintenance'],
    queryFn: () => carsService.getAll({ limit: 100 }),
    enabled: showAdd,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      maintenanceService.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-maintenance'] })
      setUpdatingId(null)
      if (detail) setDetail(null)
    },
    onError: (err) => { alert(getErrorMessage(err)); setUpdatingId(null) },
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.customer_id) throw new Error('Vui lòng chọn khách hàng')
      if (!form.service_type.trim()) throw new Error('Vui lòng nhập loại dịch vụ')
      if (!form.scheduled_at) throw new Error('Vui lòng chọn thời gian hẹn')
      return maintenanceService.create({
        customer_id: form.customer_id,
        car_id: form.car_id || undefined,
        service_type: form.service_type,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-maintenance'] })
      setShowAdd(false)
      setForm(emptyForm)
      setFormError('')
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const handleStatusChange = (id: string, newStatus: MaintenanceStatus) => {
    const label = maintenanceStatusLabel[newStatus].label
    if (confirm(`Cập nhật trạng thái thành "${label}"?`)) {
      setUpdatingId(id)
      updateMutation.mutate({ id, status: newStatus })
    }
  }

  const items: Maintenance[] = data?.maintenances ?? []
  const pagination = data?.pagination
  const customers = customersData?.users ?? []
  const cars = carsData?.cars ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý bảo dưỡng</h1>
          <p className="text-sm text-neutral-500 mt-1">{pagination?.total ?? 0} lịch bảo dưỡng của khách hàng</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setFormError(''); setShowAdd(true) }} className="btn-primary">
          <Plus size={16} /> Thêm lịch bảo dưỡng
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[['', 'Tất cả'], ...Object.entries(maintenanceStatusLabel).map(([v, s]) => [v, s.label])].map(([v, l]) => (
          <button key={v} onClick={() => { setStatusFilter(v as MaintenanceStatus | ''); setPage(1) }}
            className={`px-4 py-2 text-sm rounded-xl border whitespace-nowrap transition-colors ${statusFilter === v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                {['Khách hàng', 'Xe', 'Dịch vụ', 'Lịch hẹn', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-neutral-400" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Wrench size={32} className="mx-auto mb-2 text-neutral-200" />
                  <p className="text-neutral-400 text-sm">Không có lịch bảo dưỡng nào</p>
                </td></tr>
              ) : items.map(m => {
                const st = maintenanceStatusLabel[m.status]
                const nextStatuses = NEXT_STATUSES[m.status]
                const isUpdating = updatingId === m.id
                return (
                  <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-neutral-900">{m.customer?.full_name || '—'}</p>
                      <p className="text-xs text-neutral-400">{m.customer?.phone || m.customer?.email || ''}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-neutral-800">{m.car ? `${m.car.brand} ${m.car.model}` : '—'}</p>
                      {m.car && <p className="text-xs text-neutral-400">{m.car.year}</p>}
                    </td>
                    <td className="py-3 px-4 text-neutral-700">{m.service_type}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-neutral-800">{new Date(m.scheduled_at).toLocaleDateString('vi-VN')}</p>
                      <p className="text-xs text-neutral-400">{new Date(m.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="py-3 px-4"><span className={`badge ${st.color}`}>{st.label}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetail(m)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors" title="Xem chi tiết">
                          <ChevronRight size={14} />
                        </button>
                        {nextStatuses.map(ns => (
                          <button key={ns} onClick={() => handleStatusChange(m.id, ns)} disabled={isUpdating}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50 ${ns === 'cancelled' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-primary-200 text-primary-700 hover:bg-primary-50'}`}>
                            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : maintenanceStatusLabel[ns].label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">Trang {pagination.page}/{pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Trước</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal thêm lịch bảo dưỡng */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="font-display font-semibold text-neutral-900">Thêm lịch bảo dưỡng</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Khách hàng *</label>
                <select className="select" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Xe (nếu có)</label>
                <select className="select" value={form.car_id} onChange={e => setForm(f => ({ ...f, car_id: e.target.value }))}>
                  <option value="">-- Không chọn xe cụ thể --</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} {c.year}{c.price ? ` · ${formatPrice(c.price)}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Loại dịch vụ *</label>
                <input className="input" placeholder="VD: Bảo dưỡng định kỳ, thay dầu, kiểm tra phanh..."
                  value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Thời gian hẹn *</label>
                <input className="input" type="datetime-local" value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Ghi chú</label>
                <textarea className="input resize-none h-20" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Hủy</button>
                <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Thêm lịch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="font-display font-semibold text-neutral-900">Chi tiết lịch bảo dưỡng</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Row label="Khách hàng" value={detail.customer?.full_name} />
              <Row label="Điện thoại" value={detail.customer?.phone} />
              <Row label="Email" value={detail.customer?.email} />
              <Row label="Xe" value={detail.car ? `${detail.car.brand} ${detail.car.model} ${detail.car.year}` : undefined} />
              <Row label="Dịch vụ" value={detail.service_type} />
              <Row label="Thời gian" value={new Date(detail.scheduled_at).toLocaleString('vi-VN')} />
              <Row label="Trạng thái" value={maintenanceStatusLabel[detail.status].label} />
              <Row label="Chi phí" value={detail.cost ? formatPrice(detail.cost) : undefined} />
              <Row label="Ghi chú" value={detail.notes} />

              {NEXT_STATUSES[detail.status].length > 0 && (
                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400 mb-2">Cập nhật trạng thái:</p>
                  <div className="flex gap-2">
                    {NEXT_STATUSES[detail.status].map(ns => (
                      <button key={ns} onClick={() => handleStatusChange(detail.id, ns)} disabled={updatingId === detail.id}
                        className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${ns === 'cancelled' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'btn-primary text-xs'}`}>
                        {maintenanceStatusLabel[ns].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="text-neutral-400 w-28 shrink-0">{label}</span>
      <span className="text-neutral-900 font-medium">{value || '—'}</span>
    </div>
  )
}