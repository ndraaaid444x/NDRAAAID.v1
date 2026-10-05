'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { MessageCircle, X, Send } from 'lucide-react'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [room, setRoom] = useState<any>()
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    let channel: any
    let mounted = true

    ;(async () => {
      const s = supabaseBrowser()

      const {
        data: { user }
      } = await s.auth.getUser()

      if (!user || !mounted) return

      let { data: r, error: roomError } = await s
        .from('chat_rooms')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'OPEN')
        .maybeSingle()

      if (roomError) {
        setError(roomError.message)
        return
      }

      if (!r) {
        const result = await s
          .from('chat_rooms')
          .insert({
            user_id: user.id,
            status: 'OPEN'
          })
          .select()
          .single()

        if (result.error) {
          setError(result.error.message)
          return
        }

        r = result.data
      }

      if (!r || !mounted) return

      setRoom(r)

      const { data: m, error: messageError } = await s
        .from('chat_messages')
        .select('*')
        .eq('room_id', r.id)
        .order('created_at', { ascending: true })

      if (messageError) {
        setError(messageError.message)
        return
      }

      setMessages(m || [])

      channel = s
        .channel('chat-' + r.id)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${r.id}`
          },
          payload => {
            setMessages(v =>
              v.some(x => x.id === payload.new.id)
                ? v
                : [...v, payload.new]
            )
          }
        )
        .subscribe()
    })()

    return () => {
      mounted = false

      if (channel) {
        supabaseBrowser().removeChannel(channel)
      }
    }
  }, [open])

  async function send() {
    const message = text.trim()

    if (!message || !room || sending) return

    setSending(true)
    setError('')

    const s = supabaseBrowser()

    const {
      data: { user }
    } = await s.auth.getUser()

    if (!user) {
      setError('Silakan login terlebih dahulu.')
      setSending(false)
      return
    }

    const { data, error: sendError } = await s
      .from('chat_messages')
      .insert({
        room_id: room.id,
        sender_id: user.id,
        message
      })
      .select()
      .single()

    if (sendError) {
      console.error('CHAT SEND ERROR:', sendError)
      setError(sendError.message)
      setSending(false)
      return
    }

    if (data) {
      setMessages(v =>
        v.some(x => x.id === data.id)
          ? v
          : [...v, data]
      )
    }

    setText('')
    setSending(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 shadow-2xl"
      >
        {open ? <X /> : <MessageCircle />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#08101e] shadow-2xl">

          <div className="border-b border-white/10 p-4">
            <b>NDRAAAID Support</b>
            <p className="text-xs text-emerald-300">
              ● Online / akan ditangani CS
            </p>
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-4">

            {!messages.length && (
              <div className="rounded-2xl bg-white/5 p-3 text-sm text-slate-400">
                Halo! 👋 Ada yang bisa kami bantu?
              </div>
            )}

            {messages.map(m => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  m.sender_id === room?.user_id
                    ? 'ml-auto bg-purple-500/20'
                    : 'bg-white/5'
                }`}
              >
                {m.message}
              </div>
            ))}

          </div>

          {error && (
            <div className="mx-3 mb-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2 border-t border-white/10 p-3">

            <input
              className="input"
              value={text}
              disabled={sending}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') send()
              }}
              placeholder="Tulis pesan..."
            />

            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="btn btn-primary px-3 disabled:opacity-50"
            >
              <Send size={17} />
            </button>

          </div>

        </div>
      )}
    </>
  )
}
