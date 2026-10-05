'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function PaymentProof({
  orderId,
}: {
  orderId: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState('')

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected = e.target.files?.[0] || null

    setFile(selected)
    setMsg('')
    setPreview('')

    if (selected) {
      setPreview(URL.createObjectURL(selected))
    }
  }

  async function upload() {
    if (!file) {
      setMsg('Pilih file terlebih dahulu.')
      return
    }

    setLoading(true)
    setMsg('')

    const s = supabaseBrowser()

    const {
      data: { user },
    } = await s.auth.getUser()

    if (!user) {
      setMsg('Silakan login.')
      setLoading(false)
      return
    }

    if (
      file.size > 5 * 1024 * 1024 ||
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(file.type)
    ) {
      setMsg(
        'File harus JPG, PNG, atau WEBP maksimal 5MB.'
      )
      setLoading(false)
      return
    }

    const safe = file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    )

    const path =
      `${user.id}/${orderId}/` +
      `${crypto.randomUUID()}-${safe}`

    const up = await s.storage
      .from('payment-proofs')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      })

    if (up.error) {
      setMsg(
        'Upload gagal. Silakan coba lagi.'
      )
      setLoading(false)
      return
    }

    const { error } = await s
      .from('payment_proofs')
      .insert({
        order_id: orderId,
        user_id: user.id,
        storage_path: path,
      })

    if (error) {
      setMsg(
        'Bukti tersimpan di storage tetapi pencatatan gagal. Hubungi Admin.'
      )
    } else {
      setMsg(
        'Bukti pembayaran berhasil dikirim. Admin akan memverifikasi secara manual.'
      )
      setFile(null)
      setPreview('')
    }

    setLoading(false)
  }

  return (
    <div className="mt-8 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">
      <h2 className="font-black">
        Upload Bukti Pembayaran
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        JPG/JPEG/PNG/WEBP maksimal 5MB.
      </p>

      <input
        className="mt-4 w-full text-sm"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />

      {file && (
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold text-slate-200">
            File dipilih:
          </p>

          <p className="mt-1 break-all text-sm text-cyan-300">
            {file.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {(file.size / 1024).toFixed(1)} KB
          </p>

          {preview && (
            <img
              src={preview}
              alt="Preview bukti pembayaran"
              className="mt-4 max-h-72 rounded-xl object-contain"
            />
          )}
        </div>
      )}

      <button
        className="btn btn-primary mt-4"
        onClick={upload}
        disabled={loading}
      >
        {loading
          ? 'Mengunggah...'
          : 'Kirim Bukti'}
      </button>

      {msg && (
        <p className="mt-3 text-sm text-cyan-300">
          {msg}
        </p>
      )}
    </div>
  )
}
