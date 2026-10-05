'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import SiteHeader from '@/components/site-header'
import ChatWidget from '@/components/chat-widget'
import WhatsApp from '@/components/whatsapp'
import BackButton from '@/components/back-button'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function SiteShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [number, setNumber] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    supabaseBrowser()
      .from('settings')
      .select('value')
      .eq('key', 'social')
      .maybeSingle()
      .then(({ data }) => {
        setNumber((data?.value as any)?.whatsapp || '')
      })
  }, [])

  // Sementara: setiap navigasi internal melakukan full browser reload.
  // Tujuannya agar data terbaru dari Supabase selalu dimuat ketika
  // user berpindah menu/halaman.
  useEffect(() => {
    function handleInternalNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null

      if (!anchor) return

      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)

      // Hanya navigasi internal.
      if (url.origin !== window.location.origin) return

      // Jangan ganggu anchor/hash pada halaman yang sama.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash
      ) {
        return
      }

      event.preventDefault()

      window.location.assign(url.href)
    }

    document.addEventListener('click', handleInternalNavigation)

    return () => {
      document.removeEventListener('click', handleInternalNavigation)
    }
  }, [])

  const showBackButton = pathname !== '/'

  return (
    <>
      <SiteHeader />

      <main>
        {showBackButton && (
          <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 sm:pt-4">
            <BackButton />
          </div>
        )}

        {children}
      </main>

      <ChatWidget />

      <WhatsApp number="6283824502294" />
    </>
  )
}
