-- Taxa de comissão de amortização antecipada por crédito (fracção: 0.005 = 0,5%).
-- Default legal PT para crédito a taxa fixa: 0,5%. Editável por crédito/produto.
alter table public.credits
  add column if not exists commission_rate_early_repayment numeric(6, 5) default 0.005;
