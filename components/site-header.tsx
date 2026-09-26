'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Wallet,
  User,
  Receipt,
  Shield,
} from 'lucide-react'

export default function SiteHeader() {
  const [user, setUser] = useState<any>()
  const [profile, setProfile] = useState<any>()
  const [balance, setBalance] = useState(0)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [unread, setUnread] = useState(0)

  async function loadUserData(currentUser: any) {
    if (!currentUser) {
      setProfile(undefined)
      setBalance(0)
      setUnread(0)
      return
    }

    const s = supabaseBrowser()

    const { data: p } = await s
      .from('profiles')
      .select('name,username,role')
      .eq('id', currentUser.id)
      .single()

    setProfile(p)

    const { data: wallet } = await s
      .from('wallets')
      .select('balance')
      .eq('user_id', currentUser.id)
      .maybeSingle()

    setBalance(Number(wallet?.balance || 0))

    const { count } = await s
      .from('notifications')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', currentUser.id)
      .is('read_at', null)

    setUnread(count || 0)
  }

  useEffect(() => {
    const s = supabaseBrowser()

    ;(async () => {
      const {
        data: { user },
      } = await s.auth.getUser()

      setUser(user)

      if (user) {
        await loadUserData(user)
      }
    })()

    const {
      data: { subscription },
    } = s.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user

        setUser(currentUser)

        if (currentUser) {
          await loadUserData(currentUser)
        } else {
          setProfile(undefined)
          setBalance(0)
          setUnread(0)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function logout() {
    setMobile(false)
    setOpen(false)

    await supabaseBrowser().auth.signOut()

    location.href = '/'
  }

  const formattedBalance = new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }
  ).format(balance)

  const isAdmin = ['owner', 'admin'].includes(
    profile?.role
  )

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link
          href="/"
          className="text-xl font-black tracking-tight"
          onClick={() => setMobile(false)}
        >
          NDRA
          <span className="gradient-text">
            AAAID
          </span>
        </Link>

        <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
          <Link href="/">Home</Link>
          <Link href="/games">Games</Link>
          <Link href="/#promo">Promo</Link>
          <Link href="/orders/track">
            Cek Transaksi
          </Link>
          <Link href="/terms">Bantuan</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/games"
            className="rounded-xl p-2 hover:bg-white/5"
          >
            <Search size={19} />
          </Link>

          {user ? (
            <>
              {/* SALDO DESKTOP */}
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
              <div className="relative hidden sm:block">
                <button
                  onClick={() =>
                    setOpen(v => !v)
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
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
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-pink-300 hover:bg-white/5"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn btn-muted hidden sm:inline-flex"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="btn btn-primary"
              >
                Daftar
              </Link>
            </>
          )}

          {/* MOBILE MENU BUTTON */}
          <button
            className="rounded-xl p-2 md:hidden"
            onClick={() =>
              setMobile(v => !v)
            }
            aria-label="Menu"
          >
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobile && (
        <div className="border-t border-white/10 px-4 py-4 md:hidden">
          <div className="grid gap-1 text-sm">
            <Link
              className="rounded-xl px-3 py-3 hover:bg-white/5"
              onClick={() => setMobile(false)}
              href="/"
            >
              Home
            </Link>

            <Link
              className="rounded-xl px-3 py-3 hover:bg-white/5"
              onClick={() => setMobile(false)}
              href="/games"
            >
              Games
            </Link>

            <Link
              className="rounded-xl px-3 py-3 hover:bg-white/5"
              onClick={() => setMobile(false)}
              href="/#promo"
            >
              Promo
            </Link>

            <Link
              className="rounded-xl px-3 py-3 hover:bg-white/5"
              onClick={() => setMobile(false)}
              href="/orders/track"
            >
              Cek Transaksi
            </Link>

            {user ? (
              <>
                <div className="my-2 border-t border-white/10" />

                <Link
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5"
                  onClick={() => setMobile(false)}
                  href="/dashboard"
                >
                  <Wallet
                    size={18}
                    className="text-cyan-300"
                  />
                  <div>
                    <div>Dashboard</div>
                    <div className="text-xs text-slate-500">
                      Saldo: {formattedBalance}
                    </div>
                  </div>
                </Link>

                <Link
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5"
                  onClick={() => setMobile(false)}
                  href="/account"
                >
                  <User size={18} />
                  <span>Profile / Akun</span>
                </Link>

                <Link
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5"
                  onClick={() => setMobile(false)}
                  href="/orders"
                >
                  <Receipt size={18} />
                  <span>Transaksi</span>
                </Link>

                <Link
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5"
                  onClick={() => setMobile(false)}
                  href="/notifications"
                >
                  <Bell size={18} />
                  <span>
                    Notifikasi
                    {unread > 0 && (
                      <span className="ml-2 rounded-full bg-pink-400 px-2 py-0.5 text-[10px] text-white">
                        {unread}
                      </span>
                    )}
                  </span>
                </Link>

                {isAdmin && (
                  <Link
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-cyan-300 hover:bg-white/5"
                    onClick={() => setMobile(false)}
                    href="/admin"
                  >
                    <Shield size={18} />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <div className="my-2 border-t border-white/10" />

                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-pink-300 hover:bg-white/5"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <div className="my-2 border-t border-white/10" />

                <Link
                  className="rounded-xl px-3 py-3 text-center hover:bg-white/5"
                  onClick={() => setMobile(false)}
                  href="/login"
                >
                  Login
                </Link>

                <Link
                  className="btn btn-primary mt-1 text-center"
                  onClick={() => setMobile(false)}
                  href="/register"
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