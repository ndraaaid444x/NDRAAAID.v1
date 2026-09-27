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
  Megaphone,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Home() {
  const [games, setGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gameError, setGameError] = useState('')

  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loadingBroadcast, setLoadingBroadcast] = useState(true)

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
   * Hanya mengambil broadcast yang:
   * - is_active = true
   * - starts_at <= sekarang
   * - ends_at > sekarang
   *
   * Sistem ini menggunakan tabel broadcasts
   * yang sudah tersedia di Supabase.
   */
  useEffect(() => {
    let mounted = true

    async function loadBroadcasts() {
      if (!mounted) return

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
        const now = new Date().toISOString()

        const url =
          `${supabaseUrl}/rest/v1/broadcasts` +
          `?select=id,title,message,type,starts_at,ends_at,link_url,link_label,is_active,created_at` +
          `&is_active=eq.true` +
          `&starts_at=lte.${encodeURIComponent(now)}` +
          `&ends_at=gt.${encodeURIComponent(now)}` +
          `&order=created_at.desc` +
          `&limit=3`

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
        })

        if (!response.ok) {
          throw new Error(
            `Broadcast HTTP ${response.status}`
          )
        }

        const data = await response.json()

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
     * Cek ulang setiap 30 detik supaya broadcast
     * baru dari Admin dapat muncul tanpa reload.
     */
    const interval = setInterval(
      loadBroadcasts,
      30000
    )

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const broadcast = broadcasts[0]

  function getBroadcastLabel(type: string) {
    switch (type) {
      case 'WARNING':
        return 'PERINGATAN'

      case 'SUCCESS':
        return 'UPDATE'

      case 'INFO':
        return 'INFO'

      case 'PROMO':
      default:
        return 'PROMO'
    }
  }

  function getBroadcastIcon(type: string) {
    switch (type) {
      case 'WARNING':
        return '⚠️'

      case 'SUCCESS':
        return '✅'

      case 'INFO':
        return 'ℹ️'

      case 'PROMO':
      default:
        return '🔥'
    }
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(127,29,29,.18),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs font-bold text-red-300">
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
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />

            <Gamepad2 className="absolute bottom-8 right-8 h-48 w-48 text-red-400/20" />

            <div className="relative mt-20">
              <p className="text-sm font-bold text-red-300">
                NDRAAAID.v1
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

      {/* LIVE BROADCAST */}
      {!loadingBroadcast && broadcast && (
        <section className="mx-auto max-w-7xl px-4 pt-6">
          <div className="group relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/60 via-black/80 to-black/70 p-[1px] shadow-[0_0_35px_rgba(220,38,38,.12)]">
            <div className="relative overflow-hidden rounded-2xl bg-black/80 p-4 sm:p-5">
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-xl shadow-[0_0_20px_rgba(220,38,38,.15)]">
                    <Radio
                      size={20}
                      className="text-red-400"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-black tracking-wider text-red-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                        LIVE BROADCAST
                      </span>

                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {getBroadcastIcon(broadcast.type)}{' '}
                        {getBroadcastLabel(broadcast.type)}
                      </span>
                    </div>

                    <h2 className="truncate text-base font-black text-white sm:text-lg">
                      {broadcast.title}
                    </h2>

                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-400">
                      {broadcast.message}
                    </p>
                  </div>
                </div>

                {broadcast.link_url && (
                  <>
                    {String(broadcast.link_url).startsWith('/') ? (
                      <Link
                        href={broadcast.link_url}
                        className="btn btn-primary shrink-0 text-sm"
                      >
                        {broadcast.link_label ||
                          'Lihat Sekarang'}

                        <ArrowRight
                          size={16}
                          className="ml-2"
                        />
                      </Link>
                    ) : (
                      <a
                        href={broadcast.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary shrink-0 text-sm"
                      >
                        {broadcast.link_label ||
                          'Lihat Sekarang'}

                        <ExternalLink
                          size={15}
                          className="ml-2"
                        />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GAME POPULER */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-bold text-red-300">
              DISCOVER
            </p>

            <h2 className="mt-1 text-3xl font-black">
              Game Populer
            </h2>
          </div>

          <Link
            href="/games/"
            className="text-sm font-bold text-slate-300 transition hover:text-red-300"
          >
            Lihat semua →
          </Link>
        </div>

        {/* LOADING */}
        {loadingGames && (
          <div className="mt-7 rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-red-400" />

            <p className="mt-3 text-sm text-slate-400">
              Memuat game...
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Mohon tunggu sebentar
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loadingGames && gameError && (
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
              {games.slice(0, 10).map((g) => (
                <Link
                  key={g.id}
                  href={`/game/?slug=${encodeURIComponent(
                    g.slug
                  )}`}
                  className="glass group overflow-hidden rounded-2xl p-4 transition hover:-translate-y-1 hover:border-red-400/40"
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

      {/* PROMO */}
      <section
        id="promo"
        className="mx-auto max-w-7xl px-4 py-10"
      >
        <div className="glass rounded-3xl p-8">
          <div className="flex items-center gap-2">
            <Megaphone
              size={18}
              className="text-red-400"
            />

            <p className="text-sm font-bold text-red-300">
              PROMO
            </p>
          </div>

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