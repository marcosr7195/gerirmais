
CREATE TABLE public.financas_pessoais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receita','despesa')),
  category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financas_pessoais TO authenticated;
GRANT ALL ON public.financas_pessoais TO service_role;
ALTER TABLE public.financas_pessoais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own financas_pessoais" ON public.financas_pessoais
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_financas_pessoais_user_date ON public.financas_pessoais(user_id, date DESC);
CREATE TRIGGER trg_financas_pessoais_updated_at
  BEFORE UPDATE ON public.financas_pessoais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financas_pessoais_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receita','despesa')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financas_pessoais_categorias TO authenticated;
GRANT ALL ON public.financas_pessoais_categorias TO service_role;
ALTER TABLE public.financas_pessoais_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own financas_pessoais_categorias" ON public.financas_pessoais_categorias
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_financas_pessoais_categorias_updated_at
  BEFORE UPDATE ON public.financas_pessoais_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
