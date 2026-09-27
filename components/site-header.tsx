'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Wallet,
  Gamepad2,
  ChevronDown,
  ShieldCheck,
  UserRound,
  ReceiptText,
  LayoutDashboard,
  CircleHelp,
} from 'lucide-react'

export default function SiteHeader() {
  const [user, setUser] = useState<any>()
  const [profile, setProfile] = useState<any>()
  const [balance, setBalance] = useState(0)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [unread, setUnread] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  const userRequestRef = useRef(0)

  async function loadUserData(currentUser: any) {
    if (!currentUser) {
      setProfile(undefined)
      setBalance(0)
      setUnread(0)
      return
    }

    const requestId = ++userRequestRef.current
    const s = supabaseBrowser()

    try {
      const [profileResult, walletResult, notificationResult] =
        await Promise.all([
          s
            .from('profiles')
            .select('name,username,role')
            .eq('id', currentUser.id)
            .maybeSingle(),

          s
            .from('wallets')
            .select('balance')
            .eq('user_id', currentUser.id)
            .maybeSingle(),

          s
            .from('notifications')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('user_id', currentUser.id)
            .is('read_at', null),
        ])

      if (requestId !== userRequestRef.current) {
        return
      }

      setProfile(profileResult.data || undefined)
      setBalance(Number(walletResult.data?.balance || 0))
      setUnread(notificationResult.count || 0)
    } catch (error) {
      console.error('Load user data error:', error)

      if (requestId !== userRequestRef.current) {
        return
      }

      setProfile(undefined)
      setBalance(0)
      setUnread(0)
    }
  }

  useEffect(() => {
    const s = supabaseBrowser()
    let mounted = true

    async function initAuth() {
      const {
        data: { user: currentUser },
      } = await s.auth.getUser()

      if (!mounted) return

      setUser(currentUser)

      if (currentUser) {
        setTimeout(() => {
          if (mounted) {
            void loadUserData(currentUser)
          }
        }, 0)
      }
    }

    void initAuth()

    const {
      data: { subscription },
    } = s.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user

      if (!mounted) return

      setUser(currentUser)

      if (!currentUser) {
        userRequestRef.current += 1
        setProfile(undefined)
        setBalance(0)
        setUnread(0)
        return
      }

      setTimeout(() => {
        if (mounted) {
          void loadUserData(currentUser)
        }
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      userRequestRef.current += 1
    }
  }, [])

  async function logout() {
    if (loggingOut) return

    setLoggingOut(true)

    setOpen(false)
    setMobile(false)

    userRequestRef.current += 1
    setUser(undefined)
    setProfile(undefined)
    setBalance(0)
    setUnread(0)

    const s = supabaseBrowser()

    try {
      await s.auth.signOut({
        scope: 'local',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      window.location.replace('/')
    }
  }

  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(balance)

  const isAdmin = ['owner', 'admin'].includes(profile?.role)

  const displayName =
    profile?.name ||
    profile?.username ||
    'User'

  return (
    <header className="sticky top-0 z-50 border-b border-red-500/10 bg-[#030305]/90 backdrop-blur-2xl">
      {/* TOP NEON LINE */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-5 lg:gap-5">
        {/* LOGO */}
        <Link
          href="/"
          className="group relative shrink-0"
        >
          <div className="flex items-center gap-1">
            <span className="text-xl font-black tracking-[-0.06em] text-white sm:text-2xl">
              NDRA
            </span>

            <span className="text-xl font-black tracking-[-0.06em] text-red-500 drop-shadow-[0_0_14px_rgba(239,68,68,.65)] sm:text-2xl">
              AAAID
            </span>

            <span className="rounded-md border border-red-500/30 bg-red-500/10 px-1 py-0.5 text-[8px] font-black tracking-widest text-red-400">
              V1
            </span>
          </div>

          <div className="absolute -bottom-1 left-0 h-[1px] w-0 bg-red-500 transition-all duration-300 group-hover:w-full" />
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1 lg:flex">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
          >
            <Gamepad2
              size={15}
              className="text-red-500 transition group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,.8)]"
            />
            Home
          </Link>

          <Link
            href="/games"
            className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
          >
            <Gamepad2 size={15} />
            Games
          </Link>

          <Link
            href="/#promo"
            className="rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
          >
            Promo
          </Link>

          <Link
            href="/orders/track"
            className="rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
          >
            Cek Transaksi
          </Link>

          <Link
            href="/terms"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
          >
            <CircleHelp size={14} />
            Bantuan
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* SEARCH HUD */}
          <Link
            href="/games"
            aria-label="Cari game"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          >
            <Search
              size={18}
              className="transition group-hover:scale-110"
            />
          </Link>

          {user ? (
            <>
              {/* WALLET HUD */}
              <Link
                href="/dashboard"
                className="hidden h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.10] to-transparent px-3 transition hover:border-red-500/40 hover:bg-red-500/[0.15] sm:flex"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15">
                  <Wallet
                    size={15}
                    className="text-red-400"
                  />
                </div>

                <div className="leading-none">
                  <div className="mb-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Wallet
                  </div>

                  <div className="text-xs font-black text-white">
                    {formattedBalance}
                  </div>
                </div>
              </Link>

              {/* NOTIFICATION HUD */}
              <Link
                href="/notifications"
                aria-label="Notifikasi"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
              >
                <Bell size={17} />

                {unread > 0 && (
                  <>
                    <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.9)]" />
                    <span className="absolute right-[5px] top-[5px] h-3 w-3 animate-ping rounded-full bg-red-500/30" />
                  </>
                )}
              </Link>

              {/* PLAYER CARD */}
              <div className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="hidden h-10 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 transition hover:border-red-500/30 hover:bg-red-500/10 sm:flex"
                >
                  <div className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-red-500/30 bg-gradient-to-br from-red-600/30 to-black">
                    <UserRound
                      size={14}
                      className="text-red-400"
                    />

                    <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.8)]" />
                  </div>

                  <div className="max-w-[100px] text-left leading-none">
                    <div className="mb-1 text-[8px] font-black uppercase tracking-[0.15em] text-slate-500">
                      Player
                    </div>

                    <div className="truncate text-xs font-bold text-white">
                      {displayName}
                    </div>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`text-slate-500 transition ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* PLAYER DROPDOWN */}
                {open && (
                  <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-red-500/20 bg-[#09090d]/98 p-2 shadow-[0_20px_60px_rgba(0,0,0,.65)] backdrop-blur-xl">
                    <div className="mb-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
                          <UserRound
                            size={18}
                            className="text-red-400"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {displayName}
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Online
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                    >
                      <LayoutDashboard
                        size={15}
                        className="text-slate-500 group-hover:text-red-400"
                      />
                      Dashboard
                    </Link>

                    <Link
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
                      href="/account"
                      onClick={() => setOpen(false)}
                    >
                      <UserRound
                        size={15}
                        className="text-slate-500 group-hover:text-red-400"
                      />
                      Profile
                    </Link>

                    <Link
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
                      href="/orders"
                      onClick={() => setOpen(false)}
                    >
                      <ReceiptText
                        size={15}
                        className="text-slate-500 group-hover:text-red-400"
                      />
                      Transaksi
                    </Link>

                    <Link
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
                      href="/notifications"
                      onClick={() => setOpen(false)}
                    >
                      <Bell
                        size={15}
                        className="text-slate-500 group-hover:text-red-400"
                      />
                      Notifikasi

                      {unread > 0 && (
                        <span className="ml-auto rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-black text-red-400">
                          {unread}
                        </span>
                      )}
                    </Link>

                    {isAdmin && (
                      <Link
                        className="group flex items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-3 py-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/10"
                        href="/admin"
                        onClick={() => setOpen(false)}
                      >
                        <ShieldCheck size={15} />
                        Admin Panel
                      </Link>
                    )}

                    <div className="my-2 h-px bg-white/[0.06]" />

                    <button
                      onClick={logout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <LogOut size={15} />

                      {loggingOut
                        ? 'Keluar...'
                        : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* LOGIN */}
              <Link
                href="/login"
                className="hidden h-10 items-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-black text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white sm:inline-flex"
              >
                Login
              </Link>

              {/* DAFTAR GAMING CTA */}
              <Link
                href="/register"
                className="group relative flex h-10 items-center overflow-hidden rounded-xl border border-red-500/40 bg-red-600 px-4 text-xs font-black text-white shadow-[0_0_20px_rgba(239,68,68,.20)] transition hover:bg-red-500 hover:shadow-[0_0_28px_rgba(239,68,68,.35)]"
              >
                <span className="relative z-10">
                  Daftar
                </span>

                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
            </>
          )}

          {/* MOBILE MENU BUTTON */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 md:flex lg:hidden"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
          >
            {mobile ? (
              <X size={19} />
            ) : (
              <Menu size={19} />
            )}
          </button>
        </div>
      </div>

      {/* MOBILE GAMING COMMAND PANEL */}
      {mobile && (
        <div className="border-t border-red-500/10 bg-[#050507]/98 px-3 pb-4 pt-3 backdrop-blur-2xl md:px-5 lg:hidden">
          <div className="mx-auto max-w-7xl">
            {/* MOBILE PLAYER / GUEST STATUS */}
            {user ? (
              <Link
                href="/dashboard"
                onClick={() => setMobile(false)}
                className="mb-3 flex items-center justify-between rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/[0.10] to-transparent p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
                    <UserRound
                      size={17}
                      className="text-red-400"
                    />
                  </div>

                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Player
                    </div>

                    <div className="mt-1 text-sm font-black text-white">
                      {displayName}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Balance
                  </div>

                  <div className="mt-1 text-xs font-black text-red-400">
                    {formattedBalance}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-red-400">
                  NDRAAAID V1
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  Gaming Top Up Center
                </div>
              </div>
            )}

            {/* MOBILE NAV */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                onClick={() => setMobile(false)}
                href="/"
                className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
              >
                <Gamepad2
                  size={16}
                  className="text-red-400"
                />
                Home
              </Link>

              <Link
                onClick={() => setMobile(false)}
                href="/games"
                className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
              >
                <Gamepad2
                  size={16}
                  className="text-red-400"
                />
                Games
              </Link>

              <Link
                onClick={() => setMobile(false)}
                href="/#promo"
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
              >
                🔥 Promo
              </Link>

              <Link
                onClick={() => setMobile(false)}
                href="/orders/track"
                className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
              >
                🧾 Cek Transaksi
              </Link>

              <Link
                onClick={() => setMobile(false)}
                href="/terms"
                className="col-span-2 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
              >
                <CircleHelp
                  size={16}
                  className="text-red-400"
                />
                Bantuan
              </Link>
            </div>

            {user ? (
              <>
                {/* ACCOUNT MENU */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link
                    onClick={() => setMobile(false)}
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300"
                  >
                    <LayoutDashboard
                      size={15}
                      className="text-red-400"
                    />
                    Dashboard
                  </Link>

                  <Link
                    onClick={() => setMobile(false)}
                    href="/account"
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300"
                  >
                    <UserRound
                      size={15}
                      className="text-red-400"
                    />
                    Profile
                  </Link>

                  <Link
                    onClick={() => setMobile(false)}
                    href="/orders"
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300"
                  >
                    <ReceiptText
                      size={15}
                      className="text-red-400"
                    />
                    Transaksi
                  </Link>

                  <Link
                    onClick={() => setMobile(false)}
                    href="/notifications"
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs font-bold text-slate-300"
                  >
                    <Bell
                      size={15}
                      className="text-red-400"
                    />
                    Notifikasi

                    {unread > 0 && (
                      <span className="ml-auto rounded-full bg-red-500/15 px-1.5 py-0.5 text-[8px] font-black text-red-400">
                        {unread}
                      </span>
                    )}
                  </Link>
                </div>

                {isAdmin && (
                  <Link
                    onClick={() => setMobile(false)}
                    href="/admin"
                    className="mt-2 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-xs font-black text-red-400"
                  >
                    <ShieldCheck size={16} />
                    Admin Panel
                  </Link>
                )}

                {/* MOBILE LOGOUT */}
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3 text-left text-xs font-black text-red-400 disabled:opacity-50"
                >
                  <LogOut size={16} />

                  {loggingOut
                    ? 'Keluar...'
                    : 'Logout'}
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  onClick={() => setMobile(false)}
                  href="/login"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-center text-xs font-black text-slate-300"
                >
                  Login
                </Link>

                <Link
                  onClick={() => setMobile(false)}
                  href="/register"
                  className="rounded-xl border border-red-500/30 bg-red-600 p-3 text-center text-xs font-black text-white shadow-[0_0_20px_rgba(239,68,68,.20)]"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}