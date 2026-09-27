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

  /*
   * ============================================================
   * LOAD GAME
   * ============================================================
   */
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

        /*
         * Hilangkan game duplikat berdasarkan ID.
         */
        const uniqueGames = Array.from(
          new Map(
            data.map((game: any) => [
              game.id,
              game,
            ])
          ).values()
        )

        /*
         * Game populer berada di atas.
         */
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
   * ============================================================
   * LOAD LIVE BROADCAST
   * ============================================================
   *
   * Tetap menggunakan tabel broadcasts yang sudah ada.
   *
   * Hanya mengambil:
   * - is_active = true
   * - starts_at <= sekarang
   * - ends_at > sekarang
   *
   * Tidak membuat database baru.
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

        const nextBroadcasts =
          Array.isArray(data)
            ? data
            : []

        setBroadcasts(nextBroadcasts)

        /*
         * Pastikan index slider tetap valid
         * ketika jumlah broadcast berubah.
         */
        setActiveBroadcast(
          (current) => {
            if (
              nextBroadcasts.length === 0
            ) {
              return 0
            }

            return Math.min(
              current,
              nextBroadcasts.length - 1
            )
          }
        )
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

    /*
     * Sinkronisasi dengan Broadcast Admin
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
   * ============================================================
   * AUTO SLIDER
   * ============================================================
   *
   * Broadcast otomatis berganti setiap 5 detik.
   *
   * Ketika pengguna melakukan swipe manual,
   * activeBroadcast berubah dan timer otomatis
   * dimulai ulang dari 5 detik.
   */
  useEffect(() => {
    if (broadcasts.length <= 1) {
      return
    }

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
   * ============================================================
   * SWIPE / DRAG BROADCAST
   * ============================================================
   *
   * Berlaku untuk:
   * - HP
   * - Tablet
   * - Desktop
   */
  function handleBroadcastPointerDown(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (broadcasts.length <= 1) {
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
      broadcasts.length <= 1
    ) {
      broadcastStartX.current = null
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
        /*
         * Swipe kiri
         */
        setActiveBroadcast(
          (current) =>
            (current + 1) %
            broadcasts.length
        )
      } else {
        /*
         * Swipe kanan
         */
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
  }

  /*
   * Broadcast yang sedang aktif.
   */
  const currentBroadcast =
    broadcasts.length > 0
      ? broadcasts[
          activeBroadcast
        ]
      : null

  /*
   * ============================================================
   * BROADCAST YANG MEMILIKI LINK
   * ============================================================
   *
   * Card besar hanya mengambil broadcast
   * yang mempunyai link_url.
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
          LIVE BROADCAST SLIDER
          ===================================================== */}

      {!loadingBroadcast &&
        broadcasts.length > 0 &&
        currentBroadcast && (
          <section className="mx-auto max-w-7xl px-4 pt-4">
            <div
              className="relative overflow-hidden rounded-[1.75rem] border border-red-500/25 bg-gradient-to-br from-[#120406] via-black to-[#08090d] shadow-[0_0_35px_rgba(220,38,38,.10)] select-none"
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
                touchAction:
                  'pan-y',
                cursor:
                  broadcasts.length > 1
                    ? 'grab'
                    : 'default',
              }}
            >
              {/* Decorative gaming glow */}
              <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-red-600/10 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-red-500/5 blur-3xl" />

              {/* Top line */}
              <div className="relative flex items-center justify-between border-b border-white/5 px-4 py-2.5 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.8)]" />

                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-red-300 sm:text-[10px]">
                    LIVE TRANSMISSION
                  </span>
                </div>

                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                  AUTO 05s
                </span>
              </div>

              {/* Slider */}
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
                        key={
                          broadcast.id
                        }
                        className="w-full shrink-0"
                      >
                        <div className="relative flex min-h-[150px] flex-col justify-between gap-5 p-5 sm:min-h-[165px] sm:p-6 md:min-h-[175px] md:p-7">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-300">
                                <Radio
                                  size={11}
                                />

                                LIVE
                              </span>

                              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                {broadcast.type}
                              </span>
                            </div>

                            <h2 className="mt-3 text-xl font-black uppercase tracking-tight text-white sm:text-2xl md:text-3xl">
                              {broadcast.title}
                            </h2>

                            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                              {broadcast.message}
                            </p>
                          </div>

                          {/* Bottom accent */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {broadcasts.map(
                                (
                                  item,
                                  index
                                ) => (
                                  <span
                                    key={
                                      item.id
                                    }
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      index ===
                                      activeBroadcast
                                        ? 'w-8 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,.5)]'
                                        : 'w-1.5 bg-slate-700'
                                    }`}
                                  />
                                )
                              )}
                            </div>

                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700">
                              {String(
                                activeBroadcast +
                                  1
                              ).padStart(
                                2,
                                '0'
                              )}
                              /
                              {String(
                                broadcasts.length
                              ).padStart(
                                2,
                                '0'
                              )}
                            </span>
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
          LINK BROADCAST CARD
          HANYA UNTUK BROADCAST DENGAN LINK
      ===================================================== */}

      {!loadingBroadcast &&
        linkedBroadcast && (
          <section className="mx-auto max-w-7xl px-4 pt-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-red-500/30 bg-gradient-to-br from-[#170407] via-[#080304] to-black shadow-[0_0_45px_rgba(220,38,38,.12)]">
              {/* Glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />

              <div className="relative p-5 sm:p-7 md:p-8">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />

                    LIVE BROADCAST
                  </span>

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                    {linkedBroadcast.type}
                  </span>
                </div>

                {/* Content */}
                <div className="mt-5">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl md:text-4xl">
                    {linkedBroadcast.title}
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                    {linkedBroadcast.message}
                  </p>
                </div>

                {/* Link button */}
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