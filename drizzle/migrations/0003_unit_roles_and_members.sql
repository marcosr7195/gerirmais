ALTER TABLE public.proposals ADD COLUMN unit_id uuid REFERENCES public.business_units(id);
ALTER TABLE public.deal_items ADD COLUMN unit_id uuid REFERENCES public.business_units(id);
ALTER TABLE public.client_interactions ADD COLUMN unit_id uuid REFERENCES public.business_units(id);
UPDATE public.proposals t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;
UPDATE public.deal_items t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;
UPDATE public.client_interactions t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;
CREATE INDEX ON public.proposals(unit_id);
CREATE INDEX ON public.deal_items(unit_id);
CREATE INDEX ON public.client_interactions(unit_id);
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.deal_items FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.client_interactions FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();

CREATE TABLE public.unit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL CHECK (role IN ('owner','manager','collaborator','viewer')),
  invited_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  email text,
  invite_token uuid UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  UNIQUE (unit_id, user_id)
);
CREATE INDEX ON public.unit_members(user_id);
GRANT SELECT ON public.unit_members TO authenticated;
GRANT ALL ON public.unit_members TO service_role;
ALTER TABLE public.unit_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see own membership" ON public.unit_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

INSERT INTO public.unit_members (unit_id, user_id, role, accepted_at, invite_token, expires_at)
SELECT u.id, o.owner_user_id, 'owner', now(), NULL, NULL
FROM public.business_units u JOIN public.organizations o ON o.id = u.org_id;

CREATE OR REPLACE FUNCTION public.unit_role(_unit uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM business_units u JOIN organizations o ON o.id = u.org_id
                 WHERE u.id = _unit AND o.owner_user_id = auth.uid()) THEN 'owner'
    ELSE (SELECT m.role FROM unit_members m WHERE m.unit_id = _unit AND m.user_id = auth.uid()
          AND m.accepted_at IS NOT NULL LIMIT 1)
  END
$$;

