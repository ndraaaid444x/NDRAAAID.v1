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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* HEADER */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-black uppercase tracking-[0.18em] text-cyan-300 sm:text-lg">
            FORM DEPOSIT
          </p>

          <div className="mt-3 inline-flex max-w-full items-center rounded-2xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Saldo saat ini
              </p>

              <p className="mt-1 text-lg font-black text-cyan-300 sm:text-xl">
                Rp {balance.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        <a
          href="/dashboard"
          className="btn btn-muted w-full sm:w-auto"
        >
          Kembali ke Dashboard
        </a>
      </div>

      {/* CONTENT */}
      <div className="mx-auto mt-6 w-full max-w-3xl">
        {/* FORM DEPOSIT */}
        <form
          onSubmit={submit}
          className="glass min-w-0 rounded-3xl p-5 sm:p-6"
        >
          <div className="border-b border-white/10 pb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Pembayaran
            </p>


          </div>

          <div className="mt-5 space-y-5">
            {/* METODE PEMBAYARAN */}
            <div>
              <label
                htmlFor="payment-method"
                className="block text-sm font-bold text-white"
              >
                Metode Pembayaran
              </label>

              <select
                id="payment-method"
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value)
                }
                className="mt-2 block w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              >
                {methods.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                  >
                    {m.name} · {m.kind}
                  </option>
                ))}
              </select>
            </div>

            {/* INFO PEMBAYARAN */}
            {selectedMethod && (
              <div className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-slate-950/50">
                <div className="p-4 sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-lg">
                      💳
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Metode terpilih
                      </p>

                      <h3 className="mt-1 break-words text-base font-black text-white sm:text-lg">
                        {selectedMethod.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 rounded-xl bg-white/5 p-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        Nama akun
                      </p>

                      <p className="mt-1 break-words text-sm font-bold text-slate-200">
                        {selectedMethod.account_name ||
                          selectedMethod.name}
                      </p>
                    </div>

                    {selectedMethod.account_number && (
                      <div>
                        <p className="text-xs text-slate-500">
                          Nomor pembayaran
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold text-slate-200">
                          {selectedMethod.account_number}
                        </p>
                      </div>
                    )}

                    {selectedMethod.instruction && (
                      <div>
                        <p className="text-xs text-slate-500">
                          Instruksi
                        </p>

                        <p className="mt-1 break-words text-sm leading-6 text-slate-300">
                          {selectedMethod.instruction}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* QR */}
                  {(selectedMethodIsQris || selectedMethod.qr_url) && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white p-4">
                      <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                        QR Pembayaran
                      </p>

                      <div className="flex justify-center">
                        <img
                          src={selectedMethodIsQris ? '/qris.png' : selectedMethod.qr_url}
                          alt={selectedMethodIsQris ? 'QRIS pembayaran' : 'QR pembayaran'}
                          className="h-auto max-h-72 w-full max-w-xs rounded-xl object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NOMINAL */}
            <div>
              <label
                htmlFor="deposit-amount"
                className="block text-sm font-bold text-white"
              >
                Nominal Deposit
              </label>

              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  Rp
                </span>

                <input
                  id="deposit-amount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="100000"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  required
                  className="block w-full rounded-2xl border border-white/10 bg-slate-950/70 py-4 pl-12 pr-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Masukkan jumlah saldo yang ingin kamu
                tambahkan.
              </p>
            </div>

            {/* BUKTI PEMBAYARAN */}
            <div>
              <label
                htmlFor="payment-proof"
                className="block text-sm font-bold text-white"
              >
                Bukti Pembayaran
              </label>

              <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-slate-950/50 p-4">
                <input
                  id="payment-proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setFile(
                      e.target.files?.[0] || null
                    )
                  }
                  required
                  className="block w-full min-w-0 text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-400/10 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-cyan-300 file:transition hover:file:bg-cyan-400/20"
                />

                <div className="mt-3 flex items-start gap-2">
                  <span className="text-xs text-slate-500">
                    ℹ️
                  </span>

                  <p className="text-xs leading-5 text-slate-500">
                    JPG, PNG, atau WEBP. Maksimal 5 MB.
                  </p>
                </div>

                {file && (
                  <div className="mt-3 rounded-xl bg-cyan-400/5 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-cyan-300">
                      {file.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CATATAN */}
            <div>
              <label
                htmlFor="deposit-note"
                className="block text-sm font-bold text-white"
              >
                Catatan
                <span className="ml-2 font-normal text-slate-500">
                  (opsional)
                </span>
              </label>

              <textarea
                id="deposit-note"
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                placeholder="Contoh: transfer dari rekening Budi"
                rows={4}
                className="mt-2 block w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />

              <p className="mt-2 text-xs text-slate-500">
                Catatan tambahan untuk membantu admin
                memeriksa deposit.
              </p>
            </div>

            {/* MESSAGE */}
            {msg && (
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                <p className="text-sm leading-6 text-cyan-300">
                  {msg}
                </p>
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-4 text-base font-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Mengirim pengajuan...'
                : 'Kirim Pengajuan Deposit'}
            </button>

            <p className="text-center text-xs leading-5 text-slate-500">
              Pastikan nominal dan bukti pembayaran
              sudah benar sebelum mengirim pengajuan.
            </p>
          </div>
        </form>

      </div>
    </main>
  )
}
