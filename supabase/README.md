# Supabase (Fase 2)

Migrações, políticas RLS e a função de eliminação de conta. **Nunca** colocar a chave
`service_role` (secret) neste repositório nem na aplicação.

## Produção

O projeto ligado é a produção do Miven, referência `slfgslfzolfvqavuccom`. Não o usar para ensaios.
Qualquer comando destinado à produção tem de passar primeiro pelo guard. Ele só aceita essa
referência quando o comando inclui a confirmação `CONFIRMO-PRODUCAO` e recusa staging, outro
projeto ou um alvo vazio. O plano está em [docs/release-fase3.md](../docs/release-fase3.md).

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
```

## Staging

O projeto de staging é o staging do Miven, referência `qlimqcgrgaqzwjmafora`. Não está ligado
em `config.toml`. A app de staging usa `.env.staging`, copiado de `.env.staging.example`,
e não substitui `.env.local`.

Qualquer comando destinado ao staging tem de passar primeiro pelo guard. Ele recusa a
referência de produção, um URL de produção e um alvo vazio:

```bash
npm run staging:guard -- qlimqcgrgaqzwjmafora
```

No staging estão aplicadas `20261108000100` a `20261108000700`, ensaiadas em 2026-11-08.
Na produção só `20261108000100` e `20261108000200`. Não correr `db push` sem autorização
para esse passo.
Quando for autorizado, o destino tem de ser explícito (`--remote=qlimqcgrgaqzwjmafora` no
staging) e o guard tem de aceitar esse mesmo valor. Não usar `supabase link` para trocar o
projeto ligado.

## Aplicar as migrações ao projeto alojado

Estes comandos usam o projeto ligado, que é a produção. Não os executar sem autorização
explícita, e nunca para ensaiar as migrations pendentes.

Correr **na pasta do repositório**, não em `C:\WINDOWS\System32`. Na CLI 3,
`db push` sem `--remote` tenta a base local (Docker em `127.0.0.1:54322`).

```bash
npx supabase login
npx supabase link --project-ref slfgslfzolfvqavuccom --yes
npx supabase db push --remote --yes
npx supabase functions deploy delete-account --use-api --yes
```

As migrações em `migrations/` criam `profiles`, `sync_metadata`, `accounts`, `categories`,
`entries`, `budgets`, os triggers de versão/`server_seq`, as funções `sync_push` / `sync_pull` /
`sync_pull_v2` / `sync_verify` / `sync_counts` / `purge_deleted`, e o RLS.
`20261108000300_sync_write_guard.sql` retira o INSERT/UPDATE direto a `authenticated` e move
`sync_apply_op` para o esquema `private`. `20261108000400_budgets.sql` e
`20261108000500_category_budget_delete.sql` acrescentam orçamentos e o fecho do orçamento
quando a categoria é eliminada. Os testes em `__tests__/server-test.ts` correm as mesmas
migrações contra PostgreSQL real (PGlite).

`20261108000300` a `20261108000700` estão no staging e não estão na produção. Não as publicar
na produção sem autorização, cópia de segurança e a ordem das migrations.
No dashboard, Database › Settings › Exposed schemas tem de continuar só com `public`. O esquema
`private` não pode ser exposto: é aí que corre a escrita interna.

## Configuração no dashboard

A proposta está em `config.toml` (`[auth]`, confirmação por email, palavra-passe mínima de 8
e SMTP do Resend via `env()`). **Não foi aplicada** a staging nem a produção: não correr
`config push` sem autorização. O CLI lê as variáveis de um `.env` na raiz, que não entra no git.
Enquanto o push não for autorizado, o que muda o projeto alojado é o painel:

1. Authentication › URL configuration: `Site URL` = `https://miven.pt`. Em Redirect URLs, as
   entradas exatas `miven://auth/callback`, `miven://auth/reset-password`,
   `https://miven.pt/auth/callback`, `https://miven.pt/auth/reset-password`,
   `https://www.miven.pt/auth/callback` e `https://www.miven.pt/auth/reset-password`.
   O staging ainda tem `http://localhost:3000` e esta proposta não foi aplicada.
2. Authentication › Providers › Email: confirmação por email ligada e comprimento mínimo da
   palavra-passe 8 (a app trata o caso em que a sessão só existe depois da confirmação).
3. Authentication › Emails › SMTP: servidor próprio do Resend (`smtp.resend.com`, porta 465,
   utilizador `resend`). A chave da API e o endereço de envio (domínio já verificado no Resend)
   ficam só no painel ou num `.env` ignorado. Sem isto, o correio integrado só envia para
   membros da organização e recusa muitos endereços.
4. Authentication › Providers › Apple: só necessário para Sign in with Apple. No iOS usa-se o
   fluxo nativo (`signInWithIdToken`). Na web, definir `EXPO_PUBLIC_AUTH_APPLE_ENABLED=true`
   depois de configurar o Services ID.
5. Database › Cron (opcional): `select public.purge_deleted();` uma vez por semana. A retenção
   mínima é 30 dias; o valor por omissão é 180. A função recusa um JWT que não seja
   `service_role`. `anon` e `authenticated` não têm `EXECUTE`.
6. Edge Functions › Secrets: `ALLOWED_WEB_ORIGINS` com os origins reais da PWA, separados por
   vírgulas. A app já aceita `https://miven.pt` e `https://www.miven.pt`. Sem o segredo, a web em
   desenvolvimento só é aceite em `localhost:8081` e `localhost:19006`. O CORS não protege a
   aplicação nativa.

## Função `delete-account`

Corre no servidor com a chave administrativa injetada pelo Supabase. Confirma o utilizador com
`auth.getUser()` (o `user_id` do corpo é ignorado), exige `confirm: "DELETE"` e uma sessão
iniciada nos últimos 10 minutos, e chama `auth.admin.deleteUser`. As tabelas públicas têm
`ON DELETE CASCADE` a partir de `auth.users`. A versão com esta verificação ainda não está
publicada.
