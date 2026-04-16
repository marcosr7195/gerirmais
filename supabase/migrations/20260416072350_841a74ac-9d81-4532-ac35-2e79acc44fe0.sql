
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  proposal_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  validity_date date NOT NULL,
  payment_method text DEFAULT 'pix',
  payment_condition text DEFAULT 'a_vista',
  installments integer DEFAULT 1,
  delivery_deadline text,
  items jsonb DEFAULT '[]'::jsonb,
  fixed_value boolean DEFAULT false,
  total_value numeric DEFAULT 0,
  observations text,
  acceptance_text text DEFAULT 'Ao aprovar esta proposta o cliente concorda com os termos e condições descritos acima.',
  bank_info jsonb,
  business_info jsonb,
  client_info jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own proposals"
ON public.proposals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_proposals_deal_id ON public.proposals(deal_id);
CREATE INDEX idx_proposals_user_id ON public.proposals(user_id);