CREATE OR REPLACE FUNCTION public.can_access_unit(_unit uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.unit_role(_unit) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.current_unit_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.unit_role(public.current_unit_id())
$$;

CREATE OR REPLACE FUNCTION public.current_unit_owner()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.owner_user_id FROM business_units u JOIN organizations o ON o.id = u.org_id
  WHERE u.id = public.current_unit_id()
$$;

REVOKE EXECUTE ON FUNCTION public.unit_role(uuid), public.current_unit_role(), public.current_unit_owner() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.unit_role(uuid), public.current_unit_role(), public.current_unit_owner() TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_active_unit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM business_units u JOIN organizations o ON o.id = u.org_id
    WHERE u.id = NEW.active_unit_id AND o.owner_user_id = NEW.user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM unit_members m WHERE m.unit_id = NEW.active_unit_id AND m.user_id = NEW.user_id AND m.accepted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Unidade inválida';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.add_unit_owner_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO unit_members (unit_id, user_id, role, accepted_at, invite_token, expires_at)
  SELECT NEW.id, o.owner_user_id, 'owner', now(), NULL, NULL FROM organizations o WHERE o.id = NEW.org_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_add_unit_owner AFTER INSERT ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.add_unit_owner_member();

CREATE POLICY "Members see their units" ON public.business_units FOR SELECT TO authenticated
  USING (public.can_access_unit(id));

DO $$
DECLARE t text; old text; mod text; r_sel text; r_wr text;
BEGIN
  FOR t, old, mod IN VALUES
    ('clients','Users manage clients of active unit','ops'),
    ('deals','Users manage deals of active unit','ops'),
    ('service_orders','Users manage service_orders of active unit','ops'),
    ('checklist_items','Users manage checklist_items of active unit','ops'),
    ('transactions','Users manage transactions of active unit','fin'),
    ('proposals','Users manage own proposals','ops'),
    ('deal_items','Users manage own deal_items','ops'),
    ('client_interactions','Users manage own client_interactions','ops')
  LOOP
    r_sel := CASE mod WHEN 'ops' THEN '''owner'',''manager'',''collaborator'',''viewer''' ELSE '''owner'',''manager'',''viewer''' END;
    r_wr := CASE mod WHEN 'ops' THEN '''owner'',''manager'',''collaborator''' ELSE '''owner'',''manager''' END;
    EXECUTE format('DROP POLICY %I ON public.%I', old, t);
    EXECUTE format('CREATE POLICY unit_select ON public.%1$I FOR SELECT TO authenticated USING (unit_id = public.current_unit_id() AND public.current_unit_role() IN (%2$s))', t, r_sel);
    EXECUTE format('CREATE POLICY unit_insert ON public.%1$I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND unit_id = public.current_unit_id() AND public.current_unit_role() IN (%2$s))', t, r_wr);
    EXECUTE format('CREATE POLICY unit_update ON public.%1$I FOR UPDATE TO authenticated USING (unit_id = public.current_unit_id() AND public.current_unit_role() IN (%2$s)) WITH CHECK (unit_id = public.current_unit_id() AND public.current_unit_role() IN (%2$s))', t, r_wr);
    EXECUTE format('CREATE POLICY unit_delete ON public.%1$I FOR DELETE TO authenticated USING (unit_id = public.current_unit_id() AND public.current_unit_role() = ''owner'')', t);
  END LOOP;
END $$;

CREATE POLICY "Members read owner categories" ON public.categories FOR SELECT TO authenticated
  USING (user_id = public.current_unit_owner() AND public.current_unit_role() IN ('manager','viewer'));

CREATE OR REPLACE FUNCTION public.invite_unit_member(p_email text, p_role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid := public.current_unit_id(); v_email text := lower(btrim(coalesce(p_email,''))); v_token uuid;
BEGIN
  IF public.unit_role(v_unit) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_role NOT IN ('manager','collaborator','viewer') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 255 THEN RAISE EXCEPTION 'E-mail inválido'; END IF;
  DELETE FROM unit_members WHERE unit_id = v_unit AND lower(email) = v_email AND accepted_at IS NULL;
  INSERT INTO unit_members (unit_id, role, invited_by, email)
  VALUES (v_unit, p_role, auth.uid(), v_email) RETURNING invite_token INTO v_token;
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.accept_unit_invite(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT * INTO m FROM unit_members WHERE invite_token = p_token AND accepted_at IS NULL LIMIT 1;
  IF m.id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Convite inválido ou já utilizado.'); END IF;
  IF m.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'message', 'Este convite expirou.'); END IF;
  IF lower(m.email) IS DISTINCT FROM v_email THEN
    RETURN jsonb_build_object('success', false, 'message', 'Entre com o e-mail que recebeu o convite.');
  END IF;
  IF EXISTS (SELECT 1 FROM unit_members WHERE unit_id = m.unit_id AND user_id = auth.uid()) THEN
    DELETE FROM unit_members WHERE id = m.id;
    RETURN jsonb_build_object('success', false, 'message', 'Você já faz parte desta unidade.');
  END IF;
  UPDATE unit_members SET user_id = auth.uid(), accepted_at = now(), invite_token = NULL WHERE id = m.id;
  UPDATE profiles SET active_unit_id = m.unit_id, onboarding_completed = true WHERE user_id = auth.uid();
  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.list_unit_members()
RETURNS TABLE (id uuid, user_id uuid, email text, name text, role text, accepted_at timestamptz, created_at timestamptz, expires_at timestamptz, invite_token uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid := public.current_unit_id();
BEGIN
  IF public.unit_role(v_unit) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  RETURN QUERY
  SELECT m.id, m.user_id, coalesce(u.email::text, m.email), coalesce(p.owner_name, u.raw_user_meta_data->>'full_name'),
         m.role, m.accepted_at, m.created_at, m.expires_at, m.invite_token
  FROM unit_members m
  LEFT JOIN auth.users u ON u.id = m.user_id
  LEFT JOIN profiles p ON p.user_id = m.user_id
  WHERE m.unit_id = v_unit
  ORDER BY (m.role = 'owner') DESC, m.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.update_unit_member_role(p_member uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid := public.current_unit_id();
BEGIN
  IF public.unit_role(v_unit) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_role NOT IN ('manager','collaborator','viewer') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  UPDATE unit_members SET role = p_role WHERE id = p_member AND unit_id = v_unit AND role <> 'owner';
END $$;

CREATE OR REPLACE FUNCTION public.remove_unit_member(p_member uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid := public.current_unit_id(); v_user uuid;
BEGIN
  IF public.unit_role(v_unit) IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  DELETE FROM unit_members WHERE id = p_member AND unit_id = v_unit AND role <> 'owner' RETURNING user_id INTO v_user;
  IF v_user IS NOT NULL THEN
    UPDATE profiles SET active_unit_id = (
      SELECT u.id FROM business_units u JOIN organizations o ON o.id = u.org_id WHERE o.owner_user_id = v_user LIMIT 1)
    WHERE user_id = v_user AND active_unit_id = v_unit;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.invite_unit_member(text,text), public.accept_unit_invite(uuid), public.list_unit_members(),
  public.update_unit_member_role(uuid,text), public.remove_unit_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.invite_unit_member(text,text), public.accept_unit_invite(uuid), public.list_unit_members(),
  public.update_unit_member_role(uuid,text), public.remove_unit_member(uuid) TO authenticated;