import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  const auth = req.headers.get('Authorization')
  const url = Deno.env.get('SUPABASE_URL'), anon = Deno.env.get('SUPABASE_ANON_KEY'), key = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!auth || !url || !anon) return json({ error: 'UNAUTHORIZED' }, 401)
  const supabase = createClient(url, anon, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return json({ error: 'UNAUTHORIZED' }, 401)
  if (!key || !from) return json({ sent: false, reason: 'EMAIL_NOT_CONFIGURED' })
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [user.email], subject: 'Password NDRAAAID.v1 berhasil diubah', html: '<div style="font-family:Arial,sans-serif"><h1>Password berhasil diubah</h1><p>Password akun NDRAAAID.v1 Anda baru saja diubah.</p><p>Jika Anda tidak melakukan perubahan ini, segera hubungi Customer Support.</p></div>' }) })
  return response.ok ? json({ sent: true }) : json({ sent: false, reason: 'RESEND_ERROR' }, 502)
})
