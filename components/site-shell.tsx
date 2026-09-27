'use client'

import { useEffect, useState } from 'react'
import SiteHeader from '@/components/site-header'
import ChatWidget from '@/components/chat-widget'
import WhatsApp from '@/components/whatsapp'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function SiteShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [number, setNumber] = useState('')

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

  return (
    <>
      <SiteHeader />

      <main>{children}</main>

      <ChatWidget />

      <WhatsApp number="6283824502294" />
    </>
  )
}