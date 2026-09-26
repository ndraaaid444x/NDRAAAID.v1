'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'email' | 'sent' | 'recovery'>('email')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const s = supabaseBrowser()

    const checkRecovery = async () => {
      const { data } = await s.auth.getSession()
      if (data.session) setStep('recovery')
    }

    checkRecovery()

    const { data: listener } = s.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStep('recovery')
        setMsg('Link reset valid. Silakan buat password baru.')
        setError('')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function sendRecovery() {
    const normalized = email.trim().toLowerCase()
    setError('')
    setMsg('')

    if (!normalized) {
      setError('Masukkan email terlebih dahulu.')
      return
    }

    setLoading(true)

    const s = supabaseBrowser()
    const redirectTo = `${window.location.origin}/forgot-password/`
    const { error } = await s.auth.resetPasswordForEmail(normalized, { redirectTo })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setStep('sent')
    setMsg('Link reset password telah dikirim. Buka email Anda lalu klik tombol/link reset password.')
  }

  async function updatePassword() {
    setError('')
    setMsg('')

    if (password.length < 8) {
      setError('Password baru minimal 8 karakter.')
      return
    }

    setLoading(true)

    const { error } = await supabaseBrowser().auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    await supabaseBrowser().auth.signOut()
    setPassword('')
    setStep('email')
    setMsg('Password berhasil diubah. Silakan login kembali.')
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <div className="glass w-full rounded-3xl p-7">
        <h1 className="text-3xl font-black">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-400">
          Kami akan mengirim link reset ke email Anda. Tidak ada OTP yang diperlukan untuk reset password.
        </p>

        {step === 'email' && (
          <div className="mt-6 grid gap-4">
            <input
              className="input"
              placeholder="Email akun"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
            <button className="btn btn-primary" onClick={sendRecovery} disabled={loading}>
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </div>
        )}

        {step === 'sent' && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300">
              Periksa Inbox, Spam, atau Promotions. Klik link reset password dari email NDRAAAID.
            </div>
            <button className="btn btn-muted" onClick={() => setStep('email')} disabled={loading}>
              Kirim Ulang
            </button>
          </div>
        )}

        {step === 'recovery' && (
          <div className="mt-6 grid gap-4">
            <input
              className="input"
              placeholder="Password baru"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
            <button className="btn btn-primary" onClick={updatePassword} disabled={loading || password.length < 8}>
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </div>
        )}

        {msg && <p className="mt-4 text-sm text-emerald-300">{msg}</p>}
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
    </section>
  )
}
