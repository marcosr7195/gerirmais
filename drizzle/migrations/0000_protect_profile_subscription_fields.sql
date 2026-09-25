CREATE OR REPLACE FUNCTION public.protect_profile_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Apenas o service_role (webhooks/funções do backend) pode alterar assinatura
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.plano := OLD.plano;
    NEW.status_assinatura := OLD.status_assinatura;
    NEW.data_inicio := OLD.data_inicio;
    NEW.data_vencimento := OLD.data_vencimento;
    NEW.origem := OLD.origem;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_protect_profile_subscription_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_subscription_fields();