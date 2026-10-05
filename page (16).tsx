'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

const statusSlug: Record<string, string> = {
  PENDING_PAYMENT: 'menunggu-pembayaran',
  PAYMENT_RECEIVED: 'pembayaran-diterima',
  PROCESSING: 'sedang-diproses',
  SUCCESS: 'berhasil',
  FAILED: 'gagal',
  CANCELLED: 'dibatalkan',
  EXPIRED: 'kedaluwarsa',
  REFUNDED: 'dikembalikan',
}

function OrderEntryContent() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id') || ''

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!id) {
        router.replace('/orders')
        return
      }

      const s = supabaseBrowser()

      const {
        data: { user },
      } = await s.auth.getUser()

      if (!user) {
        router.replace(`/login?next=/order/?id=${encodeURIComponent(id)}`)
        return
      }

      const { data: order } = await s
        .from('orders')
        .select('id,user_id,status')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (!order) {
        router.replace('/orders')
        return
      }

      if (order.user_id !== user.id) {
        const { data: profile } = await s
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!['owner', 'admin'].includes(profile?.role)) {
          router.replace('/orders')
          return
        }
      }

      const slug = statusSlug[order.status] || 'menunggu-pembayaran'

      router.replace(`/order/${slug}?id=${encodeURIComponent(id)}`)
    })()

    return () => {
      cancelled = true
    }
  }, [id, router])

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-400">
      Memuat transaksi...
    </main>
  )
}

export default function OrderEntryPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-400">
          Memuat transaksi...
        </main>
      }
    >
      <OrderEntryContent />
    </Suspense>
  )
}
