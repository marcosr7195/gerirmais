-- Create client interactions table for relationship history
CREATE TABLE public.client_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL DEFAULT 'outro',
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  subject TEXT,
  summary TEXT,
  next_step TEXT,
  reminder_date DATE,
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  related_entity_type TEXT,
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users manage own client_interactions"
ON public.client_interactions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_client_interactions_client_id ON public.client_interactions(client_id, interaction_date DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_client_interactions_updated_at
BEFORE UPDATE ON public.client_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-log when a client is created
CREATE OR REPLACE FUNCTION public.log_client_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_interactions (user_id, client_id, interaction_type, subject, summary, is_automatic)
  VALUES (NEW.user_id, NEW.id, 'sistema', 'Cliente cadastrado', 'Cliente foi adicionado ao sistema.', true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_client_creation
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_creation();

-- Auto-log when a proposal is created
CREATE OR REPLACE FUNCTION public.log_proposal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    INSERT INTO public.client_interactions (user_id, client_id, interaction_type, subject, summary, is_automatic, related_entity_type, related_entity_id)
    VALUES (
      NEW.user_id,
      NEW.client_id,
      'proposta',
      'Proposta gerada: ' || NEW.proposal_number,
      'Proposta ' || NEW.proposal_number || ' no valor de R$ ' || COALESCE(NEW.total_value::text, '0'),
      true,
      'proposal',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_proposal_creation
AFTER INSERT ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.log_proposal_creation();

-- Auto-log when a deal stage changes
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO public.client_interactions (user_id, client_id, interaction_type, subject, summary, is_automatic, related_entity_type, related_entity_id)
    VALUES (
      NEW.user_id,
      NEW.client_id,
      'sistema',
      CASE WHEN TG_OP = 'INSERT' THEN 'Negócio criado: ' || NEW.title ELSE 'Negócio movido para ' || NEW.stage END,
      'Negócio "' || NEW.title || '" — etapa: ' || NEW.stage,
      true,
      'deal',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_deal_stage_change
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_stage_change();

-- Auto-log when a service order is created or completed
CREATE OR REPLACE FUNCTION public.log_service_order_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.client_interactions (user_id, client_id, interaction_type, subject, summary, is_automatic, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, NEW.client_id, 'sistema', 'OS criada: ' || NEW.title, 'Ordem de serviço aberta.', true, 'service_order', NEW.id);
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'concluida' THEN
      INSERT INTO public.client_interactions (user_id, client_id, interaction_type, subject, summary, is_automatic, related_entity_type, related_entity_id)
      VALUES (NEW.user_id, NEW.client_id, 'sistema', 'OS concluída: ' || NEW.title, 'Ordem de serviço foi finalizada.', true, 'service_order', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_service_order_change
AFTER INSERT OR UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.log_service_order_change();