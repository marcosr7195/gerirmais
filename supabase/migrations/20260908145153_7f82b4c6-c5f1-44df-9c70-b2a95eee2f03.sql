CREATE OR REPLACE FUNCTION public.create_vitrine_lead(
  p_slug text,
  p_item_id uuid,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_best_time text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_item record;
  v_phone text;
  v_name text;
  v_email text;
  v_client_id uuid;
  v_deal_id uuid;
  v_notes text;
BEGIN
  v_name := btrim(coalesce(p_name, ''));
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email := nullif(btrim(coalesce(p_email, '')), '');

  IF length(v_name) < 2 OR length(v_name) > 120 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Informe um nome válido.');
  END IF;
  IF length(v_phone) < 10 OR length(v_phone) > 15 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Informe um WhatsApp válido com DDD.');
  END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 255 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Informe um e-mail válido.');
  END IF;
  IF length(coalesce(p_message, '')) > 1000 OR length(coalesce(p_best_time, '')) > 120 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mensagem muito longa.');
  END IF;

  SELECT user_id INTO v_owner FROM public.profiles WHERE slug = p_slug LIMIT 1;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vitrine não encontrada.');
  END IF;

  SELECT id, name, price_min INTO v_item
  FROM public.vitrine_items
  WHERE id = p_item_id AND user_id = v_owner AND status = 'ativo'
  LIMIT 1;

  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item indisponível.');
  END IF;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE user_id = v_owner AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, origin, first_contact_date)
    VALUES (v_owner, v_name, v_phone, v_email, 'Vitrine', CURRENT_DATE)
    RETURNING id INTO v_client_id;
  END IF;

  v_notes := 'Origem: Vitrine' || chr(10) ||
             'Serviço de interesse: ' || v_item.name ||
             CASE WHEN nullif(btrim(coalesce(p_message, '')), '') IS NOT NULL
                  THEN chr(10) || 'Mensagem: ' || btrim(p_message) ELSE '' END ||
             CASE WHEN nullif(btrim(coalesce(p_best_time, '')), '') IS NOT NULL
                  THEN chr(10) || 'Melhor horário: ' || btrim(p_best_time) ELSE '' END;

  INSERT INTO public.deals (user_id, client_id, title, stage, value, fixed_value, notes, archived_at)
  VALUES (v_owner, v_client_id, 'Interesse: ' || v_item.name, 'lead', coalesce(v_item.price_min, 0), false, v_notes, NULL)
  RETURNING id INTO v_deal_id;

  INSERT INTO public.deal_items (user_id, deal_id, description, quantity, unit_price)
  VALUES (v_owner, v_deal_id, v_item.name, 1, coalesce(v_item.price_min, 0));

  RETURN jsonb_build_object('success', true, 'deal_id', v_deal_id, 'message', 'Recebemos seu interesse. Em breve entraremos em contato.');
END;
$$;

REVOKE ALL ON FUNCTION public.create_vitrine_lead(text, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vitrine_lead(text, uuid, text, text, text, text, text) TO anon, authenticated;