
CREATE TABLE public.credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text NOT NULL,
  limit_total numeric(14,2) NOT NULL DEFAULT 0,
  closing_day int NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day int NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color text NOT NULL DEFAULT '#8b5cf6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_cards TO authenticated;
GRANT ALL ON public.credit_cards TO service_role;
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own credit cards" ON public.credit_cards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.credit_card_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount_total numeric(14,2) NOT NULL,
  purchase_date date NOT NULL DEFAULT current_date,
  category text,
  installments_count int NOT NULL DEFAULT 1 CHECK (installments_count BETWEEN 1 AND 24),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_purchases TO authenticated;
GRANT ALL ON public.credit_card_purchases TO service_role;
ALTER TABLE public.credit_card_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own card purchases" ON public.credit_card_purchases
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_credit_card_purchases_updated_at BEFORE UPDATE ON public.credit_card_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.credit_card_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES public.credit_card_purchases(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  installment_number int NOT NULL,
  installments_total int NOT NULL,
  amount numeric(14,2) NOT NULL,
  invoice_month date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_installments TO authenticated;
GRANT ALL ON public.credit_card_installments TO service_role;
ALTER TABLE public.credit_card_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own card installments" ON public.credit_card_installments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cc_inst_card_invoice ON public.credit_card_installments(card_id, invoice_month);
CREATE INDEX idx_cc_purchases_card ON public.credit_card_purchases(card_id);
