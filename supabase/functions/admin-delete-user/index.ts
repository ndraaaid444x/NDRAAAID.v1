import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) throw new Error('UNAUTHORIZED')
    const { data: profile } = await callerClient.from('profiles').select('role,is_suspended').eq('id', caller.id).single()
    if (profile?.role !== 'owner' || profile.is_suspended) throw new Error('ONLY_OWNER_CAN_DELETE_USER')
    const body = await req.json()
    const userId = body?.user_id
    if (!userId || userId === caller.id) throw new Error('INVALID_TARGET_USER')
    const admin = createClient(url, service)
    const { data: target } = await admin.from('profiles').select('id,role,email').eq('id', userId).single()
    if (!target) throw new Error('USER_NOT_FOUND')
    if (target.role === 'owner') throw new Error('CANNOT_DELETE_OWNER')
    const { error: auditError } = await admin.from('admin_audit_logs').insert({ admin_id: caller.id, action: 'user_delete', entity_type: 'profile', entity_id: userId, metadata: { email: target.email } })
    if (auditError) throw auditError
    const { error } = await admin.auth.admin.deleteUser(userId, false)
    if (error) throw error
    return new Response(JSON.stringify({ ok: true, message: 'User deleted' }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'UNKNOWN_ERROR'
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
