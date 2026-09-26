ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_signup boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_profile_subscription_fields()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND coalesce(current_setting('app.allow_sub_change', true), '') <> 'on' THEN
    NEW.plano := OLD.plano;
    NEW.status_assinatura := OLD.status_assinatura;
    NEW.data_inicio := OLD.data_inicio;
    NEW.data_vencimento := OLD.data_vencimento;
    NEW.origem := OLD.origem;
    NEW.trial_used := OLD.trial_used;
    NEW.invited_signup := OLD.invited_signup;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_invited boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM unit_members m WHERE lower(m.email) = lower(NEW.email)
    AND m.accepted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at > now())) INTO v_invited;

  IF v_invited THEN
    INSERT INTO public.profiles (user_id, plano, status_assinatura, data_inicio, data_vencimento, trial_used, invited_signup)
    VALUES (NEW.id, 'starter', 'inativo', now(), now(), false, true);
  ELSE
    INSERT INTO public.profiles (user_id, plano, status_assinatura, data_inicio, data_vencimento, trial_used)
    VALUES (NEW.id, 'pro', 'trial', now(), now() + interval '14 days', true);
  END IF;

  INSERT INTO public.categories (user_id, name, type, classification) VALUES
    (NEW.id, 'Consultoria', 'receita', 'receita_operacional'),
    (NEW.id, 'Mentoria', 'receita', 'receita_operacional'),
    (NEW.id, 'Contrato Recorrente', 'receita', 'receita_operacional'),
    (NEW.id, 'Serviço Avulso', 'receita', 'receita_operacional'),
    (NEW.id, 'Comissão', 'receita', 'receita_nao_operacional'),
    (NEW.id, 'Produto Digital', 'receita', 'receita_operacional'),
    (NEW.id, 'Outros Recebimentos', 'receita', 'receita_nao_operacional'),
    (NEW.id, 'Ferramentas e Software', 'despesa', 'despesa_operacional'),
    (NEW.id, 'Marketing e Tráfego', 'despesa', 'despesa_operacional'),
    (NEW.id, 'Domínio e Hospedagem', 'despesa', 'despesa_operacional'),
    (NEW.id, 'Telefone e Internet', 'despesa', 'despesa_operacional'),
    (NEW.id, 'Coworking e Escritório', 'despesa', 'despesa_operacional'),
    (NEW.id, 'Pró-labore', 'despesa', 'despesa_pessoal'),
    (NEW.id, 'Freelancer e Parceiro', 'despesa', 'custo_servico'),
    (NEW.id, 'Capacitação', 'despesa', 'despesa_pessoal'),
    (NEW.id, 'Impostos e Taxas', 'despesa', 'imposto_taxa'),
    (NEW.id, 'Contador', 'despesa', 'despesa_operacional'),
    (NEW.id, 'Despesa Variável', 'despesa', 'despesa_operacional'),
    (NEW.id, 'Investimento', 'despesa', 'despesa_operacional');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_unit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.active_unit_id IS NULL AND NOT NEW.invited_signup THEN
    PERFORM public.create_default_unit(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.accept_my_pending_invite()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_email text; m record; v_unit_name text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('accepted', false); END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT * INTO m FROM unit_members WHERE lower(email) = v_email AND accepted_at IS NULL
    AND (expires_at IS NULL OR expires_at > now()) ORDER BY created_at DESC LIMIT 1;
  IF m.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM unit_members WHERE lower(email) = v_email AND accepted_at IS NULL) THEN
      RETURN jsonb_build_object('accepted', false, 'expired', true);
    END IF;
    RETURN jsonb_build_object('accepted', false);
  END IF;
  IF EXISTS (SELECT 1 FROM unit_members WHERE unit_id = m.unit_id AND user_id = auth.uid()) THEN
    DELETE FROM unit_members WHERE id = m.id;
    RETURN jsonb_build_object('accepted', false);
  END IF;
  UPDATE unit_members SET user_id = auth.uid(), accepted_at = now(), invite_token = NULL WHERE id = m.id;
  UPDATE profiles SET active_unit_id = m.unit_id, onboarding_completed = true WHERE user_id = auth.uid();
  SELECT name INTO v_unit_name FROM business_units WHERE id = m.unit_id;
  RETURN jsonb_build_object('accepted', true, 'unit_name', v_unit_name, 'role', m.role);
