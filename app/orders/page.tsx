'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  ReceiptText,
  XCircle,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

function formatRupiah(value: number | string | null | undefined) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClass(status: string) {
  const value = String(status || '').toUpperCase()
  if (['SUCCESS', 'APPROVED', 'BERHASIL'].includes(value)) {
    return 'border-cyan-400/15 bg-cyan-400/[.07] text-cyan-300'
  }
  if (['FAILED', 'REJECTED', 'GAGAL', 'CANCELLED', 'EXPIRED'].includes(value)) {
    return 'border-red-400/15 bg-red-400/[.07] text-red-300'
  }
  return 'border-amber-400/15 bg-amber-400/[.07] text-amber-300'
}

function StatusIcon({ status }: { status: string }) {
  const value = String(status || '').toUpperCase()
  if (['SUCCESS', 'APPROVED', 'BERHASIL'].includes(value)) {
    return <CheckCircle2 className="h-3.5 w-3.5" />
  }
  if (['FAILED', 'REJECTED', 'GAGAL', 'CANCELLED', 'EXPIRED'].includes(value)) {
    return <XCircle className="h-3.5 w-3.5" />
  }
  return <Clock3 className="h-3.5 w-3.5" />
}

export default function OrdersPageCompact() {
  const supabase = supabaseBrowser()
  const [orders, setOrders] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadHistory() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!user) {
        setOrders([])
        setDeposits([])
        setError('Silakan masuk untuk melihat riwayat transaksi.')
        return
      }

      const [ordersResult, depositsResult] = await Promise.all([
        supabase
          .from('orders')
          .select(
            'id,order_code,status,total,created_at,games(name)'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('member_deposits')
          .select(
            'id,deposit_code,status,amount,created_at,rejection_reason,payment_methods(name)'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (ordersResult.error) throw ordersResult.error
      if (depositsResult.error) throw depositsResult.error

      setOrders(ordersResult.data || [])
      setDeposits(depositsResult.data || [])
    } catch (err: any) {
      console.error('Gagal memuat riwayat transaksi:', err)
      setError(err?.message || 'Riwayat transaksi gagal dimuat.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()

    const channel = supabase
      .channel('member-history-compact')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadHistory()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'member_deposits' },
        () => loadHistory()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // Supabase client is stable for the lifetime of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen bg-[#050609] text-white">
      <header className="sticky top-0 z-40 border-b border-red-500/15 bg-[#07070a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-black tracking-tight">
            NDRA<span className="text-red-500">AAID</span><span className="text-slate-400">.v1</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-semibold text-slate-300"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={loadHistory}
              className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-semibold text-slate-300"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-7 sm:px-6">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-300">AKUN</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Riwayat Transaksi</h1>
              <p className="mt-1 text-xs text-slate-500">Deposit dan transaksi order dipisahkan agar lebih mudah dibaca.</p>
            </div>
            <span className="hidden rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[10px] text-slate-500 sm:inline-flex">
              {orders.length + deposits.length} aktivitas
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/15 bg-red-400/[.05] px-3 py-2.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* RIWAYAT DEPOSIT */}
        <section className="mb-5 overflow-hidden rounded-2xl border border-white/[.08] bg-[#0a0a0f]/85">
          <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/[.08] text-emerald-300">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Riwayat Deposit</h2>
                <p className="text-[10px] text-slate-600">Deposit saldo akun</p>
              </div>
            </div>
            <span className="text-[10px] text-slate-600">{deposits.length}</span>
          </div>

          <div className="divide-y divide-white/[.05]">
            {loading && !deposits.length ? (
              <div className="px-4 py-5 text-xs text-slate-600">Memuat riwayat deposit...</div>
            ) : deposits.length ? (
              deposits.map((deposit) => (
                <div key={deposit.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/[.06] text-emerald-300">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-200">
                      {deposit.deposit_code || 'Deposit Saldo'}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-600">
                      {deposit.payment_methods?.name || 'Deposit Saldo'} · {formatDate(deposit.created_at)}
                    </p>
                    {deposit.rejection_reason && (
                      <p className="mt-1 truncate text-[10px] text-red-300/80">{deposit.rejection_reason}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black text-emerald-300">+ {formatRupiah(deposit.amount)}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusClass(deposit.status)}`}>
                      <StatusIcon status={deposit.status} />
                      {deposit.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-5 text-xs text-slate-600">Belum ada riwayat deposit.</div>
            )}
          </div>
        </section>

        {/* RIWAYAT TRANSAKSI ORDER */}
        <section className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#0a0a0f]/85">
          <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/[.08] text-cyan-300">
                <ReceiptText className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Riwayat Transaksi Order</h2>
                <p className="text-[10px] text-slate-600">Pembelian game dan produk</p>
              </div>
            </div>
            <span className="text-[10px] text-slate-600">{orders.length}</span>
          </div>

          <div className="divide-y divide-white/[.05]">
            {loading && !orders.length ? (
              <div className="px-4 py-5 text-xs text-slate-600">Memuat riwayat order...</div>
            ) : orders.length ? (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/[.06] text-cyan-300">
                    <History className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-200">{order.order_code}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-600">
                      {order.games?.name || 'Game'} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black text-white">{formatRupiah(order.total)}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusClass(order.status)}`}>
                      <StatusIcon status={order.status} />
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-5 text-xs text-slate-600">Belum ada transaksi order.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
