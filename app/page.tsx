'use client'

import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Headphones,
  Gamepad2,
  Radio,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [games, setGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gameError, setGameError] = useState('')

  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loadingBroadcast, setLoadingBroadcast] = useState(true)
  const [activeBroadcast, setActiveBroadcast] = useState(0)

  // Banner Promo utama dari Admin → Promosi
  const [promo, setPromo] = useState<any | null>(null)
  const [loadingPromo, setLoadingPromo] = useState(true)

  const broadcastStartX = useRef<number | null>(null)

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
     LOAD BANNER PROMO UTAMA

     Sumber data:
     public.promotions

     Hanya Banner Promo dengan is_active = true yang
     ditampilkan ke pengunjung Home.

     Tidak memakai created_at karena kolom tersebut tidak
     tersedia pada tabel promotions di database ini.
  ========================================================= */

  useEffect(() => {
    let mounted = true

    async function loadPromo() {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL

      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        if (mounted) {
          setPromo(null)
          setLoadingPromo(false)
        }
        return
      }

      const controller = new AbortController()

      const timeout = setTimeout(() => {
        controller.abort()
      }, 8000)

      try {
        const params = new URLSearchParams()

        params.set(
          'select',
          'id,name,description,code,banner_url,content_type,is_active'
        )

        params.set(
          'is_active',
          'eq.true'
        )

        params.set(
          'limit',
          '1'
        )

        const response = await fetch(
          `${supabaseUrl}/rest/v1/promotions?${params.toString()}`,
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
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          const message = await response.text()

          throw new Error(
            `Promo HTTP ${response.status}: ${message}`
          )
        }

        const data = await response.json()

        if (!mounted) return

        const activePromo =
          Array.isArray(data) && data.length > 0
            ? data[0]
            : null

        setPromo(activePromo)
      } catch (error: any) {
        console.error(
          'Gagal memuat Banner Promo:',
          error
        )

        if (mounted) {
          // Jangan menampilkan pesan error teknis kepada pembeli.
          // Jika gagal dimuat, bagian Promo cukup disembunyikan.
          setPromo(null)
        }
      } finally {
        clearTimeout(timeout)

        if (mounted) {
          setLoadingPromo(false)
        }
      }
    }

    loadPromo()

    const interval = setInterval(
      loadPromo,
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
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(139,92,246,.18),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-bold text-cyan-300">
              ⚡ MANUAL VERIFIED TOP-UP
            </div>

            <h1 className="text-5xl font-black leading-[.98] md:text-7xl">
              TOP UP GAME
              <br />

              <span className="gradient-text">
                FAVORITMU
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-slate-400">
              Top up game cepat, aman, dan mudah hanya di
              NDRAAAID. Pembayaran dan top-up saat ini
              diverifikasi serta diproses manual oleh Admin.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/games/"
                className="btn btn-primary"
              >
                Top Up Sekarang

                <ArrowRight
                  className="ml-2"
                  size={18}
                />
              </Link>

              <Link
                href="/#promo"
                className="btn btn-muted"
              >
                Lihat Promo
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <div className="glass rounded-2xl p-4">
                <Zap size={20} />

                <p className="mt-2 text-xs text-slate-400">
                  Proses cepat
                </p>
              </div>

              <div className="glass rounded-2xl p-4">
                <ShieldCheck size={20} />

                <p className="mt-2 text-xs text-slate-400">
                  Manual verified
                </p>
              </div>

              <div className="glass rounded-2xl p-4">
                <Headphones size={20} />

                <p className="mt-2 text-xs text-slate-400">
                  Support
                </p>
              </div>
            </div>
          </div>

          <div className="glass neon relative min-h-[340px] overflow-hidden rounded-[2rem] p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

            <Gamepad2 className="absolute bottom-8 right-8 h-48 w-48 text-purple-400/20" />

            <div className="relative mt-20">
              <p className="text-sm font-bold text-cyan-300">
                NDRAAAID
              </p>

              <h2 className="mt-2 text-4xl font-black">
                BONUS DIAMOND
                <br />
                SETIAP HARI*
              </h2>

              <p className="mt-4 text-sm text-slate-400">
                *Promo mengikuti ketentuan yang berlaku.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CYBER / HOLOGRAM
          KHUSUS BROADCAST TANPA LINK
      ===================================================== */}

      {!loadingBroadcast &&
        cyberBroadcasts.length > 0 &&
        currentBroadcast && (
          <section className="mx-auto max-w-7xl px-4 pt-5">
            <div
              className="group relative overflow-hidden rounded-[2rem] border border-cyan-400/25 bg-[#050713] shadow-[0_0_50px_rgba(34,211,238,.08)] select-none"
              onPointerDown={
                handleBroadcastPointerDown
              }
              onPointerUp={
                handleBroadcastPointerUp
              }
              onPointerCancel={
                handleBroadcastPointerUp
              }
              style={{
                touchAction: 'pan-y',
                cursor:
                  cyberBroadcasts.length > 1
                    ? 'grab'
                    : 'default',
              }}
            >
              {/* CYBER GLOW */}

              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />

              {/* GRID */}

              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(34,211,238,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,.35) 1px, transparent 1px)',
                  backgroundSize:
                    '32px 32px',
                }}
              />

              {/* TOP HUD */}

              <div className="relative flex items-center justify-between border-b border-cyan-400/10 px-5 py-3 sm:px-7">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={13}
                    className="text-cyan-300"
                  />

                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300 sm:text-[10px]">
                    CYBER TRANSMISSION
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden text-[9px] font-bold uppercase tracking-[0.2em] text-violet-400 sm:block">
                    LIVE DATA
                  </span>

                  <span className="text-[9px] font-black tracking-[0.2em] text-slate-500">
                    {String(
                      activeBroadcast + 1
                    ).padStart(2, '0')}
                    /
                    {String(
                      cyberBroadcasts.length
                    ).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* SLIDER TRACK */}

              <div className="relative overflow-hidden">
                <div
                  className="flex transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                  style={{
                    transform: `translateX(-${
                      activeBroadcast * 100
                    }%)`,
                  }}
                >
                  {cyberBroadcasts.map(
                    (broadcast) => (
                      <div
                        key={
                          broadcast.id
                        }
                        className="w-full shrink-0"
                      >
                        <div className="relative min-h-[235px] overflow-hidden p-6 sm:min-h-[245px] sm:p-8 md:min-h-[260px] md:p-10">
                          {/* SCAN LINE */}

                          <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />

                          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

                          {/* CORNER MARKS */}

                          <div className="pointer-events-none absolute left-4 top-4 h-5 w-5 border-l border-t border-cyan-400/50" />

                          <div className="pointer-events-none absolute right-4 top-4 h-5 w-5 border-r border-t border-violet-400/50" />

                          <div className="pointer-events-none absolute bottom-4 left-4 h-5 w-5 border-b border-l border-cyan-400/50" />

                          <div className="pointer-events-none absolute bottom-4 right-4 h-5 w-5 border-b border-r border-violet-400/50" />

                          {/* CONTENT */}

                          <div className="relative">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                                <Radio
                                  size={11}
                                />

                                LIVE
                              </span>

                              <span className="rounded-full border border-violet-400/20 bg-violet-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-300">
                                {broadcast.type}
                              </span>
                            </div>

                            <p className="mt-6 text-[9px] font-black uppercase tracking-[0.35em] text-slate-600">
                              INCOMING BROADCAST
                            </p>

                            <h2 className="mt-2 max-w-4xl text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                              {broadcast.title}
                            </h2>

                            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base md:text-lg">
                              {broadcast.message}
                            </p>
                          </div>

                          {/* BOTTOM HUD */}

                          <div className="relative mt-7 flex items-end justify-between">
                            <div className="flex items-center gap-1.5">
                              {cyberBroadcasts.map(
                                (
                                  item,
                                  index
                                ) => (
                                  <span
                                    key={
                                      item.id
                                    }
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                      index ===
                                      activeBroadcast
                                        ? 'w-10 bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.8)]'
                                        : 'w-1.5 bg-slate-700'
                                    }`}
                                  />
                                )
                              )}
                            </div>

                            <div className="hidden items-center gap-2 text-[8px] font-black uppercase tracking-[0.25em] text-slate-600 sm:flex">
                              <span className="h-1 w-1 rounded-full bg-violet-400" />

                              SIGNAL ACTIVE
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

      {/* =====================================================
          LINK BROADCAST
          KHUSUS BROADCAST DENGAN LINK
      ===================================================== */}

      {!loadingBroadcast &&
        linkedBroadcast && (
          <section className="mx-auto max-w-7xl px-4 pt-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-red-500/30 bg-gradient-to-br from-[#170407] via-[#080304] to-black shadow-[0_0_45px_rgba(220,38,38,.12)]">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />

              <div className="relative p-5 sm:p-7 md:p-8">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />

                    LIVE BROADCAST
                  </span>

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                    {linkedBroadcast.type}
                  </span>
                </div>

                <div className="mt-5">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl md:text-4xl">
                    {linkedBroadcast.title}
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                    {linkedBroadcast.message}
                  </p>
                </div>

                <div className="mt-6">
                  {String(
                    linkedBroadcast.link_url
                  ).startsWith('/') ? (
                    <Link
                      href={
                        linkedBroadcast.link_url
                      }
                      className="btn btn-primary w-full justify-center sm:w-auto"
                    >
                      {linkedBroadcast.link_label ||
                        'Lihat Sekarang'}

                      <ArrowRight
                        size={17}
                        className="ml-2"
                      />
                    </Link>
                  ) : (
                    <a
                      href={
                        linkedBroadcast.link_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary w-full justify-center sm:w-auto"
                    >
                      {linkedBroadcast.link_label ||
                        'Lihat Sekarang'}

                      <ExternalLink
                        size={16}
                        className="ml-2"
                      />
                    </a>
                  )}
                </div>
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

      {/* =====================================================
          BANNER PROMO UTAMA

          Data berasal dari Admin → Promosi → Banner Promo.
          Hanya promo aktif yang ditampilkan di Home.
      ===================================================== */}

      {!loadingPromo && promo && (
        <section
          id="promo"
          className="mx-auto max-w-7xl px-4 py-10"
        >
          <div className="overflow-hidden rounded-3xl border border-pink-400/20 bg-[#070914] shadow-[0_0_45px_rgba(236,72,153,.08)]">
            {promo.content_type !== 'text' &&
              promo.banner_url && (
                <div className="w-full overflow-hidden bg-black/20">
                  <img
                    src={promo.banner_url}
                    alt={
                      promo.name ||
                      'Banner Promo NDRAAAID.v1'
                    }
                    className="block aspect-video w-full object-cover"
                    loading="eager"
                  />
                </div>
              )}

            {promo.content_type !== 'image' && (
              <div className="p-6 sm:p-8">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">
                  PROMO
                </p>

                {promo.name && (
                  <h2 className="mt-2 text-3xl font-black text-white">
                    {promo.name}
                  </h2>
                )}

                {promo.description && (
                  <p className="mt-3 max-w-3xl whitespace-pre-line text-slate-400">
                    {promo.description}
                  </p>
                )}

                {promo.code && (
                  <div className="mt-5 inline-flex rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-2 text-sm font-black text-pink-200">
                    KODE: {promo.code}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}