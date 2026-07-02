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

    if (action === "cleanup_test_records") {
      const dryRun = body.dry_run !== false && !body.confirm;
      const pattern = "%(teste|test|exemplo|example|demo|dummy)%";
      // ilike só aceita um pattern; usamos or() com múltiplos ilikes.
      const nameFilter = "name.ilike.%teste%,name.ilike.%test%,name.ilike.%exemplo%,name.ilike.%example%,name.ilike.%demo%,name.ilike.%dummy%";
      const titleFilter = "title.ilike.%teste%,title.ilike.%test%,title.ilike.%exemplo%,title.ilike.%example%,title.ilike.%demo%,title.ilike.%dummy%";

      const { data: clients } = await admin.from("clients").select("id, name, user_id").or(nameFilter);
      const { data: deals } = await admin.from("deals").select("id, title, user_id").or(titleFilter);
      const { data: orders } = await admin.from("service_orders").select("id, title, user_id").or(titleFilter);

      const summary = {
        clients: clients?.length || 0,
        deals: deals?.length || 0,
        service_orders: orders?.length || 0,
        samples: {
          clients: (clients || []).slice(0, 10).map((c: any) => c.name),
          deals: (deals || []).slice(0, 10).map((d: any) => d.title),
          service_orders: (orders || []).slice(0, 10).map((o: any) => o.title),
        },
      };

      if (dryRun) return json({ dry_run: true, summary });

      const clientIds = (clients || []).map((c: any) => c.id);
      const dealIds = (deals || []).map((d: any) => d.id);
      const orderIds = (orders || []).map((o: any) => o.id);

      // Remove filhos primeiro para respeitar FKs.
      if (dealIds.length) await admin.from("deal_items").delete().in("deal_id", dealIds);
      if (orderIds.length) await admin.from("checklist_items").delete().in("service_order_id", orderIds);
      if (clientIds.length) await admin.from("client_interactions").delete().in("client_id", clientIds);

      if (orderIds.length) await admin.from("service_orders").delete().in("id", orderIds);
      if (dealIds.length) await admin.from("deals").delete().in("id", dealIds);
      if (clientIds.length) await admin.from("clients").delete().in("id", clientIds);

      return json({ deleted: summary });
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
