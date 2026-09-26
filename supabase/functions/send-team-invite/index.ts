import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const APP_URL = 'https://app.gerirmais.com.br'
const Body = z.object({ member_id: z.string().uuid() })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth.slice(7))
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401)

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_input' }, 400)

  const { data: role } = await supabase.rpc('current_unit_role')
  if (role !== 'owner') return json({ error: 'forbidden' }, 403)

  const { data: members, error } = await supabase.rpc('list_unit_members')
  if (error) return json({ error: 'lookup_failed' }, 500)
  const m = (members as any[]).find((x) => x.id === parsed.data.member_id)
  if (!m || m.accepted_at || !m.invite_token || !m.email) return json({ error: 'not_found' }, 404)

  const { data: unitId } = await supabase.rpc('current_unit_id')
  const { data: unit } = await supabase.from('business_units').select('name').eq('id', unitId).maybeSingle()

  try {
    const result = await sendTemplateEmail('team-invite', m.email, {
      templateData: { unitName: unit?.name, role: m.role, inviteUrl: `${APP_URL}/convite/${m.invite_token}` },
      idempotencyKey: `team-invite-${m.invite_token}-${Date.now()}`,
    })
    return json(result)
  } catch (e) {
    console.error('send-team-invite failed', (e as any)?.code ?? e)
    return json({ error: 'send_failed' }, 502)
  }
})
