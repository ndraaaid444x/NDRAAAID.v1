'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function TopupForm({
  game,
  fields,
  products,
}: {
  game: any
  fields: any[]
  products: any[]
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<any>()
  const [voucher, setVoucher] = useState('')
  const [methods, setMethods] = useState<any[]>([])
  const [method, setMethod] = useState<any>()
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [walletLoading, setWalletLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const s = supabaseBrowser()

      const { data: paymentMethods } = await s
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setMethods(paymentMethods || [])

      if (paymentMethods?.[0]) {
        setMethod(paymentMethods[0])
      }

      const {
        data: { user },
      } = await s.auth.getUser()

      if (!user) return

      setWalletLoading(true)

      const { data: wallet } = await s
        .from('wallets')
        .select('balance,reserved_balance')
        .eq('user_id', user.id)
        .maybeSingle()

      if (wallet) {
        const balance = Number(wallet.balance || 0)
        const reserved = Number(wallet.reserved_balance || 0)

        setWalletBalance(Math.max(0, balance - reserved))
      } else {
        setWalletBalance(0)
      }

      setWalletLoading(false)
    }

    loadData()
  }, [])

  async function submit() {
    setError('')

    if (!selected) {
      return setError('Pilih produk terlebih dahulu.')
    }

    if (!method) {
      return setError('Pilih metode pembayaran.')
    }

    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        return setError(`Isi ${f.label}.`)
      }
    }

    setLoading(true)

    const s = supabaseBrowser()

    const {
      data: { user },
    } = await s.auth.getUser()

    if (!user) {
      router.push(
        '/login?next=' + encodeURIComponent(`/games/${game.slug}`)
      )
      return
    }

    const { data: orderId, error: e } = await s.rpc(
      'create_manual_order',
      {
        p_game_id: game.id,
        p_product_id: selected.id,
        p_customer_data: values,
        p_payment_method_id: method.id,
        p_voucher_code: voucher || null,
      }
    )

    if (e || !orderId) {
      if (e?.message?.includes('INSUFFICIENT_WALLET_BALANCE')) {
        setError('Saldo akun tidak mencukupi untuk pembayaran ini.')
      } else {
        setError(e?.message || 'Gagal membuat order.')
      }

      setLoading(false)
      return
    }

    router.push('/order/?id=' + encodeURIComponent(orderId))
  }

  const isWallet = method?.kind?.toUpperCase() === 'WALLET'

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
      <div>
        <h2 className="text-xl font-black">1. Data akun</h2>

        <div className="mt-4 grid gap-4">
          {fields.map((f) => (
            <label
              key={f.id}
              className="text-sm font-semibold"
            >
              {f.label}

              <input
                className="input mt-2"
                placeholder={f.placeholder || ''}
                value={values[f.key] || ''}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [f.key]: e.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-black">2. Pilih nominal</h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setSelected(p)}
              className={`rounded-2xl border p-3 text-left transition ${
                selected?.id === p.id
                  ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,.12)]'
                  : 'border-white/10 bg-slate-950/40 hover:border-white/20'
              }`}
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt=""
                  className="mb-3 aspect-video w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mb-3 flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-2xl">
                  🎮
                </div>
              )}

              <div className="font-bold">{p.name}</div>

              <div className="mt-2 text-sm text-cyan-300">
                Rp {Number(p.price).toLocaleString('id-ID')}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {p.sku}
              </div>
            </button>
          ))}
        </div>

        <label className="mt-6 block text-sm font-semibold">
          Metode Pembayaran

          <select
            className="input mt-2"
            value={method?.id || ''}
            onChange={(e) =>
              setMethod(
                methods.find(
                  (x) => x.id === e.target.value
                )
              )
            }
          >
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        {method && (
          <div className="mt-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 text-sm">
            <b>{method.name}</b>

            {isWallet ? (
              <>
                <p className="mt-2 text-slate-400">
                  Saldo tersedia
                </p>

                <p className="mt-1 text-xl font-black text-cyan-300">
                  {walletLoading
                    ? 'Memuat...'
                    : `Rp ${walletBalance.toLocaleString(
                        'id-ID'
                      )}`}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Saldo akan dipotong otomatis setelah pesanan
                  berhasil dibuat.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-slate-400">
                  {method.account_name || ''}
                  {method.account_number
                    ? ` · ${method.account_number}`
                    : ''}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {method.instruction ||
                    'Ikuti instruksi pembayaran di halaman order.'}
                </p>
              </>
            )}
          </div>
        )}

        <label className="mt-4 block text-sm font-semibold">
          Voucher

          <input
            className="input mt-2"
            value={voucher}
            onChange={(e) =>
              setVoucher(e.target.value.toUpperCase())
            }
            placeholder="Opsional"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-slate-950/70 p-5">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Harga produk</span>

            <b className="text-xl text-white">
              Rp{' '}
              {selected
                ? Number(selected.price).toLocaleString(
                    'id-ID'
                  )
                : '0'}
            </b>
          </div>

          <button
            disabled={loading}
            onClick={submit}
            className="btn btn-primary mt-5 w-full"
          >
            {loading
              ? 'Membuat order...'
              : 'Buat Pesanan'}
          </button>

          <p className="mt-3 text-center text-xs text-slate-500">
            {isWallet
              ? 'Pembayaran akan diproses menggunakan saldo akun.'
              : 'Pembayaran QRIS dilakukan secara manual dan memerlukan bukti pembayaran.'}
          </p>
        </div>
      </div>
    </div>
  )
}