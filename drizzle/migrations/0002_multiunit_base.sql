CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  cnpj text,
  tipo text NOT NULL DEFAULT 'MEI' CHECK (tipo IN ('MEI','PF','PJ')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fiscal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
  cnpj text,
  razao_social text,
  regime_tributario text
);
CREATE INDEX ON public.business_units(org_id);
CREATE INDEX ON public.fiscal_entities(unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations, public.business_units, public.fiscal_entities TO authenticated;
GRANT ALL ON public.organizations, public.business_units, public.fiscal_entities TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_entities ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_unit(_unit uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM business_units u JOIN organizations o ON o.id = u.org_id
                 WHERE u.id = _unit AND o.owner_user_id = auth.uid())
$$;

ALTER TABLE public.profiles ADD COLUMN active_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.current_unit_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.active_unit_id FROM profiles p WHERE p.user_id = auth.uid() AND public.can_access_unit(p.active_unit_id) LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_unit(uuid), public.current_unit_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_unit(uuid), public.current_unit_id() TO authenticated;

CREATE POLICY "Owner manages organizations" ON public.organizations FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner manages units" ON public.business_units FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = org_id AND o.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM organizations o WHERE o.id = org_id AND o.owner_user_id = auth.uid()));
CREATE POLICY "Owner manages fiscal entities" ON public.fiscal_entities FOR ALL TO authenticated
  USING (public.can_access_unit(unit_id)) WITH CHECK (public.can_access_unit(unit_id));

-- Unidade ativa só pode apontar para unidade própria
CREATE OR REPLACE FUNCTION public.validate_active_unit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM business_units u JOIN organizations o ON o.id = u.org_id
    WHERE u.id = NEW.active_unit_id AND o.owner_user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Unidade inválida';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_active_unit BEFORE INSERT OR UPDATE OF active_unit_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_active_unit();

-- Backfill: uma organização + unidade padrão por usuário, com dados do perfil
CREATE OR REPLACE FUNCTION public.create_default_unit(_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_org uuid; v_unit uuid;
BEGIN
  SELECT * INTO p FROM profiles WHERE user_id = _user LIMIT 1;
  INSERT INTO organizations (owner_user_id, name)
  VALUES (_user, coalesce(nullif(btrim(p.business_name),''), 'Minha empresa')) RETURNING id INTO v_org;
  INSERT INTO business_units (org_id, name, cnpj, tipo)
  VALUES (v_org, coalesce(nullif(btrim(p.business_name),''), 'Unidade principal'),
          nullif(btrim(p.fiscal_document),''),
          CASE lower(coalesce(p.fiscal_type,'mei')) WHEN 'pf' THEN 'PF' WHEN 'pj' THEN 'PJ' ELSE 'MEI' END)
  RETURNING id INTO v_unit;
  INSERT INTO fiscal_entities (unit_id, cnpj, razao_social)
  VALUES (v_unit, nullif(btrim(p.fiscal_document),''), nullif(btrim(p.company_name),''));
  UPDATE profiles SET active_unit_id = v_unit WHERE user_id = _user;
  RETURN v_unit;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_default_unit(uuid) FROM anon, authenticated, public;

SELECT public.create_default_unit(user_id) FROM public.profiles WHERE active_unit_id IS NULL;

-- unit_id nas tabelas operacionais
ALTER TABLE public.clients ADD COLUMN unit_id uuid REFERENCES public.business_units(id);
ALTER TABLE public.deals ADD COLUMN unit_id uuid REFERENCES public.business_units(id);
ALTER TABLE public.service_orders ADD COLUMN unit_id uuid REFERENCES public.business_units(id);
ALTER TABLE public.transactions ADD COLUMN unit_id uuid REFERENCES public.business_units(id);
ALTER TABLE public.checklist_items ADD COLUMN unit_id uuid REFERENCES public.business_units(id);

UPDATE public.clients t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;
UPDATE public.deals t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;
UPDATE public.service_orders t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;
UPDATE public.transactions t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;
UPDATE public.checklist_items t SET unit_id = p.active_unit_id FROM public.profiles p WHERE p.user_id = t.user_id AND t.unit_id IS NULL;

CREATE INDEX ON public.clients(unit_id);
CREATE INDEX ON public.deals(unit_id);
CREATE INDEX ON public.service_orders(unit_id);
CREATE INDEX ON public.transactions(unit_id);
CREATE INDEX ON public.checklist_items(unit_id);

-- Preenche unit_id automaticamente com a unidade ativa do dono do registro
CREATE OR REPLACE FUNCTION public.set_unit_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.unit_id IS NULL THEN
    SELECT active_unit_id INTO NEW.unit_id FROM profiles WHERE user_id = NEW.user_id LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();
CREATE TRIGGER trg_set_unit_id BEFORE INSERT ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.set_unit_id();

-- RLS por unidade ativa
DROP POLICY "Users manage own clients" ON public.clients;
CREATE POLICY "Users manage clients of active unit" ON public.clients FOR ALL TO authenticated
  USING (auth.uid() = user_id AND unit_id = public.current_unit_id())
  WITH CHECK (auth.uid() = user_id AND unit_id = public.current_unit_id());
DROP POLICY "Users manage own deals" ON public.deals;
CREATE POLICY "Users manage deals of active unit" ON public.deals FOR ALL TO authenticated
  USING (auth.uid() = user_id AND unit_id = public.current_unit_id())
  WITH CHECK (auth.uid() = user_id AND unit_id = public.current_unit_id());
DROP POLICY "Users manage own service_orders" ON public.service_orders;
CREATE POLICY "Users manage service_orders of active unit" ON public.service_orders FOR ALL TO authenticated
  USING (auth.uid() = user_id AND unit_id = public.current_unit_id())
  WITH CHECK (auth.uid() = user_id AND unit_id = public.current_unit_id());
DROP POLICY "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage transactions of active unit" ON public.transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id AND unit_id = public.current_unit_id())
  WITH CHECK (auth.uid() = user_id AND unit_id = public.current_unit_id());
DROP POLICY "Users manage own checklist_items" ON public.checklist_items;
CREATE POLICY "Users manage checklist_items of active unit" ON public.checklist_items FOR ALL TO authenticated
  USING (auth.uid() = user_id AND unit_id = public.current_unit_id())
  WITH CHECK (auth.uid() = user_id AND unit_id = public.current_unit_id());

-- Novos usuários recebem unidade padrão
CREATE OR REPLACE FUNCTION public.handle_new_user_unit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.active_unit_id IS NULL THEN
    PERFORM public.create_default_unit(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_profile_default_unit AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_unit();