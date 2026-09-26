'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { User, Mail, Phone, AtSign, Save } from 'lucide-react'

type Profile = {
  id?: string
  name?: string | null
  username?: string | null
  email?: string | null
  phone?: string | null
}

export default function Account() {
  const router = useRouter()

  const [profile, setProfile] = useState<Profile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      const supabase = supabaseBrowser()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!mounted) return

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setProfile({
        ...data,
        email: data?.email || user.email || '',
      })

      setLoading(false)
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [router])

  async function saveProfile(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSaving(true)
    setMessage('')
    setError('')

    const supabase = supabaseBrowser()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: profile.name || '',
        phone: profile.phone || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setMessage('Profil berhasil disimpan.')
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />

          <p className="mt-4 text-sm text-slate-400">
            Memuat profil...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wider text-cyan-300">
          Account
        </p>

        <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">
          Profile
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
          Kelola informasi akun kamu di sini.
        </p>
      </div>

      <form
        onSubmit={saveProfile}
        className="glass rounded-3xl border border-white/10 p-5 shadow-2xl sm:p-7"
      >
        <div className="grid gap-5">
          {/* NAMA */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Nama
            </label>

            <div className="relative">
              <User
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                id="name"
                type="text"
                value={profile.name || ''}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    name: event.target.value,
                  })
                }
                placeholder="Masukkan nama"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
          </div>

          {/* USERNAME */}
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Username
            </label>

            <div className="relative">
              <AtSign
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                id="username"
                type="text"
                value={profile.username || ''}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-slate-500 outline-none"
              />
            </div>

            <p className="mt-2 text-xs text-slate-600">
              Username tidak dapat diubah.
            </p>
          </div>

          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              Email
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                id="email"
                type="email"
                value={profile.email || ''}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-slate-500 outline-none"
              />
            </div>

            <p className="mt-2 text-xs text-slate-600">
              Email akun tidak dapat diubah dari halaman ini.
            </p>
          </div>

          {/* WHATSAPP */}
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-semibold text-slate-200"
            >
              WhatsApp
            </label>

            <div className="relative">
              <Phone
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={profile.phone || ''}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    phone: event.target.value,
                  })
                }
                placeholder="Contoh: 081234567890"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="text-sm leading-6 text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* SUCCESS */}
        {message && (
          <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
            <p className="text-sm leading-6 text-cyan-300">
              {message}
            </p>
          </div>
        )}

        {/* BUTTON */}
        <div className="mt-7 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary inline-flex min-w-[140px] items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={17} />

            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </main>
  )
}