
-- Add classification column to categories
ALTER TABLE public.categories 
ADD COLUMN classification text NOT NULL DEFAULT 'despesa_operacional';

-- Update handle_new_user to include classification in seeded categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  
  -- Seed default revenue categories
  INSERT INTO public.categories (user_id, name, type, classification) VALUES
    (NEW.id, 'Consultoria', 'receita', 'receita_operacional'),
    (NEW.id, 'Mentoria', 'receita', 'receita_operacional'),
    (NEW.id, 'Contrato Recorrente', 'receita', 'receita_operacional'),
    (NEW.id, 'Serviço Avulso', 'receita', 'receita_operacional'),
    (NEW.id, 'Comissão', 'receita', 'receita_nao_operacional'),
    (NEW.id, 'Produto Digital', 'receita', 'receita_operacional'),
    (NEW.id, 'Outros Recebimentos', 'receita', 'receita_nao_operacional');
  
  -- Seed default expense categories
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
