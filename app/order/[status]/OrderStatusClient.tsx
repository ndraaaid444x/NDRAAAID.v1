'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import PaymentProof from '@/components/payment-proof'

const statusInfo: Record<string, { label: string; color: string; icon: string }> = {
  PENDING_PAYMENT: { label: 'Menunggu Pembayaran', color: 'text-amber-300', icon: '⏳' },
  PAYMENT_RECEIVED: { label: 'Pembayaran Diterima', color: 'text-cyan-300', icon: '✓' },
  PROCESSING: { label: 'Sedang Diproses', color: 'text-purple-300', icon: '⚙️' },
  SUCCESS: { label: 'Berhasil', color: 'text-emerald-300', icon: '✓' },
  FAILED: { label: 'Gagal', color: 'text-rose-300', icon: '✕' },
  CANCELLED: { label: 'Dibatalkan', color: 'text-slate-300', icon: '✕' },
  EXPIRED: { label: 'Kedaluwarsa', color: 'text-orange-300', icon: '⌛' },
  REFUNDED: { label: 'Dana Dikembalikan', color: 'text-blue-300', icon: '↩' },
}

const slugStatus: Record<string, string> = {
  'menunggu-pembayaran': 'PENDING_PAYMENT',
  'pembayaran-diterima': 'PAYMENT_RECEIVED',
  'sedang-diproses': 'PROCESSING',
  berhasil: 'SUCCESS',
  gagal: 'FAILED',
  dibatalkan: 'CANCELLED',
  kedaluwarsa: 'EXPIRED',
  dikembalikan: 'REFUNDED',
}

const statusSlug: Record<string, string> = Object.fromEntries(
  Object.entries(slugStatus).map(([slug, status]) => [status, slug])
)

const labels: Record<string, string> = Object.fromEntries(
  Object.entries(statusInfo).map(([key, value]) => [key, value.label])
)

