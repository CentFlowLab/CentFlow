# Supabase (Fase 2)

Migrações, políticas RLS e a função de eliminação de conta. **Nunca** colocar a chave
`service_role` (secret) neste repositório nem na aplicação.

## Aplicar as migrações ao projeto alojado

Correr **na pasta do repositório** (`CentFlow`), não em `C:\WINDOWS\System32`. Na CLI 3,
`db push` sem `--remote` tenta a base local (Docker em `127.0.0.1:54322`).

```bash
npx supabase login
npx supabase link --project-ref slfgslfzolfvqavuccom --yes
npx supabase db push --remote --yes
npx supabase functions deploy delete-account --use-api --yes
```

As duas migrações em `migrations/` criam `profiles`, `sync_metadata`, `accounts`, `categories`,
`entries`, os triggers de versão/`server_seq`, as funções `sync_push` / `sync_pull` /
`sync_verify` / `sync_counts` / `purge_deleted`, e o RLS. Os testes em `__tests__/server-test.ts`
correm as mesmas migrações contra PostgreSQL real (PGlite).

## Configuração no dashboard

1. Authentication › URL configuration: adicionar `centflow://auth/callback`,
   `centflow://auth/reset-password` e o origin da PWA.
2. Authentication › Providers › Email: confirmação por email ligada (a app trata o caso em que
   a sessão só existe depois da confirmação).
3. Authentication › Providers › Apple: só necessário para Sign in with Apple. No iOS usa-se o
   fluxo nativo (`signInWithIdToken`). Na web, definir `EXPO_PUBLIC_AUTH_APPLE_ENABLED=true`
   depois de configurar o Services ID.
4. Database › Cron (opcional): `select public.purge_deleted();` uma vez por semana. A retenção
   mínima é 30 dias; o valor por omissão é 180.

## Função `delete-account`

Corre no servidor com a chave administrativa injetada pelo Supabase. Confirma o utilizador com
`auth.getUser()` e chama `auth.admin.deleteUser`. As tabelas públicas têm `ON DELETE CASCADE`
a partir de `auth.users`.
