
-- Add type column to categories
ALTER TABLE public.categories ADD COLUMN type text NOT NULL DEFAULT 'despesa';

-- Update handle_new_user to seed default categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  
  -- Seed default revenue categories
  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Consultoria', 'receita'),
    (NEW.id, 'Mentoria', 'receita'),
    (NEW.id, 'Contrato Recorrente', 'receita'),
    (NEW.id, 'Serviço Avulso', 'receita'),
    (NEW.id, 'Comissão', 'receita'),
    (NEW.id, 'Produto Digital', 'receita'),
    (NEW.id, 'Outros Recebimentos', 'receita');
  
  -- Seed default expense categories
  INSERT INTO public.categories (user_id, name, type) VALUES
    (NEW.id, 'Ferramentas e Software', 'despesa'),
    (NEW.id, 'Marketing e Tráfego', 'despesa'),
    (NEW.id, 'Domínio e Hospedagem', 'despesa'),
    (NEW.id, 'Telefone e Internet', 'despesa'),
    (NEW.id, 'Coworking e Escritório', 'despesa'),
    (NEW.id, 'Pró-labore', 'despesa'),
    (NEW.id, 'Freelancer e Parceiro', 'despesa'),
    (NEW.id, 'Capacitação', 'despesa'),
    (NEW.id, 'Impostos e Taxas', 'despesa'),
    (NEW.id, 'Contador', 'despesa'),
    (NEW.id, 'Despesa Variável', 'despesa'),
    (NEW.id, 'Investimento', 'despesa');
  
  RETURN NEW;
END;
$function$;
