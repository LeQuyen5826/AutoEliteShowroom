import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { testDrivesService } from '@/services/orders.service'
import { Loader2, CalendarCheck, X, ChevronRight } from 'lucide-react'
import type { TestDrive, TestDriveStatus } from '@/types'

const STATUS_MAP: Record<TestDriveStatus, { label: string; color: string }> = {
  pending:   { label: 'Chờ xác nhận', color: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Đã xác nhận',  color: 'bg-blue-50 text-blue-700' },
  done:      { label: 'Hoàn tất',     color: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Đã hủy',       color: 'bg-neutral-100 text-neutral-500' },
}

const NEXT_STATUSES: Record<TestDriveStatus, TestDriveStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['done', 'cancelled'],
  done:      [],
  cancelled: [],
}

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message || (err instanceof Error ? err.message : 'Có lỗi xảy ra')
}

export default function AdminTestDrives() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<TestDriveStatus | ''>('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<TestDrive | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-test-drives', statusFilter, page],
    queryFn: () => testDrivesService.getAll({ status: statusFilter || undefined, page, limit: 12 }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      testDrivesService.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-test-drives'] })
      setUpdatingId(null)
      // Cập nhật detail nếu đang mở
      if (detail) setDetail(null)
    },
    onError: (err) => {
      alert(getErrorMessage(err))
      setUpdatingId(null)
    },
  })

  const handleStatusChange = (id: string, newStatus: TestDriveStatus) => {
    const label = STATUS_MAP[newStatus].label
    if (confirm(`Cập nhật trạng thái thành "${label}"?`)) {
      setUpdatingId(id)
      updateMutation.mutate({ id, status: newStatus })
    }
  }

  const testDrives: TestDrive[] = data?.testDrives ?? []
  const pagination = data?.pagination

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý lái thử xe</h1>
          <p className="text-sm text-neutral-500 mt-1">{pagination?.total ?? 0} lịch đặt</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {([['', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['done', 'Hoàn tất'], ['cancelled', 'Đã hủy']] as [string, string][]).map(([v, l]) => (
          <button key={v} onClick={() => { setStatusFilter(v as TestDriveStatus | ''); setPage(1) }}
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
                {['Khách hàng', 'Xe', 'Lịch hẹn', 'Trạng thái', 'Ghi chú', 'Thao tác'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto text-neutral-400" />
                </td></tr>
              ) : testDrives.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <CalendarCheck size={32} className="mx-auto mb-2 text-neutral-200" />
                  <p className="text-neutral-400 text-sm">Không có lịch lái thử nào</p>
                </td></tr>
              ) : testDrives.map(td => {
                const st = STATUS_MAP[td.status]
                const nextStatuses = NEXT_STATUSES[td.status]
                const isUpdating = updatingId === td.id

                return (
                  <tr key={td.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-neutral-900">{td.customer?.full_name || '—'}</p>
                        <p className="text-xs text-neutral-400">{td.customer?.phone || td.customer?.email || ''}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-neutral-800">
                        {td.car ? `${td.car.brand} ${td.car.model}` : '—'}
                      </p>
                      {td.car && <p className="text-xs text-neutral-400">{td.car.year}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-neutral-800">
                        {new Date(td.scheduled_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {new Date(td.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500 max-w-[160px] truncate">
                      {td.notes || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {/* Nút chi tiết */}
                        <button onClick={() => setDetail(td)}
                          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
                          title="Xem chi tiết">
                          <ChevronRight size={14} />
                        </button>

                        {/* Nút chuyển trạng thái */}
                        {nextStatuses.map(ns => (
                          <button key={ns} onClick={() => handleStatusChange(td.id, ns)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50 ${
                              ns === 'cancelled'
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-primary-200 text-primary-700 hover:bg-primary-50'
                            }`}>
                            {isUpdating ? <Loader2 size={10} className="animate-spin" /> : STATUS_MAP[ns].label}
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

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="font-display font-semibold text-neutral-900">Chi tiết lịch lái thử</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <Row label="Khách hàng" value={detail.customer?.full_name} />
              <Row label="Email" value={detail.customer?.email} />
              <Row label="Số điện thoại" value={detail.customer?.phone} />
              <Row label="Xe" value={detail.car ? `${detail.car.brand} ${detail.car.model} ${detail.car.year}` : undefined} />
              <Row label="Thời gian" value={new Date(detail.scheduled_at).toLocaleString('vi-VN')} />
              <Row label="Trạng thái" value={STATUS_MAP[detail.status].label} />
              <Row label="Ghi chú" value={detail.notes} />

              {/* Thay đổi trạng thái từ modal */}
              {NEXT_STATUSES[detail.status].length > 0 && (
                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-xs text-neutral-400 mb-2">Cập nhật trạng thái:</p>
                  <div className="flex gap-2">
                    {NEXT_STATUSES[detail.status].map(ns => (
                      <button key={ns} onClick={() => handleStatusChange(detail.id, ns)}
                        disabled={updatingId === detail.id}
                        className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                          ns === 'cancelled'
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'btn-primary text-xs'
                        }`}>
                        {STATUS_MAP[ns].label}
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
      <span className="text-neutral-400 w-32 shrink-0">{label}</span>
      <span className="text-neutral-900 font-medium">{value || '—'}</span>
    </div>
  )
}
