'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import TopupForm from '@/components/topup-form'

export default function GamePage() {
  const [slug, setSlug] = useState('')
  const [game, setGame] = useState<any>()
  const [fields, setFields] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setSlug(new URLSearchParams(window.location.search).get('slug') || '')
  }, [])

  useEffect(() => {
    if (!slug) return

    ;(async () => {
      const s = supabaseBrowser()
      setLoading(true)
      setError('')

      const { data: g, error: gameError } = await s
        .from('games')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (gameError) {
        console.error('GAME LOAD ERROR:', gameError)
        setError('Game gagal dimuat. Silakan refresh halaman.')
        setLoading(false)
        return
      }

      if (!g) {
        setGame(undefined)
        setFields([])
        setProducts([])
        setLoading(false)
        return
      }

      setGame(g)

      const [fieldsResult, productsResult] = await Promise.all([
        s
          .from('game_fields')
          .select('*')
          .eq('game_id', g.id)
          .order('sort_order'),
        s
          .from('game_products')
          .select('*')
          .eq('game_id', g.id)
          .eq('is_active', true)
          .order('price'),
      ])

      if (fieldsResult.error) {
        console.error('GAME FIELDS LOAD ERROR:', fieldsResult.error)
      }

      if (productsResult.error) {
        console.error('PRODUCT LOAD ERROR:', productsResult.error)
        setProducts([])
        setError('Produk gagal dimuat dari database. Silakan refresh halaman.')
      } else {
        setProducts(productsResult.data || [])
      }

      setFields(fieldsResult.data || [])
      setLoading(false)
    })()
  }, [slug])

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center text-slate-400">
        Memuat game...
      </main>
    )
  }

  if (!game) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-3xl font-black">Game tidak ditemukan</h1>
        <a className="mt-5 inline-block text-cyan-300" href="/games/">
          Kembali ke Games
        </a>
      </main>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="glass overflow-hidden rounded-3xl">
        <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
          {game.banner_url ? (
            <img
              src={game.banner_url}
              alt={game.name || 'Game banner'}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/15 to-pink-500/10" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/5" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-6">
            <h1 className="text-xl font-black leading-tight text-white md:text-2xl">{game.name}</h1>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-300 md:text-xs">
              {game.description || 'Pilih produk dan masukkan data akunmu.'}
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <TopupForm game={game} fields={fields} products={products} />
        </div>
      </div>
    </section>
  )
}

