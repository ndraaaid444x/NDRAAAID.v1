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
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [games, setGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gameError, setGameError] = useState('')

  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loadingBroadcast, setLoadingBroadcast] = useState(true)
  const [activeBroadcast, setActiveBroadcast] = useState(0)

  const broadcastStartX = useRef<number | null>(null)
  const broadcastDragging = useRef(false)

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

  /*
   * LIVE BROADCAST
   *
   * Tetap mengambil broadcast dari:
   * Admin → broadcasts
   *
   * Hanya broadcast yang:
   * - aktif
   * - sudah dimulai
   * - belum berakhir
   */
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

        params.set(
          'limit',
          '3'
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

        setBroadcasts(
          Array.isArray(data)
            ? data
            : []
        )
      } catch (error) {
        console.error(
          'Gagal memuat broadcast:',
          error
        )

        if (mounted) {
          setBroadcasts([])
        }
      } finally {
        if (mounted) {
          setLoadingBroadcast(false)
        }
      }
    }

    loadBroadcasts()

    /*
     * Sinkronisasi broadcast dengan Admin
     * setiap 30 detik.
     */
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

  /*
   * Jika data broadcast berubah dan jumlahnya
   * lebih sedikit dari index sebelumnya,
   * kembalikan index ke posisi yang valid.
   */
  useEffect(() => {
    if (activeBroadcast >= broadcasts.length) {
      setActiveBroadcast(0)
    }
  }, [
    broadcasts.length,
    activeBroadcast,
  ])

  /*
   * AUTO SLIDER
   *
   * Broadcast berganti setiap 5 detik.
   *
   * Karena activeBroadcast menjadi dependency,
   * setiap swipe manual juga otomatis me-reset
   * hitungan 5 detik.
   */
  useEffect(() => {
    if (broadcasts.length <= 1) return

    const timer = setTimeout(() => {
      setActiveBroadcast(
        (current) =>
          (current + 1) %
          broadcasts.length
      )
    }, 5000)

    return () => {
      clearTimeout(timer)
    }
  }, [
    activeBroadcast,
    broadcasts.length,
  ])

  /*
   * SWIPE / DRAG BROADCAST
   *
   * Berlaku:
   * - HP
   * - Tablet
   * - Desktop
   */
  function handleBroadcastPointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    broadcastStartX.current =
      event.clientX

    broadcastDragging.current = false

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId
      )
    } catch {}
  }

  function handleBroadcastPointerMove(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (
      broadcastStartX.current === null
    ) {
      return
    }

    const distance =
      Math.abs(
        event.clientX -
          broadcastStartX.current
      )

    if (distance > 8) {
      broadcastDragging.current = true
    }
  }

  function handleBroadcastPointerUp(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (
      broadcastStartX.current === null
    ) {
      return
    }

    const distance =
      event.clientX -
      broadcastStartX.current

    const minimumSwipe = 50

    if (
      Math.abs(distance) >=
      minimumSwipe
    ) {
      if (distance < 0) {
        setActiveBroadcast(
          (current) =>
            (current + 1) %
            broadcasts.length
        )
      } else {
        setActiveBroadcast(
          (current) =>
            (current - 1 +
              broadcasts.length) %
            broadcasts.length
        )
      }
    }

    broadcastStartX.current = null

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      )
    } catch {}

    setTimeout(() => {
      broadcastDragging.current = false
    }, 50)
  }

  /*
   * Broadcast aktif yang sedang ditampilkan.
   */
  const currentBroadcast =
    broadcasts.length > 0
      ? broadcasts[
          activeBroadcast
        ]
      : null

  /*
   * CARD BESAR DI BAWAH:
   *
   * Hanya mengambil broadcast yang
   * mempunyai link_url.
   */
  const linkedBroadcast =
    broadcasts.find(
      (broadcast) =>
        Boolean(
          broadcast?.link_url
        )
    ) || null

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
          BROADCAST SLIDER
          SEMUA DEVICE
      ===================================================== */}
      {!loadingBroadcast &&
        broadcasts.length > 0 &&
        currentBroadcast && (
          <section className="mx-auto max-w-7xl px-4 pt-2">
            <div
              className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-black/80 shadow-[0_0_30px_rgba(220,38,38,.10)] select-none touch-pan-y"
              onPointerDown={
                handleBroadcastPointerDown
              }
              onPointerMove={
                handleBroadcastPointerMove
              }
              onPointerUp={
                handleBroadcastPointerUp
              }
              onPointerCancel={
                handleBroadcastPointerUp
              }
              style={{
                cursor:
                  broadcasts.length > 1
                    ? 'grab'
                    : 'default',
              }}
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-600/10 blur-3xl" />

              <div className="relative overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(-${
                      activeBroadcast * 100
                    }%)`,
                  }}
                >
                  {broadcasts.map(
                    (broadcast) => (
                      <div
                        key={broadcast.id}
                        className="w-full shrink-0"
                      >
                        <div className="flex min-h-[88px] items-center gap-3 p-3 sm:min-h-[96px] sm:gap-4 sm:p-4 md:min-h-[104px] md:p-5">
                          {/* ICON */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 shadow-[0_0_20px_rgba(220,38,38,.12)] sm:h-11 sm:w-11 md:h-12 md:w-12">
                            <Radio
                              size={19}
                              className="text-red-400 md:h-5 md:w-5"
                            />
                          </div>

                          {/* CONTENT */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-red-300 sm:px-2.5 sm:py-1 sm:text-[10px]">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />

                                LIVE
                              </span>

                              <span className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                                {broadcast.type}
                              </span>
                            </div>

                            <h2 className="truncate text-sm font-black text-white sm:text-base md:text-lg">
                              {broadcast.title}
                            </h2>

                            <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                              {broadcast.message}
                            </p>
                          </div>

                          {/* INDICATOR */}
                          {broadcasts.length >
                            1 && (
                            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                              {broadcasts.map(
                                (
                                  item,
                                  dotIndex
                                ) => (
                                  <span
                                    key={
                                      item.id
                                    }
                                    className={`h-1.5 rounded-full transition-all ${
                                      dotIndex ===
                                      activeBroadcast
                                        ? 'w-5 bg-red-400'
                                        : 'w-1.5 bg-slate-700'
                                    }`}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* MOBILE DOTS */}
              {broadcasts.length >
                1 && (
                <div className="relative flex justify-center gap-1.5 pb-2.5 sm:hidden">
                  {broadcasts.map(
                    (
                      broadcast,
                      dotIndex
                    ) => (
                      <span
                        key={
                          broadcast.id
                        }
                        className={`h-1.5 rounded-full transition-all ${
                          dotIndex ===
                          activeBroadcast
                            ? 'w-5 bg-red-400'
                            : 'w-1.5 bg-slate-700'
                        }`}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        )}

      {/* =====================================================
          LINK BROADCAST CARD
          HANYA MUNCUL JIKA ADA LINK
      ===================================================== */}
      {!loadingBroadcast &&
        linkedBroadcast && (
          <section className="mx-auto max-w-7xl px-4 pt-8">
            <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-black/80 shadow-[0_0_35px_rgba(220,38,38,.12)]">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-red-600/10 blur-3xl" />

              <div className="relative p-5 sm:p-6 md:p-7">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 shadow-[0_0_20px_rgba(220,38,38,.12)] sm:h-14 sm:w-14">
                      <Radio
                        size={22}
                        className="text-red-400"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-black tracking-wider text-red-300">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />

                          LIVE BROADCAST
                        </span>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {linkedBroadcast.type}
                        </span>
                      </div>

                      <h2 className="text-xl font-black text-white sm:text-2xl md:text-3xl">
                        {linkedBroadcast.title}
                      </h2>

                      <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
                        {linkedBroadcast.message}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {String(
                      linkedBroadcast.link_url
                    ).startsWith('/') ? (
                      <Link
                        href={
                          linkedBroadcast.link_url
                        }
                        className="btn btn-primary w-full justify-center md:w-auto"
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
                        className="btn btn-primary w-full justify-center md:w-auto"
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

        {/* LOADING */}
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

        {/* ERROR */}
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

        {/* GAME KOSONG */}
        {!loadingGames &&
          !gameError &&
          games.length === 0 && (
            <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
              Game tidak ditemukan.
            </div>
          )}

        {/* GAME */}
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
          PROMO
      ===================================================== */}
      <section
        id="promo"
        className="mx-auto max-w-7xl px-4 py-10"
      >
        <div className="glass rounded-3xl p-8">
          <p className="text-sm font-bold text-pink-300">
            PROMO
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Promo member & flash sale
          </h2>

          <p className="mt-3 max-w-2xl text-slate-400">
            Kode voucher dan promo dapat dikelola Owner
            melalui Admin Panel. Jangan percaya screenshot
            pembayaran sebagai bukti pembayaran otomatis.
          </p>
        </div>
      </section>
    </div>
  )
}