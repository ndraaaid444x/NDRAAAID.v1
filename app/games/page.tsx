'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import GameCard from '@/components/game-card'

export default function Games() {
  const [games, setGames] = useState<any[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    supabaseBrowser()
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('popular', { ascending: false })
      .then(({ data }) => setGames(data || []))
  }, [])

  const filtered = games.filter((g) =>
    g.name.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-300">
            GAME CATALOG
          </p>

          <h1 className="text-4xl font-black">
            Pilih Game
          </h1>
        </div>

        {/* SEARCH WIDGET */}
        <div className="w-full md:w-72">
          <label
            htmlFor="game-search"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
          >
            Cari game
          </label>

          <div className="flex h-10 items-center rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 shadow-sm transition focus-within:border-cyan-400/50 focus-within:bg-slate-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 shrink-0 text-slate-500"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              id="game-search"
              type="search"
              className="h-full w-full border-0 bg-transparent p-0 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:ring-0"
              placeholder="Cari game favoritmu..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="ml-2 shrink-0 text-slate-500 transition hover:text-slate-200"
                aria-label="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>

      {!filtered.length && (
        <p className="mt-10 text-center text-slate-400">
          Game tidak ditemukan.
        </p>
      )}
    </main>
  )
}
