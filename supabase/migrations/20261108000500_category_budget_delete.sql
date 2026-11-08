-- Quando uma categoria passa a eliminada, os orçamentos ainda ativos dessa categoria
-- são eliminados logicamente na mesma transação. O UPDATE passa por `sync_stamp`,
-- por isso a versão e o `server_seq` seguem o protocolo. Um orçamento já eliminado
-- não é tocado, e a operação pode repetir-se sem o ressuscitar.
--
-- A aplicação nova envia primeiro o apagamento do orçamento e só depois o da
-- categoria. Este trigger fica então sem linhas para atualizar e não cria uma
-- segunda versão. Uma aplicação antiga, que só apaga a categoria, fica coberta aqui.
-- Os movimentos não são alterados: `categories_integrity` continua a recusar a
-- eliminação enquanto existirem movimentos nessa categoria.

create function public.categories_close_budgets()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.budgets
       set deleted_at = new.deleted_at
     where user_id = new.user_id
       and category_id = new.id
       and deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger c_close_budgets after update on public.categories
  for each row execute function public.categories_close_budgets();

revoke all on function public.categories_close_budgets() from public, anon, authenticated;
