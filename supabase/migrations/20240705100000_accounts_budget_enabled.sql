-- Contas elegíveis para orçamento mensal (separado do património total).

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS budget_enabled BOOLEAN DEFAULT true;

UPDATE accounts
SET budget_enabled = false
WHERE type IN ('investment', 'savings', 'other')
  AND (budget_enabled IS NULL OR budget_enabled = true);

COMMENT ON COLUMN accounts.budget_enabled IS
  'Se true, o saldo desta conta entra no cálculo de Disponível este mês.';
