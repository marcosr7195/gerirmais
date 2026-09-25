import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const Body = z.object({
  token: z.string().min(1).max(4096),
  slug: z.string().min(1).max(120),
  item_id: z.string().uuid(),
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(30),
  email: z.string().max(200).nullable().optional(),
  message: z.string().max(2000).nullable().optional(),
  best_time: z.string().max(120).nullable().optional(),
});

const LIMIT_PER_HOUR = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Site key é pública; entregue ao formulário.
  if (req.method === 'GET') return json({ siteKey: Deno.env.get('TURNSTILE_SITE_KEY') ?? null });
  if (req.method !== 'POST') return json({ success: false }, 405);

  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ success: false, message: 'Dados inválidos.' }, 400);
    const b = parsed.data;

    const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secret) return json({ success: false, message: 'Verificação indisponível.' }, 500);

    const form = new FormData();
    form.append('secret', secret);
    form.append('response', b.token);
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (ip) form.append('remoteip', ip);
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const vr = await verify.json().catch(() => ({}));
    if (!verify.ok || !vr.success) {
      return json({ success: false, message: 'Falha na verificação de segurança. Tente novamente.' }, 403);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: cErr } = await admin
      .from('vitrine_lead_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('slug', b.slug)
      .gte('created_at', since);
    if (cErr) throw cErr;
    if ((count ?? 0) >= LIMIT_PER_HOUR) {
      return json({ success: false, message: 'Muitos pedidos recebidos nesta vitrine. Tente novamente mais tarde.' }, 429);
    }

    const { data, error } = await admin.rpc('create_vitrine_lead', {
      p_slug: b.slug,
      p_item_id: b.item_id,
      p_name: b.name,
      p_phone: b.phone,
      p_email: b.email || null,
      p_message: b.message || null,
      p_best_time: b.best_time || null,
    });
    if (error) throw error;

    if (data?.success && !data?.duplicate) {
      await admin.from('vitrine_lead_attempts').insert({ slug: b.slug });
    }
    return json(data);
  } catch (e) {
    console.error('vitrine-lead error', e instanceof Error ? e.message : e);
    return json({ success: false, message: 'Não foi possível enviar agora.' }, 500);
  }
});