export default function OrderStatusClient() {
  const router = useRouter()
  const params = useParams<{ status: string }>()
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const routeStatus = slugStatus[params.status || ''] || ''

  const [o, setO] = useState<any>(null)
  const [payment, setPayment] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [proof, setProof] = useState<any>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (first = false) => {
    if (!id) {
      router.replace('/orders')
      return
    }

    const s = supabaseBrowser()
    const {
      data: { user },
    } = await s.auth.getUser()

    if (!user) {
      router.replace(`/login?next=/order/${encodeURIComponent(params.status || '')}?id=${encodeURIComponent(id)}`)
      return
    }

    const { data: order } = await s
      .from('orders')
      .select('*,games(name),order_items(*)')
      .eq('id', id)
      .single()

    if (!order) {
      router.replace('/orders')
      return
    }

    if (order.user_id !== user.id) {
      const { data: profile } = await s
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!['owner', 'admin'].includes(profile?.role)) {
        router.replace('/orders')
        return
      }
    }

    if (order.status !== routeStatus) {
      router.replace(`/order/${statusSlug[order.status] || 'menunggu-pembayaran'}?id=${encodeURIComponent(id)}`)
      return
    }

    const [{ data: paymentRow }, { data: hist }, { data: proofs }] = await Promise.all([
      s.from('payments').select('*').eq('order_id', id).maybeSingle(),
      s.from('order_status_history').select('*').eq('order_id', id).order('created_at'),
      s.from('payment_proofs').select('*').eq('order_id', id).order('created_at', { ascending: false }).limit(1),
    ])

    let method = null
    if (paymentRow?.payment_method_id) {
      const { data } = await s.from('payment_methods').select('*').eq('id', paymentRow.payment_method_id).maybeSingle()
      method = data
    }

    const latestProof = proofs?.[0] || null
    let signedUrl = ''
    if (latestProof?.storage_path) {
      const { data } = await s.storage.from('payment-proofs').createSignedUrl(latestProof.storage_path, 900)
      signedUrl = data?.signedUrl || ''
    }

    setO(order)
    setPayment(paymentRow)
    setPaymentMethod(method)
    setHistory(hist || [])
    setProof(latestProof)
    setProofUrl(signedUrl)
    if (first) setLoading(false)
  }, [id, params.status, routeStatus, router])

  // Realtime memperbarui Buyer segera setelah Admin mengubah status.
  // Polling 3 detik tetap dipertahankan sebagai fallback jika koneksi Realtime terputus.
  useEffect(() => {
    if (!id) return

    const s = supabaseBrowser()
    const channel = s
      .channel(`order-status-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const nextStatus = String((payload.new as any)?.status || '')
          if (nextStatus && nextStatus !== routeStatus) {
            router.replace(
              `/order/${statusSlug[nextStatus] || 'menunggu-pembayaran'}?id=${encodeURIComponent(id)}`
            )
            return
          }
          load(false)
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[NDRAAAID Realtime] SUBSCRIBED', {
            channel: `order-status-${id}`,
            orderId: id,
          })
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[NDRAAAID Realtime] CHANNEL_ERROR', err)
        } else if (status === 'TIMED_OUT') {
          console.error('[NDRAAAID Realtime] TIMED_OUT', err)
        } else if (status === 'CLOSED') {
          console.warn('[NDRAAAID Realtime] CLOSED')
        }
      })

    return () => {
      void s.removeChannel(channel)
    }
  }, [id, routeStatus, router, load])

  useEffect(() => {
    load(true)
    const timer = window.setInterval(() => load(false), 3000)
    return () => window.clearInterval(timer)
  }, [load])

  const paymentMethodIsQris = useMemo(
    () =>
      String(paymentMethod?.kind || '').trim().toUpperCase() === 'QRIS' ||
      String(paymentMethod?.name || '').trim().toLowerCase().includes('qris'),
    [paymentMethod]
  )

  if (loading || !o) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-slate-400">
        Memuat transaksi...
      </main>
    )
  }

  const info = statusInfo[o.status] || { label: o.status, color: 'text-slate-300', icon: '•' }
  const compact = o.status === 'SUCCESS' || ['FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(o.status)
  const reference = payment?.external_reference || `REF-${o.order_code}`

  return (
    <main className="mx-auto max-w-2xl px-3 py-6 sm:px-4 sm:py-10">
      <section className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status Pesanan</p>
            <h1 className={`mt-1 text-xl font-black sm:text-2xl ${info.color}`}>
              {info.icon} {info.label}
            </h1>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">#{o.order_code}</span>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">Ref ID</p>
            <p className="max-w-[170px] break-all text-xs font-bold text-cyan-300">{reference}</p>
          </div>
        </div>

        {o.status === 'SUCCESS' ? (
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-[11px] text-slate-500">STRUK TRANSAKSI</p>
                <p className="mt-1 text-sm font-black">Pembayaran Berhasil</p>
              </div>
              <span className="text-xl">✓</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><p className="text-[11px] text-slate-500">No. Referensi</p><p className="mt-0.5 font-bold break-all">{reference}</p></div>
              <div><p className="text-[11px] text-slate-500">Order ID</p><p className="mt-0.5 font-bold break-all">{o.order_code}</p></div>
              <div><p className="text-[11px] text-slate-500">Produk</p><p className="mt-0.5 font-semibold">{o.games?.name || 'Produk'}</p></div>
              <div><p className="text-[11px] text-slate-500">Metode</p><p className="mt-0.5 font-semibold">{paymentMethod?.name || 'Pembayaran'}</p></div>
              <div><p className="text-[11px] text-slate-500">Total</p><p className="mt-0.5 font-black text-cyan-300">Rp {Number(o.total || 0).toLocaleString('id-ID')}</p></div>
              <div><p className="text-[11px] text-slate-500">Tanggal</p><p className="mt-0.5 font-semibold">{new Date(o.updated_at || o.created_at).toLocaleString('id-ID')}</p></div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-xl bg-slate-950/50 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-400">{o.games?.name || 'Produk'}</span>
                <span className="font-black">Rp {Number(o.total || 0).toLocaleString('id-ID')}</span>
              </div>
              {o.order_items?.map((item: any) => (
                <p key={item.id} className="mt-1 text-xs text-slate-500">{item.product_name}</p>
              ))}
            </div>

            {o.status === 'PENDING_PAYMENT' && (
              <div className="mt-3 rounded-xl bg-slate-950/50 p-3">
                <p className="text-sm font-bold">{paymentMethod?.name || 'Metode pembayaran'}</p>
                {paymentMethodIsQris && (
                  <div className="mt-3 rounded-xl bg-white p-2">
                    <p className="mb-2 text-center text-xs font-bold text-slate-900">Scan QRIS untuk pembayaran</p>
                    <img src="/qris.png" alt="QRIS Pembayaran" className="mx-auto block w-full max-w-[220px] rounded-lg" />
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">{paymentMethod?.instruction || 'Bayar sesuai total lalu upload bukti.'}</p>
              </div>
            )}

            {o.status === 'PENDING_PAYMENT' && <PaymentProof orderId={o.id} />}
          </>
        )}

        <div className="mt-4 rounded-xl border border-white/10 p-3">
          <p className="text-xs font-bold text-slate-400">Perjalanan Pesanan</p>
          <div className="mt-2 grid gap-2">
            {history.map((item: any) => (
              <div key={item.id} className="flex gap-2 border-l-2 border-purple-500/40 pl-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{labels[item.new_status] || item.new_status}</p>
                  <p className="text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString('id-ID')}</p>
                  {item.note && !String(item.note).toLowerCase().includes('diproses manual oleh owner') && (
                    <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {proof && proofUrl && !compact && (
          <a href={proofUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-bold text-cyan-300">
            Lihat bukti pembayaran →
          </a>
        )}

        {o.status === 'SUCCESS' && (
          <button
            type="button"
            onClick={() => router.push('/review')}
            className="mt-4 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-black text-cyan-300"
          >
            ⭐ Beri Penilaian
          </button>
        )}
      </section>
    </main>
  )
}
