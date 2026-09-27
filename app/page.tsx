'use client'

import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
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
          BROADCAST WIDGETS
          Dua widget kecil sejajar kiri-kanan.
          TANPA label tambahan seperti LIVE / CYBER / INCOMING.
      ===================================================== */}

      {!loadingBroadcast &&
        (currentBroadcast || linkedBroadcast) && (
          <section className="mx-auto max-w-5xl px-4 pt-5">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {/* BROADCAST TANPA LINK */}
              {currentBroadcast ? (
                <div
                  className="relative min-w-0 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#070a12] shadow-[0_0_24px_rgba(34,211,238,.06)] select-none"
                  onPointerDown={handleBroadcastPointerDown}
                  onPointerUp={handleBroadcastPointerUp}
                  onPointerCancel={handleBroadcastPointerUp}
                  style={{
                    touchAction: 'pan-y',
                    cursor:
                      cyberBroadcasts.length > 1
                        ? 'grab'
                        : 'default',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,.10),transparent_55%)]" />

                  <div className="relative p-3 sm:p-4 md:p-5">
                    <div className="overflow-hidden">
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{
                          transform: `translateX(-${activeBroadcast * 100}%)`,
                        }}
                      >
                        {cyberBroadcasts.map((broadcast) => (
                          <div
                            key={broadcast.id}
                            className="w-full shrink-0 pr-1"
                          >
                            <h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-base md:text-lg">
                              {broadcast.title}
                            </h3>

                            <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-400 sm:text-xs md:text-sm">
                              {broadcast.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {cyberBroadcasts.length > 1 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        {cyberBroadcasts.map((item, index) => (
                          <span
                            key={item.id}
                            className={`h-1 rounded-full transition-all duration-300 ${
                              index === activeBroadcast
                                ? 'w-5 bg-cyan-300'
                                : 'w-1 bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div />
              )}

              {/* BROADCAST DENGAN LINK */}
              {linkedBroadcast ? (
                <div className="relative min-w-0 overflow-hidden rounded-2xl border border-red-500/20 bg-[#0b0507] shadow-[0_0_24px_rgba(220,38,38,.06)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(239,68,68,.10),transparent_55%)]" />

                  <div className="relative flex h-full flex-col p-3 sm:p-4 md:p-5">
                    <h3 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-base md:text-lg">
                      {linkedBroadcast.title}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-400 sm:text-xs md:text-sm">
                      {linkedBroadcast.message}
                    </p>

                    <div className="mt-auto pt-3">
                      {String(linkedBroadcast.link_url).startsWith('/') ? (
                        <Link
                          href={linkedBroadcast.link_url}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-red-500/15 px-3 py-2 text-[11px] font-black text-red-200 ring-1 ring-red-500/25 transition hover:bg-red-500/25 sm:text-xs"
                        >
                          {linkedBroadcast.link_label || 'Lihat'}
                          <ArrowRight size={14} className="ml-1.5" />
                        </Link>
                      ) : (
                        <a
                          href={linkedBroadcast.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-xl bg-red-500/15 px-3 py-2 text-[11px] font-black text-red-200 ring-1 ring-red-500/25 transition hover:bg-red-500/25 sm:text-xs"
                        >
                          {linkedBroadcast.link_label || 'Lihat'}
                          <ExternalLink size={13} className="ml-1.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div />
              )}
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