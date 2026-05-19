
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text UNIQUE;

CREATE TABLE IF NOT EXISTS public.vitrine_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'servico',
  description text,
  price_type text NOT NULL DEFAULT 'fixo',
  price_min numeric DEFAULT 0,
  price_max numeric,
  duration text,
  image_url text,
  status text NOT NULL DEFAULT 'ativo',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vitrine_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vitrine_items"
ON public.vitrine_items FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_vitrine_items_updated_at
BEFORE UPDATE ON public.vitrine_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket public
INSERT INTO storage.buckets (id, name, public)
VALUES ('vitrine', 'vitrine', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Vitrine images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'vitrine');

CREATE POLICY "Users upload own vitrine images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vitrine' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own vitrine images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vitrine' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own vitrine images"
ON storage.objects FOR DELETE
USING (bucket_id = 'vitrine' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public RPC to fetch business + active items by slug
CREATE OR REPLACE FUNCTION public.get_vitrine_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_items jsonb;
BEGIN
  SELECT user_id, business_name, slogan, logo_url, whatsapp, instagram, commercial_email, slug
  INTO v_profile
  FROM public.profiles
  WHERE slug = p_slug
  LIMIT 1;

  IF v_profile.user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.sort_order, i.created_at), '[]'::jsonb)
  INTO v_items
  FROM public.vitrine_items i
  WHERE i.user_id = v_profile.user_id AND i.status = 'ativo';

  RETURN jsonb_build_object(
    'business', to_jsonb(v_profile),
    'items', v_items
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_vitrine_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vitrine_by_slug(text) TO anon, authenticated;
