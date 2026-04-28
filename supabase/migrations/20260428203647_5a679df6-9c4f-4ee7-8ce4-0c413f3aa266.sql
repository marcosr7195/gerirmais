-- 1. Add plan/subscription fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS status_assinatura text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS data_inicio timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS data_vencimento timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS origem text;

-- Constraints
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_plano_check
    CHECK (plano IN ('starter','pro','scale'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
    CHECK (status_assinatura IN ('trial','ativo','inativo','atrasado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Update handle_new_user to set trial defaults explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, plano, status_assinatura, data_inicio, data_vencimento)
  VALUES (NEW.id, 'pro', 'trial', now(), now() + interval '14 days');

  INSERT INTO public.categories (user_id, name, type, classification) VALUES
    (NEW.id, 'Consultoria', 'receita', 'receita_operacional'),
    (NEW.id, 'Mentoria', 'receita', 'receita_operacional'),
    (NEW.id, 'Contrato Recorrente', 'receita', 'receita_operacional'),
    (NEW.id, 'Serviço Avulso', 'receita', 'receita_operacional'),
    (NEW.id, 'Comissão', 'receita', 'receita_nao_operacional'),
    (NEW.id, 'Produto Digital', 'receita', 'receita_operacional'),
    (NEW.id, 'Outros Recebimentos', 'receita', 'receita_nao_operacional');

  INSERT INTO public.categories (user_id, name, type, classification) VALUES
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
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill existing users (give them an active 14-day trial if nothing set)
UPDATE public.profiles
SET data_vencimento = COALESCE(data_vencimento, now() + interval '14 days'),
    data_inicio = COALESCE(data_inicio, created_at, now()),
    plano = COALESCE(plano, 'pro'),
    status_assinatura = COALESCE(status_assinatura, 'trial')
WHERE data_vencimento IS NULL OR plano IS NULL OR status_assinatura IS NULL;