END $$;

CREATE OR REPLACE FUNCTION public.list_my_units()
 RETURNS TABLE(unit_id uuid, name text, role text, is_owner boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT u.id, u.name, 'owner', true FROM business_units u JOIN organizations o ON o.id = u.org_id
   WHERE o.owner_user_id = auth.uid()
  UNION
  SELECT u.id, u.name, m.role, false FROM unit_members m JOIN business_units u ON u.id = m.unit_id
   JOIN organizations o ON o.id = u.org_id
   WHERE m.user_id = auth.uid() AND m.accepted_at IS NOT NULL AND o.owner_user_id <> auth.uid()
  ORDER BY 4 DESC, 2
$$;

CREATE OR REPLACE FUNCTION public.switch_active_unit(p_unit uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.unit_role(p_unit) IS NULL THEN RAISE EXCEPTION 'Unidade inválida'; END IF;
  UPDATE profiles SET active_unit_id = p_unit WHERE user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.current_unit_plan()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('plano', p.plano, 'status_assinatura', p.status_assinatura, 'data_vencimento', p.data_vencimento)
  FROM profiles p WHERE p.user_id = public.current_unit_owner()
$$;

CREATE OR REPLACE FUNCTION public.create_my_business(p_name text, p_service_type text, p_document text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid uuid := auth.uid(); p record; v_count int; v_limit int; v_org uuid; v_unit uuid;
        v_name text := btrim(coalesce(p_name,'')); v_doc text := nullif(btrim(coalesce(p_document,'')),'');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF length(v_name) < 2 OR length(v_name) > 120 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Informe o nome do negócio.');
  END IF;
  SELECT * INTO p FROM profiles WHERE user_id = v_uid;
  SELECT count(*) INTO v_count FROM organizations WHERE owner_user_id = v_uid;

  IF v_count > 0 THEN
    v_limit := CASE p.plano WHEN 'scale' THEN 5 WHEN 'pro' THEN 2 ELSE 1 END;
    IF p.status_assinatura = 'trial' THEN v_limit := 1; END IF;
    IF v_count >= v_limit THEN
      RETURN jsonb_build_object('success', false, 'limit', true,
        'message', 'Você atingiu o limite de negócios do seu plano. Faça upgrade para criar mais.');
    END IF;
  END IF;

  INSERT INTO organizations (owner_user_id, name) VALUES (v_uid, v_name) RETURNING id INTO v_org;
  INSERT INTO business_units (org_id, name, cnpj, tipo)
  VALUES (v_org, v_name, v_doc, CASE WHEN v_doc IS NULL THEN 'MEI' WHEN length(regexp_replace(v_doc,'\D','','g')) = 11 THEN 'PF' ELSE 'PJ' END)
  RETURNING id INTO v_unit;
  INSERT INTO fiscal_entities (unit_id, cnpj) VALUES (v_unit, v_doc);

  PERFORM set_config('app.allow_sub_change', 'on', true);
  UPDATE profiles SET
    active_unit_id = v_unit,
    onboarding_completed = true,
    business_name = coalesce(nullif(btrim(business_name),''), v_name),
    service_type = coalesce(service_type, p_service_type),
    document = coalesce(document, v_doc),
    plano = CASE WHEN v_count = 0 AND NOT p.trial_used THEN 'pro' ELSE plano END,
    status_assinatura = CASE WHEN v_count = 0 AND NOT p.trial_used THEN 'trial' ELSE status_assinatura END,
    data_inicio = CASE WHEN v_count = 0 AND NOT p.trial_used THEN now() ELSE data_inicio END,
    data_vencimento = CASE WHEN v_count = 0 AND NOT p.trial_used THEN now() + interval '14 days' ELSE data_vencimento END,
    trial_used = true
  WHERE user_id = v_uid;
  PERFORM set_config('app.allow_sub_change', '', true);
  RETURN jsonb_build_object('success', true, 'unit_id', v_unit);
END $$;

REVOKE ALL ON FUNCTION public.accept_my_pending_invite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_units() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.switch_active_unit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_unit_plan() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_my_business(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_my_pending_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_units() TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_active_unit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_unit_plan() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_my_business(text, text, text) TO authenticated;