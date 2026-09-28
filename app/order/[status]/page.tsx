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

export default function OrderStatusPage() {
  return <OrderStatusClient />
}
