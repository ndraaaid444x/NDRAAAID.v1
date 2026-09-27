'use client'

import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Headphones,
  Radio,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [games, setGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gameError, setGameError] = useState('')

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
  fetch(
    `${supabaseUrl}/rest/v1/home_running_text?${runningParams.toString()}`,
    {
      method: 'GET',
      headers,
      cache: 'no-store',
    }
  ),
  fetch(
    `${supabaseUrl}/rest/v1/customer_reviews?${reviewParams.toString()}`,
    {
      method: 'GET',
      headers,
      cache: 'no-store',
    }
  ),
])

if (!mounted) return

// Running Text berdiri sendiri.
// Kalau gagal, jangan blokir Customer Reviews.
if (runningResponse.ok) {
  try {
    const runningData = await runningResponse.json()

    setRunningText(
      Array.isArray(runningData) && runningData.length
        ? runningData[0]
        : null
    )
  } catch (error) {
    console.error('Gagal membaca Running Text:', error)
    setRunningText(null)
  }
}

// Customer Reviews berdiri sendiri.
if (reviewResponse.ok) {
  try {
    const reviewData = await reviewResponse.json()

    setReviews(
      Array.isArray(reviewData)
        ? reviewData
        : []
    )

    setActiveReview(0)
  } catch (error) {
    console.error('Gagal membaca Customer Reviews:', error)
    setReviews([])
  }
} else {
  const reviewError = await reviewResponse.text().catch(() => '')
  console.error(
    'Customer Reviews HTTP error:',
    reviewResponse.status,
    reviewError
  )
}
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

  return (
    <div>
      {/* =====================================================
          PROMO
      ===================================================== */}

      {!loadingPromo && promo && (
        <section
          id="promo"
          className="mx-auto max-w-7xl px-4 py-10"
        >
          <div className="glass overflow-hidden rounded-3xl border border-pink-400/10">
            {promo.content_type !== 'text' && promo.banner_url && (
              /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(promo.banner_url) ? (
                <video
                  src={promo.banner_url}
                  aria-label={promo.name || 'Banner Promo'}
                  className="max-h-[520px] w-full object-cover"
                  autoPlay muted loop playsInline
                />
              ) : (
                <img
                  src={promo.banner_url}
                  alt={promo.name || 'Banner Promo'}
                  className="max-h-[520px] w-full object-cover"
                />
              )
            )}

            {promo.content_type !== 'image' && (
              <div className="p-6 md:p-8">
                {promo.custom_text && (
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-pink-300">
                    {promo.custom_text}
                  </p>
                )}

                {promo.name && (
                  <h2 className="mt-2 text-3xl font-black">
                    {promo.name}
                  </h2>
                )}

                {promo.description && (
                  <p className="mt-3 max-w-3xl text-slate-400">
                    {promo.description}
                  </p>
                )}

                {promo.code && (
                  <div className="mt-4 inline-flex rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-2 text-sm font-black text-pink-200">
                    Kode: {promo.code}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {!loadingPromo && !promo && promoError && (
        <section className="mx-auto max-w-7xl px-4 py-4">
          <p className="text-xs text-slate-500">Banner Promo belum dapat dimuat.</p>
        </section>
      )}

      {/* =====================================================
          RUNNING TEXT
      ===================================================== */}

      {runningText?.text_content && (
        <section className="mx-auto max-w-7xl px-4 pt-4">
          <div className="relative overflow-hidden rounded-xl border border-cyan-400/20 bg-[#070b12] shadow-[0_0_24px_rgba(34,211,238,.05)]">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#070b12] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#070b12] to-transparent" />
            <div className="flex min-h-10 items-center overflow-hidden">
              <div className="shrink-0 px-3 text-cyan-300">⚡</div>
              <div
                className="whitespace-nowrap text-xs font-black uppercase tracking-[0.12em] text-slate-200"
                style={{
                  animation: `ndraaaid-marquee ${Math.max(8, Math.min(60, Number(runningText.speed_ms || 18000) / 1000))}s linear infinite`,
                }}
              >
                <span className="mr-16">{runningText.text_content}</span>
                <span>{runningText.text_content}</span>
              </div>
            </div>
          </div>
          <style jsx>{`
            @keyframes ndraaaid-marquee {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
          `}</style>
        </section>
      )}


      {/* =====================================================
          BROADCAST WIDGETS — COMPACT / SIDE BY SIDE
      ===================================================== */}

      {!loadingBroadcast && (currentBroadcast || linkedBroadcast) && (
        <section className="mx-auto max-w-7xl px-4 pt-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {currentBroadcast && (
              <div
                className="relative min-w-0 overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#07131c] via-[#050a11] to-[#07050f] shadow-[0_0_28px_rgba(34,211,238,.06)] select-none"
                onPointerDown={handleBroadcastPointerDown}
                onPointerUp={handleBroadcastPointerUp}
                onPointerCancel={handleBroadcastPointerUp}
                style={{ touchAction: 'pan-y' }}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-400/10 blur-2xl" />
                <div className="relative flex min-h-[118px] flex-col justify-between p-3 sm:min-h-[126px] sm:p-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Radio size={13} className="text-cyan-300" />
                      <span className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
                        {currentBroadcast.type}
                      </span>
                    </div>
                    <h2 className="mt-2 line-clamp-1 text-sm font-black text-white sm:text-base">
                      {currentBroadcast.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400 sm:text-xs">
                      {currentBroadcast.message}
                    </p>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {cyberBroadcasts.map((item, index) => (
                      <span
                        key={item.id}
                        className={`h-1 rounded-full transition-all ${index === activeBroadcast ? 'w-6 bg-cyan-300' : 'w-1 bg-slate-700'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {linkedBroadcast && (
              <div className="relative min-w-0 overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-[#190719] via-[#100512] to-[#09030b] shadow-[0_0_32px_rgba(217,70,239,.10)]">
                <div className="pointer-events-none absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-2xl" />
                <div className="relative flex min-h-[118px] flex-col justify-between p-3 sm:min-h-[126px] sm:p-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ExternalLink size={13} className="text-fuchsia-300" />
                      <span className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-fuchsia-300">
                        {linkedBroadcast.type}
                      </span>
                    </div>
                    <h2 className="mt-2 line-clamp-1 text-sm font-black text-white sm:text-base">
                      {linkedBroadcast.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400 sm:text-xs">
                      {linkedBroadcast.message}
                    </p>
                  </div>
                  <div className="mt-2">
                    {String(linkedBroadcast.link_url).startsWith('/') ? (
                      <Link
                        href={linkedBroadcast.link_url}
                        className="inline-flex max-w-full items-center rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1.5 text-[10px] font-black text-fuchsia-100 transition hover:bg-fuchsia-500/25 sm:text-xs"
                      >
                        <span className="truncate">{linkedBroadcast.link_label || 'Lihat'}</span>
                        <ArrowRight size={12} className="ml-1 shrink-0" />
                      </Link>
                    ) : (
                      <a
                        href={linkedBroadcast.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1.5 text-[10px] font-black text-fuchsia-100 transition hover:bg-fuchsia-500/25 sm:text-xs"
                      >
                        <span className="truncate">{linkedBroadcast.link_label || 'Lihat'}</span>
                        <ExternalLink size={12} className="ml-1 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          ULASAN PELANGGAN — COMPACT, AUTO 5 DETIK
      ===================================================== */}

      {reviews.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            <span className="text-cyan-300">★</span> Ulasan Pelanggan
          </div>
          <div className="relative overflow-hidden rounded-xl border border-cyan-400/15 bg-gradient-to-r from-[#08131a] via-[#090a12] to-[#120813] shadow-[0_0_22px_rgba(34,211,238,.05)]">
            <div className="relative min-h-[76px] px-4 py-3">
              {reviews.map((review, index) => (
                <div
                  key={review.id}
                  className={`transition-opacity duration-500 ${index === activeReview ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}`}
                >
                  <div className="flex min-h-[50px] items-center gap-3">
                    <div className="shrink-0 text-[13px] tracking-tight text-amber-300">
                      {'★'.repeat(Math.max(1, Math.min(5, Number(review.rating || 5))))}
                    </div>
                    <p className="min-w-0 flex-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-200">
                      “{review.review_text}”
                    </p>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[11px] font-black text-slate-300">{review.reviewer_display}</p>
                      <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">✓ Top Up Berhasil</p>
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between sm:hidden">
                    <span className="text-[10px] font-black text-slate-400">{review.reviewer_display}</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">✓ Berhasil</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          GAME POPULER
      ===================================================== */}

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-bold text-cyan-300">
              DISCOVER
            </p>

            <h2 className="mt-1 text-3xl font-black">
              Game Populer
            </h2>
          </div>

          <Link
            href="/games/"
            className="text-sm font-bold text-slate-300"
          >
            Lihat semua →
          </Link>
        </div>

        {loadingGames && (
          <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />

            <p className="mt-3 text-sm text-slate-400">
              Memuat game...
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Mohon tunggu sebentar
            </p>
          </div>
        )}

        {!loadingGames &&
          gameError && (
            <div className="mt-7 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="font-bold text-red-300">
                Game gagal dimuat
              </p>

              <p className="mt-2 break-words text-sm text-red-200/80">
                {gameError}
              </p>

              <button
                type="button"
                onClick={() => {
                  window.location.reload()
                }}
                className="btn btn-muted mt-4"
              >
                Muat Ulang
              </button>
            </div>
          )}

        {!loadingGames &&
          !gameError &&
          games.length === 0 && (
            <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
              Game tidak ditemukan.
            </div>
          )}

        {!loadingGames &&
          !gameError &&
          games.length > 0 && (
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {games
                .slice(0, 10)
                .map((g) => (
                  <Link
                    key={g.id}
                    href={`/game/?slug=${encodeURIComponent(
                      g.slug
                    )}`}
                    className="glass group overflow-hidden rounded-2xl p-4 transition hover:-translate-y-1 hover:border-purple-400/40"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-900 text-4xl">
                      {g.logo_url ? (
                        <img
                          src={g.logo_url}
                          alt={g.name}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        '🎮'
                      )}
                    </div>

                    <h3 className="mt-3 font-bold">
                      {g.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Top Up →
                    </p>
                  </Link>
                ))}
            </div>
          )}
      </section>


    </div>
  )
}