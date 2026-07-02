-- Liga movimentos a despesas recorrentes (subscrições).
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id
  ON transactions(recurring_id)
  WHERE recurring_id IS NOT NULL;
