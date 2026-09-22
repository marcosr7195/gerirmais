import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";
import {
  createSiteLeadHandler,
  type SiteLeadIngestResult,
} from "../_shared/site-lead-handler.ts";

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const supabase = createClient(
  requiredEnvironment("SUPABASE_URL"),
  requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

const handler = createSiteLeadHandler({
  pepper: requiredEnvironment("SITE_LEAD_CREDENTIAL_PEPPER"),
  ingest: async ({
    credentialDigestHex,
    idempotencyKeyDigestHex,
    payload,
  }): Promise<SiteLeadIngestResult> => {
    const { data, error } = await supabase.rpc("ingest_site_lead_from_edge", {
      p_credential_digest_hex: credentialDigestHex,
      p_idempotency_key_digest_hex: idempotencyKeyDigestHex,
      p_payload: payload,
    });

    if (error) throw error;
    if (
      typeof data !== "object" ||
      data === null ||
      !("status" in data) ||
      !["created", "duplicate", "conflict"].includes(String(data.status))
    ) {
      throw new Error("Unexpected ingestion result");
    }

    return { status: data.status as SiteLeadIngestResult["status"] };
  },
});

Deno.serve(handler);
