'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

const PAYMENT_CATEGORIES = [
  { value: 'QRIS', label: 'QRIS' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'E_WALLET', label: 'E-Wallet' },
  { value: 'VIRTUAL_ACCOUNT', label: 'Virtual Account' },
  { value: 'WALLET', label: 'Saldo Akun' },
]

function normalizeKind(kind: unknown) {
  const value = String(kind ?? '').trim().toUpperCase()
  if (value === 'BANK TRANSFER' || value === 'BANK_TRANSFER') return 'BANK_TRANSFER'
  if (value === 'E-WALLET' || value === 'E_WALLET' || value === 'EWALLET') return 'E_WALLET'
  if (value === 'VIRTUAL ACCOUNT' || value === 'VIRTUAL_ACCOUNT') return 'VIRTUAL_ACCOUNT'
  if (value === 'SALDO AKUN' || value === 'WALLET' || value === 'SALDO') return 'WALLET'
  return value
}

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
  const [paymentCategory, setPaymentCategory] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletLoading, setWalletLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const s = supabaseBrowser()

        const { data: paymentMethods, error: methodsError } = await s
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (cancelled) return

        if (methodsError) {
          setError(methodsError.message)
          setMethods([])
          setMethod(undefined)
          setPaymentCategory('')
        } else {
          const activeMethods = Array.isArray(paymentMethods) ? paymentMethods : []
          setMethods(activeMethods)

          const first = activeMethods[0]
          if (first) {
            setMethod(first)
            setPaymentCategory(normalizeKind(first.kind))
          } else {
            setMethod(undefined)
            setPaymentCategory('')
          }
        }

        const {
          data: { user },
        } = await s.auth.getUser()

        if (cancelled || !user) return

        setWalletLoading(true)
        const { data: wallet, error: walletError } = await s
          .from('wallets')
          .select('balance,reserved_balance')
          .eq('user_id', user.id)
          .maybeSingle()

        if (cancelled) return

        if (walletError) {
          setWalletBalance(0)
        } else if (wallet) {
          const balance = Number(wallet.balance || 0)
          const reserved = Number(wallet.reserved_balance || 0)
          setWalletBalance(Math.max(0, balance - reserved))
        } else {
          setWalletBalance(0)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Gagal memuat pembayaran.')
      } finally {
        if (!cancelled) setWalletLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const availableCategories = PAYMENT_CATEGORIES.filter((category) =>
    methods.some((m) => normalizeKind(m?.kind) === category.value)
  )

  const methodsInCategory = methods.filter(
    (m) => normalizeKind(m?.kind) === paymentCategory
  )

  const isWallet = normalizeKind(method?.kind) === 'WALLET'

  function chooseCategory(category: string) {
    setError('')
    setPaymentCategory(category)
    const first = methods.find((m) => normalizeKind(m?.kind) === category)
    setMethod(first)
  }

  async function submit() {
    setError('')

    if (!selected) {
      setError('Pilih produk terlebih dahulu.')
      return
    }

    if (!method?.id) {
      setError('Pilih metode pembayaran.')
      return
    }

    for (const f of Array.isArray(fields) ? fields : []) {
      if (f.required && !String(values[f.key] || '').trim()) {
        setError(`Isi ${f.label}.`)
        return
      }
    }

    setLoading(true)

    try {
      const s = supabaseBrowser()
      const {
        data: { user },
      } = await s.auth.getUser()

      if (!user) {
        router.push('/login?next=' + encodeURIComponent(`/games/${game.slug}`))
        return
      }

      const { data: orderId, error: rpcError } = await s.rpc('create_manual_order', {
        p_game_id: game.id,
        p_product_id: selected.id,
        p_customer_data: values,
        p_payment_method_id: method.id,
        p_voucher_code: voucher.trim() || null,
      })

      if (rpcError) {
        const message = String(rpcError.message || 'Gagal membuat order.')
        setError(
          message.includes('INSUFFICIENT_WALLET_BALANCE')
            ? 'Saldo akun tidak mencukupi untuk pembayaran ini.'
            : message
        )
        return
      }

      if (!orderId) {
        setError('Order tidak berhasil dibuat. Silakan coba lagi.')
        return
      }

      router.push('/order/?id=' + encodeURIComponent(String(orderId)))
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat membuat order.')
    } finally {
      setLoading(false)
    }
  }

  const paymentDescription = isWallet
    ? 'Pembayaran akan diproses menggunakan saldo akun.'
    : normalizeKind(method?.kind) === 'QRIS'
      ? 'Pembayaran QRIS dilakukan secara manual dan memerlukan bukti pembayaran.'
      : 'Ikuti instruksi pembayaran dan unggah bukti jika diminta.'

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
      <div>
        <h2 className="text-xl font-black">1. Data akun</h2>

        <div className="mt-4 grid gap-4">
          {fields.map((f) => (
            <label key={f.id} className="text-sm font-semibold">
              {f.label}
              <input
                className="input mt-2"
                placeholder={f.placeholder || ''}
                value={values[f.key] || ''}
                onChange={(e) =>
                  setValues((current) => ({ ...current, [f.key]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-black">2. Pilih nominal</h2>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {products.map((p) => {
            const active = selected?.id === p.id
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelected(p)}
                className={`rounded-xl border p-2.5 text-left transition ${
                  active
                    ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,.12)]'
                    : 'border-white/10 bg-slate-950/40 hover:border-white/20'
                }`}
              >
                <div className="flex min-h-[3.25rem] items-center">
                  <div className="line-clamp-2 text-xs font-bold leading-snug sm:text-sm">
                    {p.name || p.nominal}
                  </div>
                </div>
                <div className="mt-1.5 text-xs font-semibold text-cyan-300 sm:text-sm">
                  Rp {Number(p.price).toLocaleString('id-ID')}
                </div>
                <div className="mt-1 truncate text-[10px] text-slate-500 sm:text-[11px]">
                  {p.sku}
                </div>
              </button>
            )
          })}
        </div>

        <label className="mt-6 block text-sm font-semibold">
          Kategori Pembayaran
          <select
            className="input mt-2"
            value={paymentCategory}
            onChange={(e) => chooseCategory(e.target.value)}
          >
            <option value="" disabled>Pilih kategori pembayaran</option>
            {availableCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        {paymentCategory && methodsInCategory.length > 0 && (
          <label className="mt-4 block text-sm font-semibold">
            Metode Pembayaran
            <select
              className="input mt-2"
              value={method?.id || ''}
              onChange={(e) => {
                const next = methodsInCategory.find((m) => m.id === e.target.value)
                setMethod(next)
              }}
            >
              {methodsInCategory.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {paymentCategory && methodsInCategory.length === 0 && (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">
            Belum ada metode pembayaran aktif untuk kategori ini.
          </div>
        )}

        {method && (
          <div className="mt-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4 text-sm">
            <b>{method.name || 'Metode Pembayaran'}</b>

            {isWallet ? (
              <>
                <p className="mt-2 text-slate-400">Saldo tersedia</p>
                <p className="mt-1 text-xl font-black text-cyan-300">
                  {walletLoading ? 'Memuat...' : `Rp ${walletBalance.toLocaleString('id-ID')}`}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Saldo akan dipotong otomatis setelah pesanan berhasil dibuat.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-slate-400">
                  {method.account_name || ''}
                  {method.account_number ? ` · ${method.account_number}` : ''}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {method.instruction || 'Ikuti instruksi pembayaran di halaman order.'}
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
            onChange={(e) => setVoucher(e.target.value.toUpperCase())}
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
              Rp {selected ? Number(selected.price).toLocaleString('id-ID') : '0'}
            </b>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="btn btn-primary mt-5 w-full"
          >
            {loading ? 'Membuat order...' : 'Buat Pesanan'}
          </button>

          <p className="mt-3 text-center text-xs text-slate-500">
            {paymentDescription}
          </p>
        </div>
      </div>
    </div>
  )
}
