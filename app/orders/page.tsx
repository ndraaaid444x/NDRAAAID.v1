'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowDownLeft, CheckCircle2, Clock3, XCircle, ReceiptText, WalletCards } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const rupiah = (v: any) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`
const dateText = (v: any) => v ? new Date(v).toLocaleString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'
function statusClass(status: string) {
  const s = String(status || '').toUpperCase()
  if (['SUCCESS','APPROVED','BERHASIL'].includes(s)) return 'text-cyan-300'
  if (['FAILED','REJECTED','GAGAL','CANCELLED','EXPIRED'].includes(s)) return 'text-red-300'
  return 'text-amber-300'
}
function StatusIcon({ status }: { status: string }) {
  const s = String(status || '').toUpperCase()
  if (['SUCCESS','APPROVED','BERHASIL'].includes(s)) return <CheckCircle2 size={13} />
  if (['FAILED','REJECTED','GAGAL','CANCELLED','EXPIRED'].includes(s)) return <XCircle size={13} />
  return <Clock3 size={13} />
}

export default function OrdersPage() {
  const r = useRouter()
  const s = supabaseBrowser()
  const [orders, setOrders] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { user } } = await s.auth.getUser()
    if (!user) { r.push('/login'); return }
    const [o, d] = await Promise.all([
      s.from('orders').select('id,order_code,status,total,created_at,games(name)').eq('user_id', user.id).order('created_at', { ascending:false }).limit(100),
      s.from('member_deposits').select('id,deposit_code,status,amount,created_at,rejection_reason,payment_methods(name)').eq('user_id', user.id).order('created_at', { ascending:false }).limit(100),
    ])
    setOrders(o.data || [])
    setDeposits(d.data || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
    const ch = s.channel('member-history-compact')
      .on('postgres_changes', { event:'*', schema:'public', table:'orders' }, () => void load())
      .on('postgres_changes', { event:'*', schema:'public', table:'member_deposits' }, () => void load())
      .subscribe()
    return () => { void s.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const Row = ({ children }: { children: React.ReactNode }) => <div className="glass rounded-xl border border-white/[.07] px-3.5 py-3 md:px-4 md:py-3.5">{children}</div>

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
      <div className="mb-5">
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Riwayat Transaksi</h1>
        <p className="mt-1 text-sm text-slate-500">Deposit saldo dan transaksi order dalam satu halaman.</p>
      </div>

      {loading && <div className="glass rounded-xl p-4 text-sm text-slate-500">Memuat riwayat...</div>}

      {!loading && <div className="grid gap-7 lg:grid-cols-2 lg:items-start">
        <section>
          <div className="mb-2.5 flex items-center gap-2"><WalletCards size={16} className="text-cyan-300" /><h2 className="text-sm font-black uppercase tracking-[.12em] text-white">Riwayat Deposit</h2><span className="text-[10px] text-slate-600">{deposits.length}</span></div>
          <div className="space-y-2">
            {deposits.map(d => <Row key={d.id}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-white">{d.deposit_code || 'Deposit Saldo'}</b><p className="mt-0.5 text-[11px] text-slate-600">{d.payment_methods?.name || 'Deposit Saldo'} · {dateText(d.created_at)}</p></div><div className="shrink-0 text-right"><b className="text-sm text-cyan-300">+ {rupiah(d.amount)}</b><p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${statusClass(d.status)}`}><StatusIcon status={d.status} />{d.status}</p></div></div></Row>)}
            {!deposits.length && <div className="rounded-xl border border-dashed border-white/[.07] p-4 text-xs text-slate-600">Belum ada riwayat deposit.</div>}
          </div>
        </section>

        <section>
          <div className="mb-2.5 flex items-center gap-2"><ReceiptText size={16} className="text-red-300" /><h2 className="text-sm font-black uppercase tracking-[.12em] text-white">Riwayat Transaksi Order</h2><span className="text-[10px] text-slate-600">{orders.length}</span></div>
          <div className="space-y-2">
            {orders.map(o => <Link key={o.id} href={`/order/?id=${encodeURIComponent(o.id)}`}><Row><div className="flex items-center justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-white">{o.games?.name || 'Order'}</b><p className="mt-0.5 text-[11px] text-slate-600">{o.order_code} · {dateText(o.created_at)}</p></div><div className="shrink-0 text-right"><b className="text-sm text-white">{rupiah(o.total)}</b><p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${statusClass(o.status)}`}><StatusIcon status={o.status} />{o.status}</p></div></div></Row></Link>)}
            {!orders.length && <div className="rounded-xl border border-dashed border-white/[.07] p-4 text-xs text-slate-600">Belum ada transaksi order.</div>}
          </div>
        </section>
      </div>}

      <div className="mt-6 flex items-center justify-between rounded-xl border border-white/[.06] bg-white/[.015] px-3.5 py-3 text-[11px] text-slate-600">
        <span>Riwayat diperbarui otomatis.</span><Link href="/dashboard" className="text-cyan-300 hover:text-white">Kembali ke Dashboard →</Link>
      </div>
    </main>
  )
}
