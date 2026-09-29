'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
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

function OrderStatusContent() {
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
      const { data } = await s
        .from('payment_methods')
        .select('*')
        .eq('id', paymentRow.payment_method_id)
        .maybeSingle()
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

  const customerEntries = useMemo(() => {
    const data = o?.customer_data
    if (!data || typeof data !== 'object' || Array.isArray(data)) return []

    const privateKeys = new Set([
      'email',
      'phone',
      'whatsapp',
      'wa',
      'telephone',
      'phone_number',
      'whatsapp_number',
    ])

    const labelMap: Record<string, string> = {
      id: 'ID',
      user_id: 'User ID',
      server: 'Server',
      zone: 'Zone',
      zone_id: 'Zone ID',
      riot_id: 'Riot ID',
      riotid: 'Riot ID',
      tag: 'Tag',
      name: 'Nama',
      username: 'Username',
      player_id: 'Player ID',
      playerid: 'Player ID',
      uid: 'UID',
    }

    return Object.entries(data)
      .filter(([key, value]) => {
        const normalized = key.toLowerCase().replace(/[\s-]/g, '_')
        return !privateKeys.has(normalized) && value !== null && value !== undefined && String(value).trim() !== ''
      })
      .map(([key, value]) => ({
        key,
        label:
          labelMap[key.toLowerCase()] ||
          key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        value:
          typeof value === 'object'
            ? JSON.stringify(value)
            : String(value),
      }))
  }, [o])

  if (loading || !o) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-slate-400">
        Memuat transaksi...
      </main>
    )
  }

  const info = statusInfo[o.status] || {
    label: o.status,
    color: 'text-slate-300',
    icon: '•',
  }

  const compact = o.status === 'SUCCESS' || ['FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(o.status)
  const subtotal = Number(o.subtotal ?? o.total ?? 0)
  const discount = Number(o.discount ?? 0)
  const total = Number(o.total ?? Math.max(0, subtotal - discount))
  const voucherCode = String(o.voucher_code || '').trim()
  const hasDiscount = discount > 0 || Boolean(voucherCode)
  const reference = payment?.external_reference || ''

  return (
    <main className="mx-auto w-full max-w-2xl px-3 py-5 sm:px-4 sm:py-8">
      <section className="glass overflow-hidden rounded-2xl p-3.5 sm:p-5">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Status Pesanan
            </p>
            <h1 className={`mt-1 text-lg font-black sm:text-xl ${info.color}`}>
              {info.icon} {info.label}
            </h1>
          </div>
          <div className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Order ID</p>
            <p className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-black text-slate-200 sm:max-w-[180px] sm:text-[11px]">
              {o.order_code}
            </p>
          </div>
        </header>

        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Produk</p>
              <p className="mt-0.5 truncate text-sm font-black text-slate-100">
                {o.games?.name || 'Produk'}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[9px] font-bold text-slate-400">
              {info.label}
            </span>
          </div>

          {o.order_items?.length > 0 && (
            <div className="mt-2 border-t border-white/5 pt-2">
              {o.order_items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-0.5 text-xs">
                  <span className="truncate text-slate-500">{item.product_name}</span>
                  {item.quantity && Number(item.quantity) > 1 && (
                    <span className="shrink-0 text-slate-600">×{item.quantity}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {customerEntries.length > 0 && (
          <div className="mt-2.5 rounded-xl border border-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Data Game
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {customerEntries.map((entry) => (
                <div key={entry.key} className="min-w-0 rounded-lg bg-white/[0.025] px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                    {entry.label}
                  </p>
                  <p className="mt-0.5 break-all text-xs font-bold text-slate-200">
                    {entry.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2.5 rounded-xl border border-white/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Rincian Pembayaran
            </p>
            <p className="text-[10px] font-semibold text-slate-600">
              {paymentMethod?.name || 'Pembayaran'}
            </p>
          </div>

          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-300">
                Rp {subtotal.toLocaleString('id-ID')}
              </span>
            </div>

            {hasDiscount && (
              <>
                {voucherCode && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Voucher</span>
                    <span className="font-bold text-cyan-300">{voucherCode}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Diskon</span>
                    <span className="font-bold text-emerald-300">
                      -Rp {discount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="mt-2 flex items-center justify-between gap-4 border-t border-white/10 pt-2">
              <span className="font-bold text-slate-300">Total</span>
              <span className="text-base font-black text-cyan-300">
                Rp {total.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {o.status === 'PENDING_PAYMENT' && (
          <div className="mt-2.5 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-3">
            <p className="text-xs font-black text-slate-200">
              {paymentMethod?.name || 'Metode pembayaran'}
            </p>

            {paymentMethodIsQris && (
              <div className="mt-2.5 rounded-xl bg-white p-2">
                <p className="mb-2 text-center text-[10px] font-bold text-slate-900">
                  Scan QRIS untuk pembayaran
                </p>
                <img
                  src="/qris.png"
                  alt="QRIS Pembayaran"
                  className="mx-auto block w-full max-w-[210px] rounded-lg"
                />
              </div>
            )}

            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {paymentMethod?.instruction || 'Bayar sesuai total lalu upload bukti.'}
            </p>
          </div>
        )}

        {o.status === 'PENDING_PAYMENT' && (
          <div className="mt-2.5">
            <PaymentProof orderId={o.id} />
          </div>
        )}

        {o.status === 'SUCCESS' && (
          <div className="mt-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.035] p-3">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Struk Transaksi
                </p>
                <p className="mt-0.5 text-sm font-black text-emerald-300">
                  Pembayaran Berhasil
                </p>
              </div>
              <span className="text-lg">✓</span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.025] p-2">
                <p className="text-[9px] uppercase tracking-wider text-slate-600">REFF ID</p>
                <p className="mt-0.5 break-all text-[11px] font-bold text-slate-200">
                  {reference || 'Belum tersedia'}
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.025] p-2">
                <p className="text-[9px] uppercase tracking-wider text-slate-600">Tanggal</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-300">
                  {new Date(o.updated_at || o.created_at).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-2.5 rounded-xl border border-white/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Perjalanan Pesanan
          </p>

          <div className="mt-2 space-y-2">
            {history.map((item: any) => (
              <div key={item.id} className="flex gap-2.5 border-l-2 border-purple-500/40 pl-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-300">
                    {labels[item.new_status] || item.new_status}
                  </p>
                  <p className="text-[9px] text-slate-600">
                    {new Date(item.created_at).toLocaleString('id-ID')}
                  </p>
                  {item.note &&
                    !String(item.note).toLowerCase().includes('diproses manual oleh owner') && (
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{item.note}</p>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {proof && proofUrl && !compact && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 block rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] px-3 py-2 text-center text-[11px] font-bold text-cyan-300"
          >
            Lihat bukti pembayaran →
          </a>
        )}

        {o.status === 'SUCCESS' && (
          <button
            type="button"
            onClick={() => router.push('/review')}
            className="mt-2.5 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-xs font-black text-cyan-300 transition hover:bg-cyan-400/15"
          >
            ⭐ Beri Penilaian
          </button>
        )}
      </section>
    </main>
  )
}

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-12 text-center text-slate-400">
          Memuat transaksi...
        </main>
      }
    >
      <OrderStatusContent />
    </Suspense>
  )
}
