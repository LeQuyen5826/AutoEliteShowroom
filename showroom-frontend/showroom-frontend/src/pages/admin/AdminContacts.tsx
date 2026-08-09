import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, Phone, MessageSquareText } from 'lucide-react'
import { contactsService } from '@/services/contacts.service'
import type { ContactStatus } from '@/types'

const STATUS: Record<ContactStatus, { label: string; color: string }> = {
  new: { label: 'Mới', color: 'bg-blue-50 text-blue-700' },
  contacted: { label: 'Đã liên hệ', color: 'bg-amber-50 text-amber-700' },
  closed: { label: 'Đã xử lý', color: 'bg-emerald-50 text-emerald-700' },
}

export default function AdminContacts() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<ContactStatus | ''>('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['managed-contacts', status, page],
    queryFn: () => contactsService.getAll({ status, page, limit: 12 }),
  })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) => contactsService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['managed-contacts'] }),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6"><h1 className="font-display font-bold text-2xl text-neutral-900">Quản lý liên hệ</h1><p className="text-sm text-neutral-500 mt-1">Theo dõi {data?.pagination.total ?? 0} yêu cầu tư vấn</p></div>
      <div className="flex gap-2 mb-5 overflow-x-auto">{([['','Tất cả'],['new','Mới'],['contacted','Đã liên hệ'],['closed','Đã xử lý']] as [ContactStatus | '', string][]).map(([value,label]) => <button key={value} onClick={() => { setStatus(value); setPage(1) }} className={`px-4 py-2 rounded-xl border text-sm whitespace-nowrap ${status === value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-neutral-200 text-neutral-600'}`}>{label}</button>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading && <div className="card py-12 lg:col-span-2"><Loader2 className="animate-spin mx-auto text-primary-600" /></div>}
        {data?.leads.map(lead => (
          <article key={lead.id} className="card p-5">
            <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="font-semibold text-neutral-900">{lead.name}</h2><p className="text-xs text-neutral-400 mt-0.5">{new Date(lead.created_at).toLocaleString('vi-VN')}</p></div><span className={`badge ${STATUS[lead.status].color}`}>{STATUS[lead.status].label}</span></div>
            <div className="space-y-1.5 text-sm mb-4"><a className="flex items-center gap-2 text-primary-700 hover:underline" href={`mailto:${lead.email}`}><Mail size={14}/>{lead.email}</a><a className="flex items-center gap-2 text-neutral-600 hover:underline" href={`tel:${lead.phone || ''}`}><Phone size={14}/>{lead.phone || 'Chưa cung cấp'}</a></div>
            {lead.subject && <p className="text-sm font-medium text-neutral-800 mb-1">{lead.subject}</p>}
            <p className="text-sm text-neutral-600 bg-neutral-50 rounded-xl p-3 min-h-20 whitespace-pre-wrap"><MessageSquareText size={14} className="inline mr-1 text-neutral-400" />{lead.message}</p>
            <div className="mt-4 flex items-center gap-2"><label className="text-xs text-neutral-400">Cập nhật:</label><select disabled={update.isPending} value={lead.status} onChange={e => update.mutate({ id: lead.id, status: e.target.value as ContactStatus })} className="input py-2 text-sm flex-1"><option value="new">Mới</option><option value="contacted">Đã liên hệ</option><option value="closed">Đã xử lý</option></select></div>
          </article>
        ))}
        {!isLoading && !data?.leads.length && <div className="card py-12 text-center text-sm text-neutral-400 lg:col-span-2">Không có yêu cầu liên hệ phù hợp</div>}
      </div>
      {data && data.pagination.totalPages > 1 && <div className="flex justify-end gap-2 mt-4"><button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button><button className="btn-secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Sau →</button></div>}
    </div>
  )
}
