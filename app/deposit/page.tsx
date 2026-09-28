'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function DepositPage() {
  const r = useRouter()
  const s = supabaseBrowser()

  const [methods, setMethods] = useState<any[]>([])
  const [balance, setBalance] = useState(0)
  const [method, setMethod] = useState('')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    try {
      const {
        data: { user },
        error: authError,
      } = await s.auth.getUser()

      if (authError) throw authError

      if (!user) {
        r.push('/login')
        return
      }

      const [methodsResult, walletResult] = await Promise.all([
        s
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('created_at'),
        s
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (methodsResult.error) throw methodsResult.error
      if (walletResult.error) throw walletResult.error

      const availableMethods = (methodsResult.data || []).filter((x) => {
        const kind = String(x.kind || '').trim().toUpperCase()
        const name = String(x.name || '').trim().toLowerCase()
        return kind !== 'WALLET' && name !== 'saldo akun'
      })

      setMethods(availableMethods)
      setBalance(Number(walletResult.data?.balance || 0))
      setMethod((current) =>
        availableMethods.some((x) => x.id === current)
          ? current
          : availableMethods[0]?.id || ''
      )
    } catch (error: any) {
      setMsg(error?.message || 'Gagal memuat data deposit.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e: any) {
    e.preventDefault()
    setMsg('')

    const n = Number(amount)

    if (!method || !Number.isFinite(n) || n <= 0) {
      setMsg('Pilih metode dan nominal deposit yang valid.')
      return
    }

    if (!file) {
      setMsg('Bukti pembayaran wajib diupload.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMsg('Ukuran bukti maksimal 5 MB.')
      return
    }

    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(file.type)
    ) {
      setMsg('Bukti harus JPG, PNG, atau WEBP.')
      return
    }

    setLoading(true)

    let path = ''

    try {
      const {
        data: { user },
        error: authError,
      } = await s.auth.getUser()

      if (authError) throw authError

      if (!user) {
        r.push('/login')
        return
      }

      const ext =
        file.name.split('.').pop()?.toLowerCase() || 'jpg'

      path =
        `${user.id}/deposit-${Date.now()}-` +
        `${crypto.randomUUID().slice(0, 8)}.${ext}`

      const up = await s.storage
        .from('payment-proofs')
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        })

      if (up.error) throw up.error

      const { error } = await s.rpc(
        'create_member_deposit',
        {
          p_payment_method_id: method,
          p_amount: n,
          p_proof_path: path,
          p_proof_url: null,
          p_note: note.trim() || null,
        }
      )

      if (error) {
        await s.storage.from('payment-proofs').remove([path])
        throw error
      }

      setMsg(
        'Deposit berhasil dikirim. Tunggu verifikasi admin.'
      )
      setAmount('')
      setNote('')
      setFile(null)
      await load()
    } catch (error: any) {
      setMsg(error?.message || 'Deposit gagal diproses.')
    } finally {
      setLoading(false)
    }
  }

  const selectedMethod = methods.find(
    (x) => x.id === method
  )

  const selectedMethodIsQris =
    String(selectedMethod?.kind || '').trim().toUpperCase() === 'QRIS' ||
    String(selectedMethod?.name || '').trim().toLowerCase().includes('qris')

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300">
            Wallet
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Deposit Member
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Tambahkan saldo akun melalui metode pembayaran yang tersedia.
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-right sm:px-4">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Saldo saat ini
          </p>
          <p className="mt-0.5 text-sm font-black text-cyan-300 sm:text-base">
            Rp {balance.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="glass rounded-2xl p-4 sm:p-5 lg:p-6"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
              Pembayaran
            </p>
            <h2 className="mt-0.5 text-lg font-black text-white sm:text-xl">
              Ajukan Deposit
            </h2>
          </div>
          <span className="rounded-full bg-cyan-400/5 px-2.5 py-1 text-[9px] font-semibold text-slate-500">
            Manual
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
          <div className="min-w-0 space-y-4">
            <div>
              <label
                htmlFor="payment-method"
                className="block text-[11px] font-bold text-slate-300"
              >
                Metode Pembayaran
              </label>
              <select
                id="payment-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1.5 block w-full min-w-0 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-xs text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              >
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.kind}
                  </option>
                ))}
              </select>
            </div>

            {selectedMethod && (
              <div className="rounded-xl border border-cyan-400/10 bg-slate-950/45 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-sm">
                    💳
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wide text-slate-500">
                      Metode terpilih
                    </p>
                    <p className="truncate text-xs font-black text-white">
                      {selectedMethod.name}
                    </p>
                  </div>
                </div>

                <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <div>
                      <p className="text-[9px] text-slate-500">Nama akun</p>
                      <p className="text-[11px] font-semibold text-slate-200">
                        {selectedMethod.account_name || selectedMethod.name}
                      </p>
                    </div>
                    {selectedMethod.account_number && (
                      <div>
                        <p className="text-[9px] text-slate-500">Nomor pembayaran</p>
                        <p className="break-all text-[11px] font-semibold text-slate-200">
                          {selectedMethod.account_number}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedMethod.instruction && (
                    <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                      {selectedMethod.instruction}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="deposit-amount"
                  className="block text-[11px] font-bold text-slate-300"
                >
                  Nominal Deposit
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    Rp
                  </span>
                  <input
                    id="deposit-amount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="100000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-3 text-xs font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-proof"
                  className="block text-[11px] font-bold text-slate-300"
                >
                  Bukti Pembayaran
                </label>
                <div className="mt-1.5 rounded-xl border border-dashed border-white/15 bg-slate-950/50 px-3 py-2.5">
                  <input
                    id="payment-proof"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                    className="block w-full min-w-0 text-[10px] text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-400/10 file:px-2.5 file:py-1.5 file:text-[10px] file:font-bold file:text-cyan-300"
                  />
                  <p className="mt-1 text-[9px] text-slate-600">JPG, PNG, WEBP · Maks. 5 MB</p>
                  {file && (
                    <p className="mt-1 truncate text-[9px] font-semibold text-cyan-300">{file.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="deposit-note"
                className="block text-[11px] font-bold text-slate-300"
              >
                Catatan <span className="font-normal text-slate-600">(opsional)</span>
              </label>
              <textarea
                id="deposit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: transfer dari rekening Budi"
                rows={2}
                className="mt-1.5 block w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-xs leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col rounded-xl border border-cyan-400/10 bg-slate-950/40 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
              QR Pembayaran
            </p>

            {(selectedMethodIsQris || selectedMethod?.qr_url) ? (
              <div className="mt-2 flex flex-1 items-center justify-center rounded-xl bg-white p-3">
                <img
                  src={selectedMethodIsQris ? '/qris.png' : selectedMethod.qr_url}
                  alt={selectedMethodIsQris ? 'QRIS pembayaran' : 'QR pembayaran'}
                  className="h-auto w-full max-w-[220px] rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="mt-2 flex min-h-[180px] flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center text-[10px] text-slate-600">
                QR pembayaran tidak tersedia.
              </div>
            )}

            <p className="mt-2 text-center text-[9px] leading-4 text-slate-600">
              Scan QR, selesaikan pembayaran, lalu upload bukti pembayaran.
            </p>
          </div>
        </div>

        {msg && (
          <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-2.5">
            <p className="text-[11px] leading-5 text-cyan-300">{msg}</p>
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/dashboard"
            className="text-center text-[10px] font-semibold text-slate-500 transition hover:text-slate-300 sm:text-left"
          >
            ← Kembali ke Dashboard
          </a>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
          >
            {loading ? 'Mengirim pengajuan...' : 'Kirim Pengajuan Deposit'}
          </button>
        </div>
      </form>
    </main>
  )
}
