-- Compra de veículo só como despesa (ADR-054, correção da auditoria de 2026-11-11).
--
-- Um rendimento marcado com `vehicle_cost_type = 'purchase'` baixaria o custo de posse do
-- veículo. A app já o recusa; esta restrição garante o mesmo no servidor (a operação de uma app
-- antiga ou alterada fica recusada como qualquer outro dado inválido e vai para os conflitos).
--
-- `not valid`: não verifica as linhas existentes (não falha por dados antigos); as novas escritas
-- e atualizações passam a ser verificadas. Depois de confirmar que não há linhas inválidas, pode
-- validar-se com `alter table public.entries validate constraint entries_vehicle_purchase_expense`.
--
-- Não aplicar sem autorização expressa (staging primeiro; produção depois).

alter table public.entries
  add constraint entries_vehicle_purchase_expense
    check (vehicle_cost_type is distinct from 'purchase' or type = 'expense') not valid;
