import { Suspense } from 'react'
import OrderStatusClient from './OrderStatusClient'

const statusSlugs = [
  'menunggu-pembayaran',
  'pembayaran-diterima',
  'sedang-diproses',
  'berhasil',
  'gagal',
  'dibatalkan',
  'kedaluwarsa',
  'dikembalikan',
]

export function generateStaticParams() {
  return statusSlugs.map((status) => ({ status }))
}

function OrderStatusFallback() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-400">
      Memuat transaksi...
    </main>
  )
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<OrderStatusFallback />}>
      <OrderStatusClient />
    </Suspense>
  )
}
