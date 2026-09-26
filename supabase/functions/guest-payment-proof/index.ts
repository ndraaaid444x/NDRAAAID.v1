import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'SERVER_CONFIGURATION_ERROR' }, 500)

  const form = await req.formData()
  const orderCode = String(form.get('order_code') || '').trim().toUpperCase()
  const token = String(form.get('tracking_token') || '').trim()
  const file = form.get('file')
  if (!orderCode || !token || !(file instanceof File)) return json({ error: 'ORDER_TOKEN_FILE_REQUIRED' }, 400)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) return json({ error: 'INVALID_FILE' }, 400)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: orderId, error: guardError } = await admin.rpc('assert_guest_order_pending', { p_order_code: orderCode, p_tracking_token: token })
  if (guardError || !orderId) return json({ error: 'ORDER_NOT_FOUND_OR_CLOSED' }, 404)

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `guest/${orderId}/${crypto.randomUUID()}.${ext}`
  const upload = await admin.storage.from('payment-proofs').upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (upload.error) return json({ error: upload.error.message }, 500)

  const { error: insertError } = await admin.from('payment_proofs').insert({ order_id: orderId, user_id: null, storage_path: path, verified: false })
  if (insertError) {
    await admin.storage.from('payment-proofs').remove([path])
    return json({ error: insertError.message }, 500)
  }
  return json({ ok: true, message: 'Bukti pembayaran berhasil dikirim.' })
})
