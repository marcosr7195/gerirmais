import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mapeamento por nome do produto Kiwify → plano interno
function detectPlan(productName: string | undefined | null): "starter" | "pro" | "scale" | null {
  if (!productName) return null;
  const n = productName.toLowerCase();
  if (n.includes("scale")) return "scale";
  if (n.includes("pro")) return "pro";
  if (n.includes("starter")) return "starter";
  return null;
}

function pickEmail(payload: any): string | null {
  return (
    payload?.Customer?.email ??
    payload?.customer?.email ??
    payload?.buyer?.email ??
    payload?.email ??
    null
  );
}

function pickProductName(payload: any): string | null {
  return (
    payload?.Product?.product_name ??
    payload?.product?.name ??
    payload?.product_name ??
    payload?.Subscription?.plan?.name ??
    null
  );
}

function pickEvent(payload: any): string {
  return (
    payload?.webhook_event_type ??
    payload?.event ??
    payload?.order_status ??
    payload?.Subscription?.status ??
    ""
  ).toString().toLowerCase();
}

// Busca paginada do usuário por e-mail (funciona com qualquer volume de usuários)
async function findUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u: any) => u.email?.toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ ok: false }, 405);
  }

  // 1) Autenticidade: token do webhook Kiwify (query param ou header)
  const expectedToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
  if (!expectedToken) {
    console.error("KIWIFY_WEBHOOK_TOKEN não configurado");
    return json({ ok: false }, 500);
  }
  const url = new URL(req.url);
  const providedToken =
    url.searchParams.get("token") ??
    req.headers.get("x-kiwify-token") ??
    req.headers.get("x-webhook-token");
  if (!providedToken || providedToken !== expectedToken) {
    return json({ ok: false }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const event = pickEvent(payload);
  // Log mínimo: apenas o tipo do evento, sem payload nem dados do cliente
  console.log("Kiwify webhook event:", event || "unknown");

  const email = pickEmail(payload);
  if (!email) {
    return json({ ok: false }, 400);
  }

  const productName = pickProductName(payload);
  const plan = detectPlan(productName);

  // 2) Busca paginada por e-mail
  let userId: string | null;
  try {
    userId = await findUserIdByEmail(supabase, email);
  } catch (e) {
    console.error("User lookup failed:", e);
    return json({ ok: false }, 500);
  }
  if (!userId) {
    return json({ ok: false }, 404);
  }

  const now = new Date();
  let updates: Record<string, unknown> = { origem: "kiwify" };

  // Approved payment / subscription active
  if (
    event.includes("approved") ||
    event.includes("paid") ||
    event.includes("active") ||
    event === "order_approved" ||
    event === "subscription_renewed"
  ) {
    if (!plan) {
      return json({ ok: false }, 400);
    }
    const next = new Date(now);
    next.setDate(next.getDate() + 31); // padrão mensal +1d tolerância
    updates = {
      ...updates,
      plano: plan,
      status_assinatura: "ativo",
      data_inicio: now.toISOString(),
      data_vencimento: next.toISOString(),
    };
  }
  // Subscription cancelled / refunded / chargeback
  else if (
    event.includes("cancel") ||
    event.includes("refund") ||
    event.includes("chargeback") ||
    event.includes("inactive")
  ) {
    updates = { ...updates, status_assinatura: "inativo", data_vencimento: now.toISOString() };
  }
  // Payment refused/failed/late → grace period 3 days
  else if (
    event.includes("refused") ||
    event.includes("failed") ||
    event.includes("late") ||
    event.includes("declined") ||
    event.includes("pending")
  ) {
    const grace = new Date(now);
    grace.setDate(grace.getDate() + 3);
    updates = { ...updates, status_assinatura: "atrasado", data_vencimento: grace.toISOString() };
  } else {
    return json({ ok: true, ignored: true });
  }

  const { error: updErr } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);

  if (updErr) {
    console.error("Profile update failed:", updErr.message);
    return json({ ok: false }, 500);
  }

  return json({ ok: true });
});
