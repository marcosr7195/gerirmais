CREATE OR REPLACE FUNCTION public.create_vitrine_lead(p_slug text, p_item_id uuid, p_name text, p_phone text, p_email text DEFAULT NULL::text, p_message text DEFAULT NULL::text, p_best_time text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_item record;
  v_phone text;
  v_name text;
  v_email text;
  v_message text;
  v_best_time text;
  v_client_id uuid;
  v_deal_id uuid;
  v_existing uuid;
  v_recent int;
  v_notes text;
BEGIN
  v_name := btrim(regexp_replace(coalesce(p_name, ''), '[\r\n\t]+', ' ', 'g'));
  v_name := left(regexp_replace(v_name, '\s+', ' ', 'g'), 120);
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_message := nullif(btrim(regexp_replace(coalesce(p_message, ''), '[\r\n]{3,}', chr(10), 'g')), '');
  v_best_time := nullif(btrim(regexp_replace(coalesce(p_best_time, ''), '[\r\n\t]+', ' ', 'g')), '');

  IF length(v_name) < 2 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Informe um nome válido.');
  END IF;
  IF length(v_phone) < 10 OR length(v_phone) > 15 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Informe um WhatsApp válido com DDD.');
  END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 255 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Informe um e-mail válido.');
  END IF;
  IF length(coalesce(v_message, '')) > 1000 OR length(coalesce(v_best_time, '')) > 120 THEN
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

  IF v_client_id IS NOT NULL THEN
    SELECT count(*) INTO v_recent
    FROM public.deals d
    WHERE d.client_id = v_client_id
      AND d.created_at > now() - interval '10 minutes';
    IF v_recent >= 3 THEN
      RETURN jsonb_build_object('success', false, 'message', 'Muitos envios em pouco tempo. Tente novamente mais tarde.');
    END IF;

    SELECT d.id INTO v_existing
    FROM public.deals d
    JOIN public.deal_items di ON di.deal_id = d.id
    WHERE d.client_id = v_client_id
      AND d.archived_at IS NULL
      AND d.stage NOT IN ('perdido', 'fechado')
      AND di.description = v_item.name
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'duplicate', true, 'deal_id', v_existing,
        'message', 'Seu interesse já foi registrado. Em breve entraremos em contato.');
    END IF;
  ELSE
    INSERT INTO public.clients (user_id, name, phone, email, origin, first_contact_date)
    VALUES (v_owner, v_name, v_phone, v_email, 'Vitrine', CURRENT_DATE)
    RETURNING id INTO v_client_id;
  END IF;

  v_notes := 'Origem: Vitrine' || chr(10) ||
             'Serviço de interesse: ' || v_item.name || chr(10) ||
             'Nome: ' || v_name || chr(10) ||
             'WhatsApp: ' || v_phone ||
             CASE WHEN v_email IS NOT NULL THEN chr(10) || 'E-mail: ' || v_email ELSE '' END ||
             CASE WHEN v_best_time IS NOT NULL THEN chr(10) || 'Melhor horário: ' || v_best_time ELSE '' END ||
             CASE WHEN v_message IS NOT NULL THEN chr(10) || 'Mensagem: ' || v_message ELSE '' END;

  INSERT INTO public.deals (user_id, client_id, title, stage, value, fixed_value, notes, archived_at)
  VALUES (v_owner, v_client_id, 'Vitrine: ' || v_item.name, 'lead', coalesce(v_item.price_min, 0), false, v_notes, NULL)
  RETURNING id INTO v_deal_id;

  INSERT INTO public.deal_items (user_id, deal_id, description, quantity, unit_price)
  VALUES (v_owner, v_deal_id, v_item.name, 1, coalesce(v_item.price_min, 0));

  RETURN jsonb_build_object('success', true, 'duplicate', false, 'deal_id', v_deal_id, 'message', 'Recebemos seu interesse. Em breve entraremos em contato.');
END;
$function$;

REVOKE ALL ON FUNCTION public.create_vitrine_lead(text, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vitrine_lead(text, uuid, text, text, text, text, text) TO anon, authenticated;