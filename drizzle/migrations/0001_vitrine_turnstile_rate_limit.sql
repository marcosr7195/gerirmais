CREATE TABLE public.vitrine_lead_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vitrine_lead_attempts TO service_role;
ALTER TABLE public.vitrine_lead_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_vitrine_lead_attempts_slug_time ON public.vitrine_lead_attempts (slug, created_at DESC);

REVOKE EXECUTE ON FUNCTION public.create_vitrine_lead(text, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_vitrine_lead(text, uuid, text, text, text, text, text) TO service_role;