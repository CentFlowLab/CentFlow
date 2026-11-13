-- Open banking (ADR-069): o que cada conta do banco é (à ordem, cartão, poupança, crédito), para a
-- app sugerir o nome ("Santander Cartão de crédito") e o tipo da conta nova. Vem do
-- `cash_account_type` da Enable Banking quando a ligação é feita; nulo nas ligações anteriores
-- ou quando o banco não diz. Só a função `open-banking` escreve; a app só lê.
--
-- Reversão: `alter table public.bank_accounts drop column kind;`

alter table public.bank_accounts
  add column kind text check (kind is null or kind in ('current', 'card', 'savings', 'loan'));

grant select (kind) on public.bank_accounts to authenticated;
