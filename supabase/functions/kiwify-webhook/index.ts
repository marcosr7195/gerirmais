import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("Kiwify webhook received:", JSON.stringify(payload).slice(0, 500));

  const email = pickEmail(payload);
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing customer email" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = pickEvent(payload);
  const productName = pickProductName(payload);
  const plan = detectPlan(productName);

  // Find user by email via auth admin
  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    return new Response(JSON.stringify({ error: "User lookup failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const user = usersList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.warn("No user found for email:", email);
    return new Response(JSON.stringify({ error: "User not found", email }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
      return new Response(JSON.stringify({ error: "Could not detect plan from product", productName }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    console.log("Unhandled event:", event);
    return new Response(JSON.stringify({ ok: true, ignored: true, event }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: updErr } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id);

  if (updErr) {
    console.error("Profile update failed:", updErr);
    return new Response(JSON.stringify({ error: "Update failed", details: updErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, user_id: user.id, applied: updates }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
