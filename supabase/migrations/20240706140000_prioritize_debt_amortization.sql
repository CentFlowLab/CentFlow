-- Preferência: priorizar amortização de dívida nas sugestões financeiras (default ON)

alter table public.user_preferences
  add column if not exists prioritize_debt_amortization boolean not null default true;

comment on column public.user_preferences.prioritize_debt_amortization is
  'Quando true, sugestões de poupança favorecem amortizar dívida em vez de alocar a objetivos';
