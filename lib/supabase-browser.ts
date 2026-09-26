import { createBrowserClient } from '@supabase/ssr'

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
  const controller = new AbortController()

  const timer = setTimeout(() => {
    controller.abort()
  }, 15000)

  const originalSignal = init.signal

  const handleAbort = () => {
    controller.abort()
  }

  if (originalSignal) {
    if (originalSignal.aborted) {
      controller.abort()
    } else {
      originalSignal.addEventListener('abort', handleAbort, { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)

    if (originalSignal) {
      originalSignal.removeEventListener('abort', handleAbort)
    }
  }
}

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: fetchWithTimeout,
      },
    }
  )
}