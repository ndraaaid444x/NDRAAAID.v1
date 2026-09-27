'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Star, Send } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function ReviewPage() {
  const router = useRouter()
  const s = supabaseBrowser()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [rating, setRating] = useState<Record<string, number>>({})
  const [text, setText] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    setMsg('')

    const { data: { user } } = await s.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await s.rpc('get_my_reviewable_orders')

    if (error) {
      setMsg(error.message)
      setOrders([])
    } else {
      setOrders(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(orderId: string) {
    const currentRating = rating[orderId] || 0
    const currentText = (text[orderId] || '').trim()

    if (!currentRating) {
      setMsg('Pilih rating 1–5 bintang terlebih dahulu.')
      return
    }

    if (!currentText) {
      setMsg('Tulis ulasan terlebih dahulu.')
      return
    }

    setSaving(orderId)
    setMsg('')

    const { error } = await s.rpc('create_customer_review', {
      p_order_id: orderId,
      p_rating: currentRating,
      p_review_text: currentText,
    })

    setSaving('')

    if (error) {
      setMsg(error.message)
      return
    }

    setMsg('Ulasan berhasil dikirim dan menunggu persetujuan Admin.')
    await load()
  }

  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            CUSTOMER REVIEW
          </p>
          <h1 className="mt-2 text-3xl font-black">Beri Penilaian</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Penilaian hanya tersedia untuk top up yang sudah berhasil. Username publik akan otomatis dianonimkan.
          </p>
        </div>

        {msg && (
          <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-200">
            {msg}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-slate-500">
            Memuat transaksi...
          </div>
        )}

        {!loading && !orders.length && (
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-8 text-center text-sm text-slate-500">
            Belum ada transaksi berhasil yang dapat diberi penilaian.
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => {
            const reviewed = Boolean(order.review_id)

            return (
              <article
                key={order.order_id}
                className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-[#08131a] via-[#080a10] to-[#100713] p-5 shadow-[0_0_30px_rgba(34,211,238,.05)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">{order.game_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.order_code}</p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    <CheckCircle2 size={12} /> Top Up Berhasil
                  </span>
                </div>

                {reviewed ? (
                  <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-1 text-amber-300">
                      {'★'.repeat(Number(order.review_rating || 0))}
                    </div>
                    <p className="mt-2 text-sm text-slate-300">“{order.review_text}”</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {order.review_approved ? 'Sudah ditampilkan' : 'Menunggu persetujuan Admin'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-label={`${value} bintang`}
                          onClick={() => setRating((v) => ({ ...v, [order.order_id]: value }))}
                          className="rounded-md p-1 transition hover:bg-white/5"
                        >
                          <Star
                            size={24}
                            fill={value <= (rating[order.order_id] || 0) ? 'currentColor' : 'none'}
                            className={value <= (rating[order.order_id] || 0) ? 'text-amber-300' : 'text-slate-600'}
                          />
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="input mt-4 min-h-24 w-full resize-y"
                      maxLength={300}
                      value={text[order.order_id] || ''}
                      onChange={(e) => setText((v) => ({ ...v, [order.order_id]: e.target.value }))}
                      placeholder="Ceritakan pengalaman top up kamu..."
                    />

                    <button
                      type="button"
                      onClick={() => submit(order.order_id)}
                      disabled={saving === order.order_id}
                      className="btn btn-primary mt-3"
                    >
                      <Send size={15} className="mr-2" />
                      {saving === order.order_id ? 'Mengirim...' : 'Kirim Penilaian'}
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
