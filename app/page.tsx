'use client'

import Link from 'next/link'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Headphones,
  Gamepad2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Home() {
  const [games, setGames] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gameError, setGameError] = useState('')

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
        /*
         * Ambil SEMUA game yang aktif.
         *
         * Jangan gunakan filter popular=true di request.
         * Game populer akan diurutkan setelah data diterima.
         */
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
         * Game populer ditaruh di bagian atas.
         * Game biasa tetap ditampilkan.
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

  return (
    <div>
      {/* HERO */}
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

      {/* GAME POPULER */}
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

      {/* PROMO */}
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