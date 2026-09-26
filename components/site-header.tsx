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
} from 'lucide-react'

export default function SiteHeader() {
  const [user, setUser] = useState<any>()
  const [profile, setProfile] = useState<any>()
  const [balance, setBalance] = useState(0)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [unread, setUnread] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  // Mencegah data user lama menimpa user baru
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

      // Abaikan hasil kalau sudah ada user/session yang lebih baru
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

    // Ambil session/user awal
    async function initAuth() {
      const {
        data: { user: currentUser },
      } = await s.auth.getUser()

      if (!mounted) return

      setUser(currentUser)

      if (currentUser) {
        // Jangan membuat proses auth utama menunggu data profile/wallet
        setTimeout(() => {
          if (mounted) {
            void loadUserData(currentUser)
          }
        }, 0)
      }
    }

    void initAuth()

    // PENTING:
    // Jangan gunakan async callback di onAuthStateChange.
    // Auth state harus langsung diteruskan ke UI.
    const {
      data: { subscription },
    } = s.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user

      if (!mounted) return

      // Update UI auth langsung
      setUser(currentUser)

      // Reset data lama langsung
      if (!currentUser) {
        userRequestRef.current += 1
        setProfile(undefined)
        setBalance(0)
        setUnread(0)
        return
      }

      // Load profile/wallet/notifikasi di luar callback auth
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

    // Tutup semua menu terlebih dahulu
    setOpen(false)
    setMobile(false)

    // Hilangkan tampilan user secara langsung
    userRequestRef.current += 1
    setUser(undefined)
    setProfile(undefined)
    setBalance(0)
    setUnread(0)

    const s = supabaseBrowser()

    try {
      // Hapus session lokal terlebih dahulu
      await s.auth.signOut({
        scope: 'local',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Selalu kembali ke halaman utama
      window.location.replace('/')
    }
  }

  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(balance)

  const isAdmin = ['owner', 'admin'].includes(profile?.role)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">

        {/* LOGO */}
        <Link
          href="/"
          className="text-xl font-black tracking-tight"
        >
          NDRA<span className="gradient-text">AAAID</span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
          <Link href="/">Home</Link>
          <Link href="/games">Games</Link>
          <Link href="/#promo">Promo</Link>
          <Link href="/orders/track">Cek Transaksi</Link>
          <Link href="/terms">Bantuan</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">

          {/* SEARCH */}
          <Link
            href="/games"
            className="rounded-xl p-2 hover:bg-white/5"
          >
            <Search size={19} />
          </Link>

          {user ? (
            <>
              {/* SALDO */}
              <Link
                href="/dashboard"
                className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm transition hover:bg-white/[0.07] sm:flex"
              >
                <Wallet
                  size={17}
                  className="text-cyan-300"
                />

                <div className="leading-tight">
                  <div className="text-[10px] text-slate-400">
                    Saldo
                  </div>

                  <div className="font-semibold text-white">
                    {formattedBalance}
                  </div>
                </div>
              </Link>

              {/* NOTIFICATION */}
              <Link
                href="/notifications"
                className="relative rounded-xl p-2 hover:bg-white/5"
              >
                <Bell size={19} />

                {unread > 0 && (
                  <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-pink-400" />
                )}
              </Link>

              {/* USER DESKTOP */}
              <div className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm sm:flex"
                >
                  <span className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />

                  {profile?.name ||
                    profile?.username ||
                    'User'}
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-[#0a1020] p-2 shadow-2xl">

                    <Link
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                      href="/dashboard"
                      onClick={() => setOpen(false)}
                    >
                      Dashboard
                    </Link>

                    <Link
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                      href="/account"
                      onClick={() => setOpen(false)}
                    >
                      Profile
                    </Link>

                    <Link
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                      href="/orders"
                      onClick={() => setOpen(false)}
                    >
                      Transaksi
                    </Link>

                    <Link
                      className="block rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                      href="/notifications"
                      onClick={() => setOpen(false)}
                    >
                      Notifikasi
                    </Link>

                    {isAdmin && (
                      <Link
                        className="block rounded-xl px-3 py-2 text-sm text-cyan-300 hover:bg-white/5"
                        href="/admin"
                        onClick={() => setOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}

                    <button
                      onClick={logout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-pink-300 hover:bg-white/5 disabled:opacity-50"
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
                className="btn btn-muted hidden sm:inline-flex"
              >
                Login
              </Link>

              {/* DAFTAR */}
              <Link
                href="/register"
                className="btn btn-primary"
              >
                Daftar
              </Link>
            </>
          )}

          {/* MOBILE BUTTON */}
          <button
            className="rounded-xl p-2 md:hidden"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobile && (
        <div className="border-t border-white/10 px-4 py-4 md:hidden">
          <div className="grid gap-3 text-sm">

            <Link
              onClick={() => setMobile(false)}
              href="/"
            >
              Home
            </Link>

            <Link
              onClick={() => setMobile(false)}
              href="/games"
            >
              Games
            </Link>

            <Link
              onClick={() => setMobile(false)}
              href="/#promo"
            >
              Promo
            </Link>

            <Link
              onClick={() => setMobile(false)}
              href="/orders/track"
            >
              Cek Transaksi
            </Link>

            {user ? (
              <>
                <Link
                  onClick={() => setMobile(false)}
                  href="/dashboard"
                >
                  Dashboard
                </Link>

                <Link
                  onClick={() => setMobile(false)}
                  href="/account"
                >
                  Profile
                </Link>

                <Link
                  onClick={() => setMobile(false)}
                  href="/orders"
                >
                  Transaksi
                </Link>

                <Link
                  onClick={() => setMobile(false)}
                  href="/notifications"
                >
                  Notifikasi
                </Link>

                {isAdmin && (
                  <Link
                    onClick={() => setMobile(false)}
                    href="/admin"
                    className="text-cyan-300"
                  >
                    Admin Panel
                  </Link>
                )}

                {/* SALDO MOBILE */}
                <Link
                  onClick={() => setMobile(false)}
                  href="/dashboard"
                  className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"
                >
                  <Wallet
                    size={17}
                    className="text-cyan-300"
                  />

                  <span>
                    Saldo: {formattedBalance}
                  </span>
                </Link>

                {/* LOGOUT MOBILE */}
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl border border-pink-400/20 px-3 py-2 text-left text-pink-300 disabled:opacity-50"
                >
                  <LogOut size={16} />

                  {loggingOut
                    ? 'Keluar...'
                    : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <Link
                  onClick={() => setMobile(false)}
                  href="/login"
                  className="mt-2 rounded-xl border border-white/10 px-3 py-2"
                >
                  Login
                </Link>

                <Link
                  onClick={() => setMobile(false)}
                  href="/register"
                  className="rounded-xl px-3 py-2"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}