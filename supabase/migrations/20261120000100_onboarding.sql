-- Onboarding por conta (ADR-067): a conclusão fica no perfil e vale em todos os aparelhos.
--
-- 1. `profiles.onboarding_completed_at`: quando a pessoa concluiu o onboarding (null = não).
--    Sem preenchimento em massa: as contas antigas que já têm dados são reconhecidas pela app
--    (que grava a conclusão nessa altura); não se marca ninguém sem evidência.
-- 2. `public.complete_onboarding()`: marca só o perfil da sessão (auth.uid()), uma vez
--    (a primeira data fica). A app não escreve a coluna diretamente: o `grant update` continua
--    limitado a `display_name`.
-- Reversão: `drop function public.complete_onboarding(); alter table public.profiles drop column
-- onboarding_completed_at;` (não toca em dados financeiros).
--
-- Não aplicar sem autorização expressa (staging primeiro; produção depois).

alter table public.profiles add column onboarding_completed_at timestamptz;

create function public.complete_onboarding()
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set onboarding_completed_at = coalesce(onboarding_completed_at, now()),
         updated_at = now()
   where id = (select auth.uid())
  returning onboarding_completed_at;
$$;

revoke all on function public.complete_onboarding() from public, anon;
grant execute on function public.complete_onboarding() to authenticated;
