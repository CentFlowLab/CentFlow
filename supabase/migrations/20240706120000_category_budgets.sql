-- Orçamentos por categoria (template mensal) + revisão de subscrições

CREATE TABLE public.category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit numeric(12, 2) NOT NULL CHECK (monthly_limit >= 0),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('suggested', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE INDEX category_budgets_user_id_idx ON public.category_budgets (user_id);

CREATE TRIGGER category_budgets_set_updated_at
  BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_budgets_select_own"
  ON public.category_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "category_budgets_insert_own"
  ON public.category_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "category_budgets_update_own"
  ON public.category_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "category_budgets_delete_own"
  ON public.category_budgets FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.category_budgets IS
  'Limite mensal por categoria (template). Aplica-se ao mês civil actual.';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz NULL;

COMMENT ON COLUMN public.subscriptions.last_reviewed_at IS
  'Última vez que o utilizador marcou a subscrição como revista.';
