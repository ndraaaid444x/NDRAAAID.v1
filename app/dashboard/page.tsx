'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { LayoutDashboard, Home, Gamepad2, WalletCards, ReceiptText, CircleHelp, UserRound, Bell, LogOut, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react'

const rupiah = (v:any) => `Rp ${Number(v || 0).toLocaleString('id-ID')}`
const dateText = (v:any) => v ? new Date(v).toLocaleString('id-ID', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'

const menu = [
  ['/','Home',Home],
  ['/games','Games',Gamepad2],
  ['/deposit','Deposit Saldo',WalletCards],
  ['/orders','Transaksi',ReceiptText],
  ['/terms','Bantuan',CircleHelp],
  ['/dashboard','Dashboard',LayoutDashboard],
  ['/account','Profile',UserRound],
  ['/notifications','Notifikasi',Bell],
]

export default function Dashboard() {
  const r = useRouter()
  const s = supabaseBrowser()
  const [p,setP] = useState<any>(null)
  const [balance,setBalance] = useState(0)
  const [orders,setOrders] = useState<any[]>([])
  const [deposits,setDeposits] = useState<any[]>([])
  const [loading,setLoading] = useState(true)

  async function load() {
    const { data:{user} } = await s.auth.getUser()
    if(!user){ r.push('/login'); return }
    const [{data:profile},{data:wallet},{data:o},{data:d}] = await Promise.all([
      s.from('profiles').select('name,username,role,is_suspended').eq('id',user.id).single(),
      s.from('wallets').select('balance,reserved_balance').eq('user_id',user.id).maybeSingle(),
      s.from('orders').select('id,order_code,status,total,created_at,games(name)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5),
      s.from('member_deposits').select('id,deposit_code,status,amount,created_at,payment_methods(name)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5),
    ])
    setP(profile || null)
    setBalance(Math.max(0,Number(wallet?.balance || 0)-Number(wallet?.reserved_balance || 0)))
    setOrders(o || [])
    setDeposits(d || [])
    setLoading(false)
  }

  useEffect(()=>{ void load() },[])

  const total = orders.length
  const success = orders.filter(x=>x.status==='SUCCESS').length
  const pending = orders.filter(x=>['PENDING_PAYMENT','PAYMENT_RECEIVED','PROCESSING'].includes(x.status)).length

  if(loading) return <main className="mx-auto max-w-5xl px-4 py-10"><div className="glass rounded-xl p-6 text-center text-sm text-slate-500">Memuat Dashboard...</div></main>

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
      <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">Dashboard Akun</p><h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">Halo, {p?.name || p?.username || 'Gamer'} 👋</h1><p className="mt-1 text-sm text-slate-500">Kelola akun dan pantau aktivitasmu.</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-widest text-slate-600">Saldo</p><b className="text-lg text-red-300">{rupiah(balance)}</b></div></div>

      <section className="glass rounded-2xl border border-red-500/10 p-3"><div className="mb-2 px-1 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">Menu Akun</div><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{menu.map(([href,label,Icon]:any)=><Link key={label} href={href} className="flex items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.018] px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-red-500/25 hover:bg-red-500/[.05] hover:text-white"><Icon size={15} className="text-red-400"/>{label}</Link>)}<button onClick={async()=>{await s.auth.signOut({scope:'local'});window.location.replace('/')}} className="flex items-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[.025] px-3 py-2.5 text-left text-xs font-black text-red-300 hover:bg-red-500/[.06]"><LogOut size={15}/>Logout</button></div></section>

      <section className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {[['Total Transaksi',total,'text-white'],['Berhasil',success,'text-cyan-300'],['Pending',pending,'text-amber-300'],['Saldo',rupiah(balance),'text-red-300'],['Role',p?.role || 'user','text-white'],['Status Akun',p?.is_suspended?'Suspended':'Aktif',p?.is_suspended?'text-red-300':'text-cyan-300']].map(([label,value,color]:any)=><div key={label} className="glass rounded-xl border border-white/[.06] px-3.5 py-3"><p className="text-[10px] text-slate-600">{label}</p><b className={`mt-1 block truncate text-sm ${color}`}>{value}</b></div>)}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-[.12em] text-white">Riwayat Deposit</h2><Link href="/orders" className="text-[10px] text-slate-600 hover:text-cyan-300">Lihat semua →</Link></div><div className="space-y-2">{deposits.map(d=><Link href="/orders" key={d.id} className="glass block rounded-xl border border-white/[.06] px-3.5 py-3"><div className="flex items-center justify-between gap-3"><div><b className="text-xs text-white">{d.deposit_code || 'Deposit Saldo'}</b><p className="mt-0.5 text-[10px] text-slate-600">{d.payment_methods?.name || 'Deposit Saldo'} · {dateText(d.created_at)}</p></div><div className="text-right"><b className="text-xs text-cyan-300">+ {rupiah(d.amount)}</b><p className="mt-0.5 text-[10px] text-slate-600">{d.status}</p></div></div></Link>)}{!deposits.length&&<div className="glass rounded-xl p-4 text-xs text-slate-600">Belum ada deposit.</div>}</div></div>

        <div><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-[.12em] text-white">Transaksi Order</h2><Link href="/orders" className="text-[10px] text-slate-600 hover:text-cyan-300">Lihat semua →</Link></div><div className="space-y-2">{orders.map(o=><Link href={`/order/?id=${encodeURIComponent(o.id)}`} key={o.id} className="glass block rounded-xl border border-white/[.06] px-3.5 py-3"><div className="flex items-center justify-between gap-3"><div><b className="text-xs text-white">{o.games?.name || 'Order'}</b><p className="mt-0.5 text-[10px] text-slate-600">{o.order_code} · {dateText(o.created_at)}</p></div><div className="text-right"><b className="text-xs text-white">{rupiah(o.total)}</b><p className="mt-0.5 text-[10px] text-cyan-300">{o.status}</p></div></div></Link>)}{!orders.length&&<div className="glass rounded-xl p-4 text-xs text-slate-600">Belum ada transaksi.</div>}</div></div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2"><Link href="/deposit" className="rounded-xl border border-red-500/25 bg-red-500/[.06] px-4 py-2.5 text-xs font-black text-red-300 hover:bg-red-500/[.1]">Deposit Saldo</Link><Link href="/orders" className="rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white">Riwayat Transaksi</Link></div>
    </main>
  )
}
