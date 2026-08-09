import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { carsService } from '@/services/cars.service'
import { formatPrice, carStatusLabel, carConditionLabel } from '@/utils'
import { Plus, Pencil, Trash2, Loader2, X, Car, Image as ImageIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Car as CarType } from '@/types'

const FUEL_TYPES = ['Xăng', 'Dầu', 'Điện', 'Hybrid']
const TRANSMISSIONS = ['Tự động', 'Số sàn']
const STATUSES = ['available', 'reserved', 'sold']
const CONDITIONS = ['new_car', 'used_car']

type SpecRow = { key: string; value: string }

const emptyForm = {
  brand: '', model: '', year: new Date().getFullYear(), price: '',
  fuel_type: 'Xăng', transmission: 'Tự động', status: 'available',
  condition: 'new_car', description: '', mileage: '0', branch_id: '',
}

function specsToRows(specs?: Record<string, unknown>): SpecRow[] {
  if (!specs) return []
  return Object.entries(specs).map(([key, value]) => ({ key, value: String(value) }))
}

function rowsToSpecs(rows: SpecRow[]): Record<string, string> {
  const specs: Record<string, string> = {}
  rows.forEach(r => { if (r.key.trim()) specs[r.key.trim()] = r.value })
  return specs
}

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string; errors?: { msg: string }[] } } }
  const apiMsg = e?.response?.data?.message
  const fieldErr = e?.response?.data?.errors?.[0]?.msg
  return fieldErr || apiMsg || (err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại')
}

