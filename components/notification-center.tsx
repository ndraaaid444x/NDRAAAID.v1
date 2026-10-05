'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Bell } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

function statusTone(title: string, body: string) {
  const text = `${title} ${body}`.toUpperCase()
  if (text.includes('SUCCESS') || text.includes('BERHASIL')) return 'text-cyan-300'
  if (text.includes('PROCESSING') || text.includes('PROSES')) return 'text-amber-300'
  return 'text-slate-300'
}

export default function NotificationCenter() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const s = supabaseBrowser()
    const { data: { user } } = await s.auth.getUser()
    if (!user) { setRows([]); setLoading(false); return }
    const { data } = await s.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function read(id: string) {
    const now = new Date().toISOString()
    const s = supabaseBrowser()
    await s.from('notifications').update({ read_at: now }).eq('id', id)
    setRows(v => v.map(x => x.id === id ? { ...x, read_at: now } : x))
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:py-10">
      <div className="mb-5">
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Notifikasi</h1>
        <p className="mt-1 text-sm text-slate-500">Informasi terbaru tentang akun dan pesananmu.</p>
      </div>

      <div className="space-y-2.5">
        {loading && <div className="glass rounded-xl p-4 text-sm text-slate-500">Memuat notifikasi...</div>}
        {!loading && rows.map(n => (
          <button key={n.id} onClick={() => read(n.id)} className={`glass w-full rounded-xl border p-3.5 text-left transition hover:border-white/15 md:p-4 ${!n.read_at ? 'border-cyan-400/20 bg-cyan-400/[.025]' : 'border-white/[.07]'}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[.07] bg-white/[.025]">
                {String(n.title || '').toLowerCase().includes('status') ? <Clock3 size={14} className={statusTone(n.title || '', n.body || '')} /> : <Bell size={14} className={statusTone(n.title || '', n.body || '')} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <b className={`text-sm ${n.read_at ? 'text-slate-200' : 'text-white'}`}>{n.title}</b>
                  <span className="shrink-0 text-[10px] text-slate-600">{new Date(n.created_at).toLocaleString('id-ID')}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">{n.body}</p>
              </div>
              {!n.read_at && <CheckCircle2 size={13} className="mt-1 shrink-0 text-cyan-400/70" />}
            </div>
          </button>
        ))}
        {!loading && !rows.length && <div className="glass rounded-xl p-5 text-center text-sm text-slate-500">Belum ada notifikasi.</div>}
      </div>
    </main>
  )
}
