'use client'

import { ArrowLeft } from 'lucide-react'

export default function BackButton() {
  function handleBack() {
    const referrer = document.referrer

    if (referrer) {
      try {
        const referrerUrl = new URL(referrer)

        if (
          referrerUrl.origin === window.location.origin &&
          window.history.length > 1
        ) {
          window.history.back()
          return
        }
      } catch {
        // Jika referrer tidak valid, lanjut ke fallback Home.
      }
    }

    window.location.assign('/')
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white active:scale-[0.98]"
      aria-label="Kembali ke halaman sebelumnya"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>Kembali</span>
    </button>
  )
}
