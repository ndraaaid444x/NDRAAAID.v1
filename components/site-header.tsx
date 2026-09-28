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
  Gift,
  ReceiptText,
  CircleHelp,
  UserRound,
  ShieldCheck,
  LayoutDashboard,
  ChevronDown,
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
    'Player'

  return (
    <header className="sticky top-0 z-50 border-b border-red-500/20 bg-[#030305]/90 backdrop-blur-2xl">

      {/* TOP NEON LINE */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_14px_rgba(239,68,68,.7)]" />

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-5 lg:gap-5">

        {/* LOGO */}
        <Link
          href="/"
          className="group relative shrink-0"
        >
          <div className="flex items-center">
            <span className="text-xl font-black italic tracking-[-0.07em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,.15)] sm:text-2xl">
              NDRA
            </span>

            <span className="text-xl font-black italic tracking-[-0.07em] text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,.65)] sm:text-2xl">
              AAID
            </span>

            <span className="ml-1 text-sm font-black italic tracking-tight text-white/80 sm:text-base">
              .v1
            </span>
          </div>

          <div className="absolute -bottom-1 left-0 h-[2px] w-0 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,.8)] transition-all duration-300 group-hover:w-full" />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-1 rounded-2xl border border-white/[0.07] bg-black/30 p-1 lg:flex">

          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-white shadow-[inset_0_0_18px_rgba(239,68,68,.06)] transition hover:bg-red-500/15"
          >
            <Gamepad2
              size={15}
              className="text-red-400 drop-shadow-[0_0_7px_rgba(239,68,68,.7)]"
            />
            HOME
          </Link>

          <Link
            href="/games"
            className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-red-500/10 hover:text-white"
          >
            <Gamepad2 size={15} />
            GAMES
          </Link>

          <Link
            href="/#promo"
            className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-red-500/10 hover:text-white"
          >
            <Gift size={15} />
            PROMO
          </Link>

          <Link
            href="/orders/track"
            className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-red-500/10 hover:text-white"
          >
            <ReceiptText size={15} />
            TRANSAKSI
          </Link>

          <Link
            href="/terms"
            className="group flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-red-500/10 hover:text-white"
          >
            <CircleHelp size={15} />
            BANTUAN
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">

          {/* SEARCH */}
          <Link
            href="/games"
            aria-label="Cari game"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <Search size={18} />
          </Link>

          {user ? (
            <>
              {/* WALLET */}
              <Link
                href="/dashboard"
                className="hidden h-10 items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 transition hover:border-red-500/50 hover:bg-red-500/10 sm:flex"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15">
                  <Wallet
                    size={15}
                    className="text-red-400"
                  />
                </div>

                <div className="leading-none">
                  <div className="mb-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                    WALLET
                  </div>

                  <div className="text-xs font-black text-white">
                    {formattedBalance}
                  </div>
                </div>
              </Link>

              {/* NOTIFICATION */}
              <Link
                href="/notifications"
                aria-label="Notifikasi"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white"
              >
                <Bell size={18} />

                {unread > 0 && (
                  <>
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_9px_rgba(239,68,68,.9)]" />
                    <span className="absolute right-[5px] top-[5px] h-3 w-3 animate-ping rounded-full bg-red-500/30" />
                  </>
                )}
              </Link>

              {/* PLAYER */}
              <div className="relative">

                <button
                  onClick={() => setOpen((v) => !v)}
                  className="hidden h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 transition hover:border-red-500/40 hover:bg-red-500/10 sm:flex"
                >
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
                    <UserRound
                      size={14}
                      className="text-red-400"
                    />

                    <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.8)]" />
                  </div>

                  <div className="max-w-[90px] text-left leading-none">
                    <div className="mb-1 text-[8px] font-black uppercase tracking-[0.15em] text-slate-500">
                      PLAYER
                    </div>

                    <div className="truncate text-xs font-black text-white">
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
                  <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-red-500/25 bg-[#08080c]/98 p-2 shadow-[0_25px_70px_rgba(0,0,0,.75)] backdrop-blur-xl">

                    <div className="mb-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
                          <UserRound
                            size={18}
                            className="text-red-400"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {displayName}
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            ONLINE
                          </div>
                        </div>

                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
                    >
                      <LayoutDashboard
                        size={15}
                        className="text-slate-500 group-hover:text-red-400"
                      />
                      Dashboard
                    </Link>

                    <Link
                      href="/account"
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
                    >
                      <UserRound
                        size={15}
                        className="text-slate-500 group-hover:text-red-400"
                      />
                      Profile
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
                    >
                      <ReceiptText
                        size={15}
                        className="text-slate-500 group-hover:text-red-400"
                      />
                      Transaksi
                    </Link>

                    <Link
                      href="/notifications"
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-red-500/10 hover:text-white"
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
                        href="/admin"
                        onClick={() => setOpen(false)}
                        className="mt-1 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-3 py-2.5 text-xs font-black text-red-400 transition hover:bg-red-500/10"
                      >
                        <ShieldCheck size={15} />
                        Admin Panel
                      </Link>
                    )}

                    <div className="my-2 h-px bg-white/[0.07]" />

                    <button
                      onClick={logout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-black text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
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
                className="hidden h-10 items-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-black text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white sm:inline-flex"
              >
                LOGIN
              </Link>

              {/* DAFTAR */}
              <Link
                href="/register"
                className="group relative flex h-10 items-center overflow-hidden rounded-xl border border-red-400/50 bg-red-600 px-4 text-xs font-black text-white shadow-[0_0_22px_rgba(239,68,68,.25)] transition hover:bg-red-500 hover:shadow-[0_0_30px_rgba(239,68,68,.4)]"
              >
                <span className="relative z-10">
                  DAFTAR
                </span>

                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
            </>
          )}

          {/* MOBILE */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 lg:hidden"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
          >
            {mobile ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* MOBILE SHORTCUT MENU */}
      {mobile && (
        <div className="border-t border-red-500/15 bg-[#050507]/98 px-3 pb-4 pt-3 backdrop-blur-2xl lg:hidden">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/[.07] bg-[#09090d]/95 p-3 shadow-[0_24px_60px_rgba(0,0,0,.55)]">
            {user ? (
              <div className="mb-2.5 flex items-center justify-between rounded-xl border border-red-500/15 bg-red-500/[.035] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/[.06]"><UserRound size={16} className="text-red-400" /></div>
                  <div className="min-w-0"><div className="truncate text-xs font-black text-white">{displayName}</div><div className="mt-0.5 text-[9px] text-slate-600">Saldo</div></div>
                </div>
                <div className="text-right"><div className="text-[11px] font-black text-red-300">{formattedBalance}</div></div>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Link href="/account" onClick={() => setMobile(false)} className="flex items-center justify-between rounded-lg border border-white/[.06] bg-white/[.018] px-3 py-2.5"><span className="flex items-center gap-2.5 text-xs font-bold text-slate-300"><UserRound size={15} className="text-red-400" />Profil</span><span className="text-[9px] text-slate-600">Nama & saldo</span></Link>
              <Link href="/dashboard" onClick={() => setMobile(false)} className="flex items-center justify-between rounded-lg border border-white/[.06] bg-white/[.018] px-3 py-2.5"><span className="flex items-center gap-2.5 text-xs font-bold text-slate-300"><LayoutDashboard size={15} className="text-red-400" />Dashboard Akun</span><span className="text-[9px] text-slate-600">Aktivitas akun</span></Link>
              {user && <Link href="/deposit" onClick={() => setMobile(false)} className="flex items-center justify-between rounded-lg border border-white/[.06] bg-white/[.018] px-3 py-2.5"><span className="flex items-center gap-2.5 text-xs font-bold text-slate-300"><Wallet size={15} className="text-red-400" />Deposit Saldo</span><span className="text-[9px] text-slate-600">Top up saldo</span></Link>}
              <Link href="/terms" onClick={() => setMobile(false)} className="flex items-center justify-between rounded-lg border border-white/[.06] bg-white/[.018] px-3 py-2.5"><span className="flex items-center gap-2.5 text-xs font-bold text-slate-300"><CircleHelp size={15} className="text-red-400" />Bantuan</span><span className="text-[9px] text-slate-600">Pusat bantuan</span></Link>
            </div>

            {user && (
              <div className="mt-2 flex items-center justify-end">
                <button onClick={logout} disabled={loggingOut} className="rounded-lg px-2 py-1 text-[9px] font-black text-red-400 hover:bg-red-500/[.06] disabled:opacity-50"><LogOut size={12} className="mr-1 inline" />{loggingOut ? 'Keluar...' : 'Logout'}</button>
              </div>
            )}
          </div>
        </div>
      )}
      )}
    </header>
  )
}