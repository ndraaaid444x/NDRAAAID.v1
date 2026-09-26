'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import PaymentProof from '@/components/payment-proof'

const labels: any = {
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  PAYMENT_RECEIVED: 'Pembayaran Diterima',
  PROCESSING: 'Sedang Diproses',
  SUCCESS: 'Berhasil',
  FAILED: 'Gagal',
  CANCELLED: 'Dibatalkan',
  EXPIRED: 'Kedaluwarsa',
}

export default function OrderPage() {
  const [id, setId] = useState('')
  const [o, setO] = useState<any>()
  const [paymentMethod, setPaymentMethod] = useState<any>()
  const [h, setH] = useState<any[]>([])
  const [proof, setProof] = useState<any>()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const r = useRouter()

  useEffect(() => {
    setId(
      new URLSearchParams(window.location.search).get('id') || ''
    )
  }, [])

  useEffect(() => {
    if (!id) return

    ;(async () => {
      const s = supabaseBrowser()

      const {
        data: { user },
      } = await s.auth.getUser()

      if (!user) {
        r.push('/login')
        return
      }

      // Ambil order
      const { data: o1, error: orderError } = await s
        .from('orders')
        .select('*,games(name),order_items(*)')
        .eq('id', id)
        .single()

      console.log('ORDER:', o1)
      console.log('ORDER ERROR:', orderError)

      if (!o1) {
        setLoading(false)
        return
      }

      // Pastikan pemilik order
      const { data: profile } = await s
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (
        o1.user_id !== user.id &&
        !['owner', 'admin'].includes(profile?.role)
      ) {
        setLoading(false)
        return
      }

      // Ambil payment terpisah
      const { data: payment, error: paymentError } = await s
        .from('payments')
        .select('*')
        .eq('order_id', id)
        .maybeSingle()

      console.log('PAYMENT:', payment)
      console.log('PAYMENT ERROR:', paymentError)

      // Ambil metode pembayaran terpisah
      let method = null

      if (payment?.payment_method_id) {
        const { data: methodData, error: methodError } = await s
          .from('payment_methods')
          .select('*')
          .eq('id', payment.payment_method_id)
          .maybeSingle()

        console.log('PAYMENT METHOD:', methodData)
        console.log('PAYMENT METHOD ERROR:', methodError)

        method = methodData
      }

      // History + bukti
      const [{ data: hist }, { data: pr }] = await Promise.all([
        s
          .from('order_status_history')
          .select('*')
          .eq('order_id', id)
          .order('created_at'),

        s
          .from('payment_proofs')
          .select('*')
          .eq('order_id', id)
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      setO(o1)
      setPaymentMethod(method)
      setH(hist || [])
      setProof(pr?.[0])

      if (pr?.[0]) {
        const { data: signed } = await s.storage
          .from('payment-proofs')
          .createSignedUrl(
            pr[0].storage_path,
            900
          )

        setUrl(signed?.signedUrl || '')
      }

      setLoading(false)
    })()
  }, [id, r])

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center text-slate-400">
        Memuat transaksi...
      </main>
    )
  }

  if (!o) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-3xl font-black">
          Transaksi tidak ditemukan
        </h1>
      </main>
    )
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <div className="glass rounded-3xl p-6 md:p-8">

        {/* HEADER */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Order ID
            </p>

            <h1 className="mt-1 text-2xl font-black">
              {o.order_code}
            </h1>

            <p className="mt-2 text-slate-400">
              {o.games?.name}
            </p>
          </div>

          <span className="rounded-full bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-300">
            {labels[o.status]}
          </span>
        </div>

        {/* DETAIL */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">

          {/* PRODUK */}
          <div className="rounded-2xl bg-slate-950/60 p-5">
            <p className="text-xs text-slate-500">
              Produk
            </p>

            {o.order_items?.map((i: any) => (
              <p
                key={i.id}
                className="mt-1 font-bold"
              >
                {i.product_name} · Rp{' '}
                {Number(i.unit_price).toLocaleString('id-ID')}
              </p>
            ))}

            <p className="mt-4 text-xs text-slate-500">
              Data game
            </p>

            <p className="mt-1 text-sm text-slate-300">
              {Object.entries(o.customer_data || {}).map(
                ([k, v]) => (
                  <span
                    key={k}
                    className="mr-3"
                  >
                    {k}: {String(v)}
                  </span>
                )
              )}
            </p>
          </div>

          {/* PEMBAYARAN */}
          <div className="rounded-2xl bg-slate-950/60 p-5">
            <p className="font-bold">
              Pembayaran Manual
            </p>

            <p className="mt-2 text-2xl font-black">
              Rp {Number(o.total).toLocaleString('id-ID')}
            </p>

            <p className="mt-2 text-sm font-semibold text-cyan-300">
              {paymentMethod?.name || 'Metode pembayaran'}
            </p>

            {(paymentMethod?.account_name ||
              paymentMethod?.account_number) && (
              <p className="mt-2 text-sm text-slate-400">
                {paymentMethod?.account_name || ''}
                {paymentMethod?.account_number
                  ? ` · ${paymentMethod.account_number}`
                  : ''}
              </p>
            )}

            {/* QRIS */}
            {paymentMethod?.qr_url && (
              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="mb-3 text-center text-sm font-bold text-slate-900">
                  Scan QRIS untuk pembayaran
                </p>

                <img
                  src={paymentMethod.qr_url}
                  alt="QRIS Pembayaran"
                  className="mx-auto block w-full max-w-xs rounded-xl"
                />
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              {paymentMethod?.instruction ||
                'Bayar sesuai total lalu upload bukti.'}
            </p>
          </div>
        </div>

        {/* UPLOAD BUKTI */}
        {o.status === 'PENDING_PAYMENT' && (
          <PaymentProof orderId={o.id} />
        )}

        {/* BUKTI */}
        {proof && (
          <div className="mt-6 rounded-2xl border border-white/10 p-4">
            <p className="font-bold">
              Bukti Pembayaran
            </p>

            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm text-cyan-300"
              >
                Lihat bukti terbaru →
              </a>
            )}

            <p className="mt-2 text-xs text-slate-500">
              Bukti tidak otomatis dianggap valid.
              Verifikasi dilakukan Admin.
            </p>
          </div>
        )}

        {/* STATUS HISTORY */}
        <div className="mt-8">
          <h2 className="font-black">
            Status History
          </h2>

          <div className="mt-4 grid gap-3">
            {h.map((x: any) => (
              <div
                key={x.id}
                className="border-l-2 border-purple-500/50 pl-4"
              >
                <p className="font-bold">
                  {labels[x.new_status] || x.new_status}
                </p>

                <p className="text-xs text-slate-500">
                  {new Date(x.created_at).toLocaleString(
                    'id-ID'
                  )}
                </p>

                {x.note && (
                  <p className="mt-1 text-sm text-slate-400">
                    {x.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
