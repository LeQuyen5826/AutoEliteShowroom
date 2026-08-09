import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/users.service'
import { carsService } from '@/services/cars.service'
import { Loader2, Plus, X, Search, Users, ShieldCheck, UserCircle2 } from 'lucide-react'
import type { Role, User } from '@/types'

const ROLE_LABELS: Record<Role, { label: string; color: string; icon: React.ReactNode }> = {
  customer: { label: 'Khách hàng', color: 'bg-sky-50 text-sky-700', icon: <UserCircle2 size={12} /> },
  staff:    { label: 'Nhân viên',  color: 'bg-violet-50 text-violet-700', icon: <Users size={12} /> },
  admin:    { label: 'Quản trị viên', color: 'bg-amber-50 text-amber-700', icon: <ShieldCheck size={12} /> },
}

const emptyStaffForm = { full_name: '', email: '', password: '', phone: '', branch_id: '' }

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } }
  const fieldErr = e?.response?.data?.errors?.[0]?.msg
  const apiMsg = e?.response?.data?.message
  return fieldErr || apiMsg || (err instanceof Error ? err.message : 'Có lỗi xảy ra')
}

export default function AdminUsers() {
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [staffForm, setStaffForm] = useState(emptyStaffForm)
  const [formError, setFormError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, page],
    queryFn: () => usersService.getAll({ role: roleFilter, page, limit: 15 }),
  })

  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn: carsService.getBranches,
  })

  const branches = branchData ?? []

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!staffForm.full_name.trim()) throw new Error('Vui lòng nhập họ tên')
      if (!staffForm.email.trim()) throw new Error('Vui lòng nhập email')
      if (staffForm.password.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự')
      return usersService.createStaff({
        full_name: staffForm.full_name,
        email: staffForm.email,
        password: staffForm.password,
        phone: staffForm.phone || undefined,
        branch_id: staffForm.branch_id || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setShowAddModal(false)
      setStaffForm(emptyStaffForm)
      setFormError('')
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const users: User[] = data?.users ?? []
  const pagination = data?.pagination

  // Lọc theo search ở phía client (nếu chưa có search API)
  const filtered = search.trim()
    ? users.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users

  const openAddModal = () => {
    setFormError('')
    setStaffForm({ ...emptyStaffForm, branch_id: branches[0]?.id || '' })
    setShowAddModal(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý người dùng</h1>
          <p className="text-sm text-neutral-500 mt-1">{pagination?.total ?? 0} tài khoản trong hệ thống</p>
        </div>
        <button onClick={openAddModal} className="btn-primary shrink-0">
          <Plus size={16} /> Thêm nhân viên
        </button>
      </div>

      {/* Bộ lọc + tìm kiếm */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {(['', 'customer', 'staff', 'admin'] as (Role | '')[]).map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1) }}
              className={`px-4 py-2 text-sm rounded-xl border whitespace-nowrap transition-colors ${roleFilter === r ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
              {r === '' ? 'Tất cả' : ROLE_LABELS[r as Role].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                {['Người dùng', 'Email', 'Số điện thoại', 'Vai trò', 'Chi nhánh', 'Ngày tạo'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto text-neutral-400" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-neutral-400 text-sm">Không tìm thấy người dùng</td></tr>
              ) : filtered.map(user => {
                const role = ROLE_LABELS[user.role]
                return (
                  <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary-700">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-neutral-900">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{user.email}</td>
                    <td className="py-3 px-4 text-neutral-500">{user.phone || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${role.color}`}>
                        {role.icon} {role.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {branches.find((b: { id: string; name: string }) => b.id === user.branch_id)?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">Trang {pagination.page}/{pagination.totalPages} · {pagination.total} người dùng</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Trước</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal thêm nhân viên */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="font-display font-semibold text-neutral-900">Thêm nhân viên bán hàng</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Họ và tên *</label>
                <input className="input" placeholder="Nguyễn Văn A" value={staffForm.full_name}
                  onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email *</label>
                <input className="input" type="email" placeholder="nhanvien@showroom.vn" value={staffForm.email}
                  onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Mật khẩu * (tối thiểu 6 ký tự)</label>
                <input className="input" type="password" placeholder="••••••••" value={staffForm.password}
                  onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Số điện thoại</label>
                <input className="input" placeholder="0901234567" value={staffForm.phone}
                  onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Chi nhánh phụ trách</label>
                <select className="select" value={staffForm.branch_id}
                  onChange={e => setStaffForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">-- Chọn chi nhánh --</option>
                  {branches.map((b: { id: string; name: string }) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-neutral-400">
                Tài khoản được tạo với vai trò <strong>Nhân viên bán hàng</strong>.
                Để thay đổi vai trò, chỉnh sửa trực tiếp trong cơ sở dữ liệu.
              </p>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Hủy</button>
                <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary flex-1">
                  {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  Tạo tài khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
