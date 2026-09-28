'use client'

import Link from 'next/link'
import { Plus_Jakarta_Sans } from 'next/font/google'
import {
  ArrowRight,
  Radio,
  ExternalLink,
  Gamepad2,
  Monitor,
  Ticket,
  Tv,
  Star,
  Search,
  Bell,
  Menu,
  LayoutDashboard,
  ReceiptText,
  UserRound,
  Wallet,
  ChevronRight,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' })

function homeCategoryLabel(category: any) {
  if (category?.slug === 'mobile-games') return 'Game Mobile'
  if (category?.slug === 'pc-games') return 'PC Game'
  if (category?.slug === 'voucher-digital') return 'Voucher'
  if (category?.slug === 'console') return 'Console'
  return category?.name || 'Kategori'
}

export default function Home() {
  const [games, setGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gameError, setGameError] = useState('')
  const [homeCategories, setHomeCategories] = useState<any[]>([])
  const [selectedHomeCategory, setSelectedHomeCategory] = useState('popular')

  const [promo, setPromo] = useState<any | null>(null)
  const [loadingPromo, setLoadingPromo] = useState(true)
  const [promoError, setPromoError] = useState('')

  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loadingBroadcast, setLoadingBroadcast] = useState(true)
  const [activeBroadcast, setActiveBroadcast] = useState(0)

  const [runningText, setRunningText] = useState<any | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [activeReview, setActiveReview] = useState(0)

  const broadcastStartX = useRef<number | null>(null)

  /* =========================================================
     LOAD ACTIVE BANNER PROMO
  ========================================================= */

  useEffect(() => {
    let mounted = true

    async function loadPromo() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        if (mounted) {
          setPromo(null)
          setPromoError('Konfigurasi Supabase tidak ditemukan.')
          setLoadingPromo(false)
        }
        return
      }

      try {
        const params = new URLSearchParams()
        params.set('select', 'id,name,custom_text,description,code,banner_url,content_type,is_active')
        params.set('is_active', 'eq.true')
        params.set('limit', '1')

        const response = await fetch(
          `${supabaseUrl}/rest/v1/promotions?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Accept: 'application/json',
              'Cache-Control': 'no-cache, no-store, max-age=0',
              Pragma: 'no-cache',
            },
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          const message = await response.text()
          throw new Error(`Promo HTTP ${response.status}: ${message}`)
        }

        const data = await response.json()
        if (!mounted) return

        setPromo(Array.isArray(data) && data.length ? data[0] : null)
        setPromoError('')
      } catch (error: any) {
        console.error('Gagal memuat Banner Promo:', error)
        if (mounted) {
          setPromo(null)
          setPromoError(error?.message || 'Banner Promo gagal dimuat.')
        }
      } finally {
        if (mounted) setLoadingPromo(false)
      }
    }

    loadPromo()
    const interval = setInterval(loadPromo, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  /* =========================================================
     LOAD GAMES
  ========================================================= */

  useEffect(() => {
    let mounted = true

    async function loadGames() {
      if (!mounted) return

      setLoadingGames(true)
      setGameError('')

      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL

      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        if (mounted) {
          setGames([])
          setGameError(
            'Konfigurasi Supabase tidak ditemukan.'
          )
          setLoadingGames(false)
        }

        return
      }

      const controller = new AbortController()

      const timeout = setTimeout(() => {
        controller.abort()
      }, 8000)

      try {
        const url =
          `${supabaseUrl}/rest/v1/games` +
          `?select=*` +
          `&is_active=eq.true` +
          `&order=name.asc` +
          `&limit=50`

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
            'Cache-Control':
              'no-cache, no-store, max-age=0',
            Pragma: 'no-cache',
          },
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          const message = await response.text()

          throw new Error(
            `Supabase HTTP ${response.status}: ${message}`
          )
        }

        const data = await response.json()

        if (!mounted) return

        if (!Array.isArray(data)) {
          throw new Error(
            'Format data game tidak valid.'
          )
        }

        const uniqueGames = Array.from(
          new Map(
            data.map((game: any) => [
              game.id,
              game,
            ])
          ).values()
        )

        uniqueGames.sort(
          (a: any, b: any) => {
            const popularA =
              a?.popular === true ? 1 : 0

            const popularB =
              b?.popular === true ? 1 : 0

            if (popularA !== popularB) {
              return popularB - popularA
            }

            return String(
              a?.name || ''
            ).localeCompare(
              String(b?.name || ''),
              'id'
            )
          }
        )

        setGames(uniqueGames)
      } catch (error: any) {
        if (!mounted) return

        console.error(
          'Gagal memuat game:',
          error
        )

        setGames([])

        if (error?.name === 'AbortError') {
          setGameError(
            'Server game tidak merespons dalam 8 detik. Silakan coba lagi.'
          )
        } else {
          setGameError(
            error?.message ||
              'Terjadi kesalahan saat memuat game.'
          )
        }
      } finally {
        clearTimeout(timeout)

        if (mounted) {
          setLoadingGames(false)
        }
      }
    }

    loadGames()

    return () => {
      mounted = false
    }
  }, [])

  /* =========================================================
     LOAD HOME CATEGORIES
  ========================================================= */

  useEffect(() => {
    let mounted = true

    async function loadHomeCategories() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) return

      try {
        const params = new URLSearchParams()
        params.set('select', 'id,name,slug,sort_order,show_on_home,is_active')
        params.set('is_active', 'eq.true')
        params.set('show_on_home', 'eq.true')
        params.set('order', 'sort_order.asc,name.asc')

        const response = await fetch(`${supabaseUrl}/rest/v1/game_categories?${params.toString()}`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
            'Cache-Control': 'no-cache, no-store, max-age=0',
          },
          cache: 'no-store',
        })

        if (!response.ok) throw new Error(await response.text())
        const data = await response.json()
        if (mounted) setHomeCategories(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Gagal memuat kategori Home:', error)
        if (mounted) setHomeCategories([])
      }
    }

    loadHomeCategories()
    const interval = setInterval(loadHomeCategories, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  /* =========================================================
     LOAD BROADCAST
  ========================================================= */

  useEffect(() => {
    let mounted = true

    async function loadBroadcasts() {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL

      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        if (mounted) {
          setBroadcasts([])
          setLoadingBroadcast(false)
        }

        return
      }

      try {
        const now =
          new Date().toISOString()

        const params = new URLSearchParams()

        params.set(
          'select',
          'id,title,message,type,starts_at,ends_at,link_url,link_label,is_active,created_at'
        )

        params.set(
          'is_active',
          'eq.true'
        )

        params.set(
          'starts_at',
          `lte.${now}`
        )

        params.set(
          'ends_at',
          `gt.${now}`
        )

        params.set(
          'order',
          'created_at.desc'
        )

        /*
          Ambil lebih banyak data supaya broadcast
          dengan link dan tanpa link tidak terpotong.
        */
        params.set(
          'limit',
          '50'
        )

        const response = await fetch(
          `${supabaseUrl}/rest/v1/broadcasts?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Accept: 'application/json',
              'Cache-Control':
                'no-cache, no-store, max-age=0',
              Pragma: 'no-cache',
            },
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          const message =
            await response.text()

          throw new Error(
            `Broadcast HTTP ${response.status}: ${message}`
          )
        }

        const data =
          await response.json()

        if (!mounted) return

        const nextBroadcasts =
          Array.isArray(data)
            ? data
            : []

        setBroadcasts(nextBroadcasts)

        setActiveBroadcast(0)
      } catch (error) {
        console.error(
          'Gagal memuat broadcast:',
          error
        )

        if (mounted) {
          setBroadcasts([])
          setActiveBroadcast(0)
        }
      } finally {
        if (mounted) {
          setLoadingBroadcast(false)
        }
      }
    }

    loadBroadcasts()

    const interval =
      setInterval(
        loadBroadcasts,
        30000
      )

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  /* =========================================================
     FILTER BROADCAST

     CYBER:
     Hanya broadcast TANPA link.

     LINK:
     Hanya broadcast DENGAN link.
  ========================================================= */

  const cyberBroadcasts =
    broadcasts.filter(
      (broadcast) =>
        !String(
          broadcast?.link_url || ''
        ).trim()
    )

  const linkedBroadcasts =
    broadcasts.filter(
      (broadcast) =>
        Boolean(
          String(
            broadcast?.link_url || ''
          ).trim()
        )
    )

  const currentBroadcast =
    cyberBroadcasts.length > 0
      ? cyberBroadcasts[
          activeBroadcast %
            cyberBroadcasts.length
        ]
      : null

  const linkedBroadcast =
    linkedBroadcasts.length > 0
      ? linkedBroadcasts[0]
      : null

  /* =========================================================
     AUTO SLIDER
     Tetap 5 detik tanpa tulisan AUTO
  ========================================================= */

  useEffect(() => {
    if (cyberBroadcasts.length <= 1) {
      return
    }

    const timer = setTimeout(() => {
      setActiveBroadcast(
        (current) =>
          (current + 1) %
          cyberBroadcasts.length
      )
    }, 5000)

    return () => {
      clearTimeout(timer)
    }
  }, [
    activeBroadcast,
    cyberBroadcasts.length,
  ])

  /* =========================================================
     SWIPE / DRAG CYBER BROADCAST
  ========================================================= */

  function handleBroadcastPointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (cyberBroadcasts.length <= 1) {
      return
    }

    broadcastStartX.current =
      event.clientX

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      )
    } catch {}
  }

  function handleBroadcastPointerUp(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (
      broadcastStartX.current === null ||
      cyberBroadcasts.length <= 1
    ) {
      broadcastStartX.current = null
      return
    }

    const distance =
      event.clientX -
      broadcastStartX.current

    if (Math.abs(distance) >= 50) {
      if (distance < 0) {
        setActiveBroadcast(
          (current) =>
            (current + 1) %
            cyberBroadcasts.length
        )
      } else {
        setActiveBroadcast(
          (current) =>
            (current - 1 +
              cyberBroadcasts.length) %
            cyberBroadcasts.length
        )
      }
    }

    broadcastStartX.current = null

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      )
    } catch {}
  }

  /* =========================================================
     RUNNING TEXT + CUSTOMER REVIEWS
     Review publik hanya yang sudah disetujui Admin.
  ========================================================= */

  useEffect(() => {
    let mounted = true

    async function loadHomeExtras() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) return

      try {
        const runningParams = new URLSearchParams()
        runningParams.set('select', 'id,text_content,is_active,speed_ms')
        runningParams.set('is_active', 'eq.true')
        runningParams.set('limit', '1')

        const reviewParams = new URLSearchParams()
        reviewParams.set('select', 'id,reviewer_display,rating,review_text,created_at')
        reviewParams.set('is_approved', 'eq.true')
        reviewParams.set('order', 'created_at.desc')
        reviewParams.set('limit', '50')

        const headers = {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
        }

        const [runningResponse, reviewResponse] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/home_running_text?${runningParams.toString()}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
          }),
          fetch(`${supabaseUrl}/rest/v1/customer_reviews?${reviewParams.toString()}`, {
            method: 'GET',
            headers,
            cache: 'no-store',
          }),
        ])

        if (!runningResponse.ok || !reviewResponse.ok) return

        const [runningData, reviewData] = await Promise.all([
          runningResponse.json(),
          reviewResponse.json(),
        ])

        if (!mounted) return

        setRunningText(Array.isArray(runningData) && runningData.length ? runningData[0] : null)
        setReviews(Array.isArray(reviewData) ? reviewData : [])
        setActiveReview(0)
      } catch (error) {
        console.error('Gagal memuat running text/review:', error)
      }
    }

    loadHomeExtras()
    const interval = setInterval(loadHomeExtras, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (reviews.length <= 1) return

    const timer = setTimeout(() => {
      setActiveReview((current) => (current + 1) % reviews.length)
    }, 5000)

    return () => clearTimeout(timer)
  }, [activeReview, reviews.length])

  const visibleHomeGames = selectedHomeCategory === 'popular'
    ? games.filter((g) => g.popular === true).slice(0, 9)
    : games.filter((g) => g.category_id === selectedHomeCategory)

  return (
    <main className={`${plusJakarta.className} min-h-screen bg-[#050609] text-slate-100`}>
      <header className="sticky top-0 z-40 border-b border-rose-500/10 bg-[#050609]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-3 px-4 sm:h-[74px] sm:px-6">
          <Link href="/" className="shrink-0 text-[19px] font-extrabold tracking-[-.04em] text-white sm:text-[22px]">
            NDRA<span className="text-rose-500">AAID</span><span className="ml-1 text-xs text-slate-500">.v1</span>
          </Link>
          <div className="hidden min-w-0 flex-1 md:block">
            <div className="mx-auto flex max-w-xl items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate text-xs text-slate-500">Cari game, transaksi, atau apa saja...</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" aria-label="Cari" className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-slate-300 md:hidden"><Search className="h-4 w-4" /></button>
            <button type="button" aria-label="Notifikasi" className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-slate-300"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></button>
            <Link href="/dashboard" className="hidden h-10 items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-xs text-slate-300 sm:flex"><UserRound className="h-4 w-4" />Akun</Link>
            <button type="button" aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-slate-300 sm:hidden"><Menu className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:pb-12">
        {promo && !loadingPromo && (
          <section id="promo" className="pt-5 sm:pt-7">
            <div className="overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.018]">
              {promo.content_type !== 'text' && promo.banner_url && (
                /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(promo.banner_url) ? (
                  <video src={promo.banner_url} aria-label={promo.name || 'Banner Promo'} className="max-h-[430px] w-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={promo.banner_url} alt={promo.name || 'Banner Promo'} className="max-h-[430px] w-full object-cover" />
                )
              )}
              {promo.content_type !== 'image' && (
                <div className="p-5 sm:p-6">
                  {promo.custom_text && <p className="text-[9px] uppercase tracking-[.18em] text-rose-400">{promo.custom_text}</p>}
                  {promo.name && <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">{promo.name}</h1>}
                  {promo.description && <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{promo.description}</p>}
                  {promo.code && <span className="mt-3 inline-flex rounded-lg border border-rose-400/15 bg-rose-400/5 px-2.5 py-1.5 text-[10px] font-medium text-rose-200">Kode: {promo.code}</span>}
                </div>
              )}
            </div>
          </section>
        )}

        {runningText?.text_content && (
          <section className="pt-3">
            <div className="overflow-hidden rounded-xl border border-white/[.06] bg-white/[.018]">
              <div className="flex min-h-9 items-center overflow-hidden">
                <span className="px-3 text-[11px] text-rose-400">✦</span>
                <div className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[.1em] text-slate-400" style={{ animation: `ndraaaid-marquee ${Math.max(8, Math.min(60, Number(runningText.speed_ms || 18000) / 1000))}s linear infinite` }}>
                  <span className="mr-16">{runningText.text_content}</span><span>{runningText.text_content}</span>
                </div>
              </div>
            </div>
            <style jsx>{`@keyframes ndraaaid-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
          </section>
        )}

        <section className="pt-5 sm:pt-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Link href="/dashboard" className="group rounded-xl border border-white/[.07] bg-white/[.018] p-3 transition hover:border-rose-400/20"><div className="flex items-center justify-between"><LayoutDashboard className="h-4 w-4 text-rose-400" /><ChevronRight className="h-3.5 w-3.5 text-slate-600" /></div><p className="mt-2 text-xs font-medium text-slate-200">Dashboard</p><p className="mt-0.5 text-[10px] text-slate-600">Ringkasan akun</p></Link>
            <Link href="/orders" className="group rounded-xl border border-white/[.07] bg-white/[.018] p-3 transition hover:border-blue-400/20"><div className="flex items-center justify-between"><ReceiptText className="h-4 w-4 text-blue-400" /><ChevronRight className="h-3.5 w-3.5 text-slate-600" /></div><p className="mt-2 text-xs font-medium text-slate-200">Transaksi</p><p className="mt-0.5 text-[10px] text-slate-600">Lihat pesanan</p></Link>
            <Link href="/dashboard" className="group rounded-xl border border-white/[.07] bg-white/[.018] p-3 transition hover:border-fuchsia-400/20"><div className="flex items-center justify-between"><Bell className="h-4 w-4 text-fuchsia-400" /><ChevronRight className="h-3.5 w-3.5 text-slate-600" /></div><p className="mt-2 text-xs font-medium text-slate-200">Notifikasi</p><p className="mt-0.5 text-[10px] text-slate-600">Pembaruan terbaru</p></Link>
            <Link href="/dashboard" className="group rounded-xl border border-white/[.07] bg-white/[.018] p-3 transition hover:border-emerald-400/20"><div className="flex items-center justify-between"><UserRound className="h-4 w-4 text-emerald-400" /><ChevronRight className="h-3.5 w-3.5 text-slate-600" /></div><p className="mt-2 text-xs font-medium text-slate-200">Profil</p><p className="mt-0.5 text-[10px] text-slate-600">Akun pengguna</p></Link>
          </div>
        </section>

        {!loadingBroadcast && (currentBroadcast || linkedBroadcast) && (
          <section className="pt-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentBroadcast && (
                <div className="min-w-0 rounded-xl border border-cyan-400/10 bg-cyan-400/[.018] p-3" onPointerDown={handleBroadcastPointerDown} onPointerUp={handleBroadcastPointerUp} onPointerCancel={handleBroadcastPointerUp} style={{ touchAction: 'pan-y' }}>
                  <div className="flex items-start gap-2.5"><Radio className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" /><div className="min-w-0"><p className="text-[9px] uppercase tracking-[.14em] text-cyan-400">{currentBroadcast.type}</p><h2 className="mt-1 truncate text-xs font-medium text-slate-200">{currentBroadcast.title}</h2><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{currentBroadcast.message}</p></div></div>
                  {cyberBroadcasts.length > 1 && <div className="mt-2 flex gap-1">{cyberBroadcasts.map((item, index) => <span key={item.id} className={`h-1 rounded-full ${index === activeBroadcast ? 'w-5 bg-cyan-400' : 'w-1 bg-slate-700'}`} />)}</div>}
                </div>
              )}
              {linkedBroadcast && (
                <div className="min-w-0 rounded-xl border border-fuchsia-400/10 bg-fuchsia-400/[.018] p-3">
                  <div className="flex items-start gap-2.5"><ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" /><div className="min-w-0"><p className="text-[9px] uppercase tracking-[.14em] text-fuchsia-400">{linkedBroadcast.type}</p><h2 className="mt-1 truncate text-xs font-medium text-slate-200">{linkedBroadcast.title}</h2><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{linkedBroadcast.message}</p></div></div>
                  <div className="mt-2">{String(linkedBroadcast.link_url).startsWith('/') ? <Link href={linkedBroadcast.link_url} className="inline-flex items-center gap-1 text-[10px] text-fuchsia-300">{linkedBroadcast.link_label || 'Lihat'}<ArrowRight className="h-3 w-3" /></Link> : <a href={linkedBroadcast.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-fuchsia-300">{linkedBroadcast.link_label || 'Lihat'}<ExternalLink className="h-3 w-3" /></a>}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {reviews.length > 0 && (
          <section className="pt-4">
            <div className="rounded-xl border border-white/[.07] bg-white/[.018] px-3.5 py-3">
              <div className="flex items-center justify-between gap-3"><p className="text-[9px] uppercase tracking-[.16em] text-slate-500">Customer Feedback</p><span className="text-[9px] text-emerald-400">● Online</span></div>
              {reviews.map((review, index) => index === activeReview ? <div key={review.id} className="mt-2"><p className="text-xs font-medium text-slate-300">“{review.review_text}”</p><p className="mt-1 text-[9px] text-slate-600">{review.reviewer_display} · {'★'.repeat(Math.max(1, Math.min(5, Number(review.rating || 5))))}</p></div> : null)}
            </div>
          </section>
        )}

        <section className="pt-8 sm:pt-10">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.18em] text-rose-400">Produk</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Game</h2></div><Link href="/games/" className="text-[10px] text-slate-500 hover:text-white">Lihat semua →</Link></div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => setSelectedHomeCategory('popular')} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-medium transition ${selectedHomeCategory === 'popular' ? 'border-rose-400/30 bg-rose-400/8 text-rose-200' : 'border-white/[.07] bg-white/[.018] text-slate-500'}`}><Star className="h-3 w-3" />Game Populer</button>
            {homeCategories.map((category) => (
              <button key={category.id} type="button" onClick={() => setSelectedHomeCategory(category.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-medium transition ${selectedHomeCategory === category.id ? 'border-rose-400/30 bg-rose-400/8 text-rose-200' : 'border-white/[.07] bg-white/[.018] text-slate-500'}`}>
                {category.slug === 'pc-games' ? <Monitor className="h-3 w-3" /> : category.slug === 'voucher-digital' ? <Ticket className="h-3 w-3" /> : category.slug === 'console' ? <Tv className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}
                {homeCategoryLabel(category)}
              </button>
            ))}
          </div>

          {loadingGames && <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.018] p-5 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-rose-400" /><p className="mt-2 text-[10px] text-slate-500">Memuat game...</p></div>}
          {!loadingGames && gameError && <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/[.04] p-4"><p className="text-xs text-red-300">Game gagal dimuat</p><p className="mt-1 break-words text-[10px] text-red-200/60">{gameError}</p></div>}
          {!loadingGames && !gameError && visibleHomeGames.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {visibleHomeGames.map((g) => (
                <Link key={g.id} href={`/game/?slug=${encodeURIComponent(g.slug)}`} className="group rounded-xl border border-white/[.07] bg-white/[.018] p-2.5 transition hover:-translate-y-0.5 hover:border-rose-400/20">
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-[#0b0d13]">
                    {g.logo_url ? <img src={g.logo_url} alt={g.name} className="h-full w-full object-cover" /> : <Gamepad2 className="h-7 w-7 text-slate-700" />}
                    {selectedHomeCategory === 'popular' && <span className="absolute left-1.5 top-1.5 rounded-md border border-amber-300/15 bg-black/60 px-1.5 py-0.5 text-[7px] font-medium text-amber-200">Populer</span>}
                  </div>
                  <h3 className="mt-2 truncate text-xs font-medium text-slate-200">{g.name}</h3>
                  <p className="mt-0.5 truncate text-[9px] text-slate-600">{selectedHomeCategory === 'popular' ? 'Game Populer' : homeCategoryLabel(homeCategories.find((c) => c.id === selectedHomeCategory))}</p>
                </Link>
              ))}
            </div>
          )}
          {!loadingGames && !gameError && visibleHomeGames.length === 0 && <div className="mt-4 rounded-xl border border-white/[.07] bg-white/[.018] p-5 text-center text-[10px] text-slate-600">{selectedHomeCategory === 'popular' ? 'Belum ada Game Populer yang dipilih Admin.' : 'Belum ada game di kategori ini.'}</div>}
        </section>

        <section className="pt-8 sm:pt-10">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.16em] text-slate-600">Akses cepat</p><h2 className="mt-1 text-base font-medium text-slate-200">Widget ringkas</h2></div><span className="text-[9px] text-slate-600">Rapi dan tidak dominan</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[.06] bg-white/[.015] p-3"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-cyan-400" /><p className="text-[10px] font-medium text-slate-300">Saldo Akun</p></div><p className="mt-1 text-[9px] text-slate-600">Cek saldo & deposit</p></div>
            <Link href="/orders" className="rounded-xl border border-white/[.06] bg-white/[.015] p-3"><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-blue-400" /><p className="text-[10px] font-medium text-slate-300">Transaksi</p></div><p className="mt-1 text-[9px] text-slate-600">Riwayat pesanan</p></Link>
            <Link href="/dashboard" className="rounded-xl border border-white/[.06] bg-white/[.015] p-3"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-fuchsia-400" /><p className="text-[10px] font-medium text-slate-300">Notifikasi</p></div><p className="mt-1 text-[9px] text-slate-600">Pembaruan akun</p></Link>
            <Link href="/dashboard" className="rounded-xl border border-white/[.06] bg-white/[.015] p-3"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-emerald-400" /><p className="text-[10px] font-medium text-slate-300">Profil</p></div><p className="mt-1 text-[9px] text-slate-600">Data & keamanan akun</p></Link>
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[.07] bg-[#050609]/95 px-3 py-2 backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <Link href="/" className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] text-rose-400"><LayoutDashboard className="h-4 w-4" />Home</Link>
          <Link href="/orders" className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] text-slate-500"><ReceiptText className="h-4 w-4" />Transaksi</Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] text-slate-500"><Bell className="h-4 w-4" />Notifikasi</Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] text-slate-500"><UserRound className="h-4 w-4" />Profil</Link>
        </div>
      </nav>
    </main>
  )
}