export default function AdminInventory() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<CarType | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [specRows, setSpecRows] = useState<SpecRow[]>([])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [formError, setFormError] = useState('')

  const { data: branchData, isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: carsService.getBranches,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['cars-admin', page, status],
    queryFn: () => carsService.getAll({ page, limit: 10, status: (status || undefined) as import('@/types').CarStatus | undefined }),
  })

  const cars = data?.cars ?? []
  const pagination = data?.pagination
  const branches = branchData ?? []

  const openAdd = () => {
    setFormError('')
    setForm({ ...emptyForm, branch_id: branches[0]?.id || '' })
    setSpecRows([])
    setEditing(null)
    setModal('add')
  }

  const openEdit = (car: CarType) => {
    setFormError('')
    setForm({
      brand: car.brand, model: car.model, year: car.year,
      price: String(car.price), fuel_type: car.fuel_type,
      transmission: car.transmission, status: car.status,
      condition: car.condition || 'new_car',
      description: car.description || '', mileage: String(car.mileage || 0),
      branch_id: car.branch_id,
    })
    setSpecRows(specsToRows(car.specs))
    setEditing(car)
    setModal('edit')
  }

  // Dùng chung carsService (axios) thay vì fetch() thô:
  // - tự gắn Authorization header, tự refresh token khi hết hạn
  // - tự throw lỗi khi response 4xx/5xx -> bắt được lỗi & hiển thị cho người dùng
  //   (trước đây fetch() không throw nên dù thêm xe thất bại modal vẫn đóng như thành công)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.branch_id) throw new Error('Vui lòng chọn chi nhánh')
      if (!form.brand.trim() || !form.model.trim()) throw new Error('Vui lòng nhập đầy đủ hãng xe và model')
      if (!form.price || Number(form.price) <= 0) throw new Error('Vui lòng nhập giá xe hợp lệ')

      const payload = {
        ...form,
        year: Number(form.year),
        price: Number(form.price),
        mileage: Number(form.mileage),
        specs: rowsToSpecs(specRows),
      }

      if (modal === 'add') {
        return carsService.create(payload)
      }
      return carsService.update(editing!.id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cars-admin'] })
      setModal(null)
      setFormError('')
    },
    onError: (err) => {
      setFormError(getErrorMessage(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => carsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cars-admin'] }),
    onError: (err) => alert(getErrorMessage(err)),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý tồn kho</h1>
          <p className="text-sm text-neutral-500 mt-1">{pagination?.total ?? 0} xe trong hệ thống</p>
        </div>
        <button onClick={openAdd} className="btn-primary" disabled={loadingBranches}>
          <Plus size={16} /> Thêm xe
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[{ v: '', l: 'Tất cả' }, ...STATUSES.map(s => ({ v: s, l: carStatusLabel[s]?.label || s }))].map(opt => (
          <button key={opt.v} onClick={() => { setStatus(opt.v); setPage(1) }}
            className={`px-4 py-2 text-sm rounded-xl border whitespace-nowrap transition-colors ${status === opt.v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300'}`}>
            {opt.l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                {['Xe', 'Chi nhánh', 'Giá', 'Tình trạng', 'Trạng thái', 'Năm', 'Thao tác'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-neutral-400" /></td></tr>
              ) : cars.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-400 text-sm">Không có xe nào</td></tr>
              ) : cars.map(car => {
                const st = carStatusLabel[car.status]
                const cond = carConditionLabel[car.condition] || carConditionLabel.new_car
                return (
                  <tr key={car.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-8 bg-neutral-100 rounded-lg overflow-hidden shrink-0">
                          {car.images?.[0]?.url
                            ? <img src={car.images[0].url} alt="" className="w-full h-full object-cover" />
                            : <Car size={14} className="m-auto mt-1 text-neutral-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{car.brand} {car.model}</p>
                          <p className="text-xs text-neutral-400">{car.fuel_type} · {car.transmission}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{car.branch?.name || '—'}</td>
                    <td className="py-3 px-4 font-medium text-neutral-900">{formatPrice(car.price)}</td>
                    <td className="py-3 px-4"><span className={`badge ${cond.color}`}>{cond.label}</span></td>
                    <td className="py-3 px-4"><span className={`badge ${st.color}`}>{st.label}</span></td>
                    <td className="py-3 px-4 text-neutral-600">{car.year}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/car-images?carId=${car.id}`} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors" title="Quản lý ảnh">
                          <ImageIcon size={14} />
                        </Link>
                        <button onClick={() => openEdit(car)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm('Xóa xe này?')) deleteMutation.mutate(car.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
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
            <p className="text-sm text-neutral-500">Trang {pagination.page}/{pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Trước</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Sau →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal thêm/sửa xe */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h2 className="font-display font-semibold text-neutral-900">{modal === 'add' ? 'Thêm xe mới' : 'Chỉnh sửa xe'}</h2>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {formError}
                </div>
              )}

              {branches.length === 0 && (
                <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                  Chưa có chi nhánh nào trong hệ thống — vui lòng tạo chi nhánh trước khi thêm xe.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Hãng xe *</label>
                  <input className="input" placeholder="Toyota" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Model *</label>
                  <input className="input" placeholder="Camry" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Năm SX *</label>
                  <input className="input" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Giá (VNĐ) *</label>
                  <input className="input" type="number" placeholder="1000000000" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nhiên liệu</label>
                  <select className="select" value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))}>
                    {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Hộp số</label>
                  <select className="select" value={form.transmission} onChange={e => setForm(f => ({ ...f, transmission: e.target.value }))}>
                    {TRANSMISSIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Trạng thái</label>
                  <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{carStatusLabel[s]?.label || s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Tình trạng xe *</label>
                  <select className="select" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{carConditionLabel[c]?.label || c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Chi nhánh *</label>
                <select className="select" value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))}>
                  <option value="">-- Chọn chi nhánh --</option>
                  {branches.map((b: { id: string; name: string }) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Số km đã đi</label>
                <input className="input" type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} />
              </div>

              {/* Thông số kỹ thuật */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-neutral-700">Thông số kỹ thuật</label>
                  <button type="button" onClick={() => setSpecRows(rows => [...rows, { key: '', value: '' }])}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Thêm thông số
                  </button>
                </div>
                {specRows.length === 0 ? (
                  <p className="text-xs text-neutral-400">Chưa có thông số nào. Ví dụ: động cơ, công suất, số chỗ ngồi, màu sắc...</p>
                ) : (
                  <div className="space-y-2">
                    {specRows.map((row, i) => (
                      <div key={i} className="flex gap-2">
                        <input className="input text-sm flex-1" placeholder="Tên (vd: engine)" value={row.key}
                          onChange={e => setSpecRows(rows => rows.map((r, idx) => idx === i ? { ...r, key: e.target.value } : r))} />
                        <input className="input text-sm flex-1" placeholder="Giá trị (vd: 2.5L 4-cylinder)" value={row.value}
                          onChange={e => setSpecRows(rows => rows.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))} />
                        <button type="button" onClick={() => setSpecRows(rows => rows.filter((_, idx) => idx !== i))}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Mô tả</label>
                <textarea className="input resize-none h-20" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Hủy</button>
                <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary flex-1">
                  {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  {modal === 'add' ? 'Thêm xe' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}