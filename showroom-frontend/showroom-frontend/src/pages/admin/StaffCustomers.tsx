import { FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, Users, Mail, Phone } from 'lucide-react'
import { usersService } from '@/services/users.service'

export default function StaffCustomers() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['staff-customers', search, page],
    queryFn: () => usersService.getCustomers({ search, page, limit: 15 }),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setPage(1)
    setSearch(input.trim())
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý khách hàng</h1>
        <p className="text-sm text-neutral-500 mt-1">{data?.pagination.total ?? 0} khách hàng trong phạm vi phụ trách</p>
      </div>

      <form onSubmit={submit} className="flex gap-2 mb-5 max-w-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input w-full pl-9" value={input} onChange={e => setInput(e.target.value)} placeholder="Tìm theo tên, email hoặc số điện thoại..." />
        </div>
        <button className="btn-primary">Tìm kiếm</button>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100"><tr>{['Khách hàng', 'Liên hệ', 'Đơn hàng', 'Lái thử', 'Bảo dưỡng', 'Ngày tham gia'].map(h => <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-neutral-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? <tr><td colSpan={6} className="py-12"><Loader2 className="animate-spin mx-auto text-primary-600" /></td></tr> :
                data?.customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold">{customer.full_name.charAt(0).toUpperCase()}</div><span className="font-medium text-neutral-900">{customer.full_name}</span></div></td>
                    <td className="py-3 px-4"><p className="flex items-center gap-1.5 text-neutral-700"><Mail size={13} />{customer.email}</p><p className="flex items-center gap-1.5 text-neutral-400 mt-1"><Phone size={13} />{customer.phone || 'Chưa cập nhật'}</p></td>
                    <td className="py-3 px-4 font-medium">{customer._count?.orders_as_customer ?? 0}</td>
                    <td className="py-3 px-4 font-medium">{customer._count?.test_drives ?? 0}</td>
                    <td className="py-3 px-4 font-medium">{customer._count?.maintenances ?? 0}</td>
                    <td className="py-3 px-4 text-neutral-500">{new Date(customer.created_at).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!isLoading && !data?.customers.length && <div className="py-12 text-center"><Users size={32} className="mx-auto text-neutral-200 mb-2"/><p className="text-sm text-neutral-400">Không tìm thấy khách hàng</p></div>}
        </div>
        {data && data.pagination.totalPages > 1 && <Pagination page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <div className="flex items-center justify-between p-4 border-t border-neutral-100"><span className="text-sm text-neutral-500">Trang {page}/{totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Trước</button><button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Sau →</button></div></div>
}
