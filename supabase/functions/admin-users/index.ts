import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "marcos7195@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    if (userData.user.email?.toLowerCase() !== ADMIN_EMAIL) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const { data: profiles } = await admin.from("profiles").select("user_id, plano, status_assinatura, data_vencimento, business_name");
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        profile: map.get(u.id) || null,
      }));
      return json({ users });
    }

    if (action === "create") {
      const { email, plano, data_vencimento } = body;
      if (!email || !plano || !data_vencimento) return json({ error: "Campos obrigatórios: email, plano, data_vencimento" }, 400);
      const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email);
      if (invErr) return json({ error: invErr.message }, 400);
      const userId = invited.user!.id;
      // wait briefly for handle_new_user trigger then update
      await admin.from("profiles").update({
        plano,
        status_assinatura: "ativo",
        data_vencimento,
      }).eq("user_id", userId);
      return json({ success: true, user_id: userId });
    }

    if (action === "update") {
      const { user_id, plano, data_vencimento, status_assinatura } = body;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      const patch: any = {};
      if (plano) patch.plano = plano;
      if (data_vencimento) patch.data_vencimento = data_vencimento;
      if (status_assinatura) patch.status_assinatura = status_assinatura;
      const { error } = await admin.from("profiles").update(patch).eq("user_id", user_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "revoke") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id obrigatório" }, 400);
      const { error } = await admin.from("profiles").update({ status_assinatura: "inativo" }).eq("user_id", user_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
