-- Optional merchant / store name on transactions (separate from free-text description)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS merchant text;

CREATE INDEX IF NOT EXISTS transactions_user_id_merchant_idx
  ON public.transactions (user_id, merchant)
  WHERE merchant IS NOT NULL;
