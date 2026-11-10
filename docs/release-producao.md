# Lançamento das Fases 3 a 5 em produção

Plano. Não executar nenhum passo sem uma autorização nova, nessa altura, com a frase
`CONFIRMO-PRODUCAO` no comando. Este documento não autoriza o lançamento.

**Executado a 2026-11-09** com autorização explícita do responsável. Ver "Execução" no fim.

Produção: `slfgslfzolfvqavuccom`. Staging: `qlimqcgrgaqzwjmafora`. Não escrever no staging neste
lançamento. Não usar `supabase link` para trocar o projeto ligado.

Estado de partida: a produção tem só `20261108000100` e `20261108000200`. O staging tem
`00100` a `00900`: `00300` a `00700` ensaiadas a 2026-11-08, `00800` e `00900` a 2026-11-09 com
sincronização real entre duas sessões (ADR-031). Faltam na produção, por esta ordem:

1. `20261108000300_sync_write_guard.sql`
2. `20261108000400_budgets.sql`
3. `20261108000500_category_budget_delete.sql`
4. `20261108000600_subscriptions.sql`
5. `20261108000700_savings_goals.sql`
6. `20261108000800_wealth_items.sql`
7. `20261108000900_vehicles_documents.sql`

A app que já está publicada fala com `sync_pull` e não recebe estas entidades. A app nova lê
`sync_pull_v2`. Por isso as migrations vão primeiro e a publicação da app só depois.

## Pré-requisitos

- `npm run check` verde no commit que vai sair.
- O guard de produção aceita o comando e recusa qualquer outro destino:

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
```

O guard não executa o comando do Supabase. Recusa a frase em falta, o staging, outro projeto,
um alvo vazio, e um `EXPO_PUBLIC_SUPABASE_URL` ou `MIVEN_PRODUCTION_TARGET` que não seja a
produção. Não carregar `.env.local` nem `.env.staging` na mesma shell.

- A proposta de auth em `supabase/config.toml` **não** entra neste `db push`. Não correr
  `config push`. Antes de abrir o registo a pessoas reais, configurar à mão no painel da
  produção o que está descrito em `supabase/README.md`: URL do site, redirects
  (`miven://auth/callback`, `miven://auth/reset-password`, `https://miven.pt` e `https://www.miven.pt`),
  confirmação por email, palavra-passe mínima de 8, e SMTP do Resend. Sem isto, o registo
  volta a falhar no correio integrado.

## Cópia de segurança

Antes de qualquer comando que altere a produção:

1. No painel, Database › Backups, confirmar que existe uma cópia recente e anotar a hora.
2. Em alternativa, ou além disso, descarregar um dump lógico e guardá-lo fora do repositório:

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
npx supabase db dump --remote=slfgslfzolfvqavuccom -f miven-pre-fase3.sql
```

O ficheiro do dump não entra no git. Não avançar para o dry-run enquanto a cópia não estiver
feita e identificável.

## Dry-run e aplicação

Na pasta do repositório. CLI 3. `--skip-vault` evita escrever segredos do `config.toml` no
vault. Sem `--remote`, o comando aponta à base local.

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
npx supabase db push --dry-run --skip-vault --remote=slfgslfzolfvqavuccom --yes
```

O dry-run tem de listar só as sete migrations, de `00300` a `00900`, por esta ordem, e não
dizer que as aplicou. Se aparecer outra migration, a produção, o staging, ou um aviso de
reparação, parar.

Só então, com a mesma autorização:

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
npx supabase db push --skip-vault --remote=slfgslfzolfvqavuccom --yes
```

Confirmar o histórico. Local e remoto têm de coincidir de `00100` a `00900`:

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
npx supabase migration list --remote=slfgslfzolfvqavuccom
```

## O que verificar

Só leitura (`db query --read-only` ou o painel). Não criar utilizadores.

- `budgets`, `subscriptions`, `goals`, `goal_contributions`, `wealth_items`, `vehicles` e
  `documents` têm RLS ligado.
- `anon` não tem `SELECT`, `INSERT`, `UPDATE` nem `DELETE`.
- `authenticated` tem `SELECT` e não tem escrita direta. A escrita continua a ser pelas
  funções `sync_push` / `sync_verify`.
- As políticas de leitura e escrita usam `auth.uid()`. Não há política de `DELETE`.
- `private.sync_apply_op` e as funções de integridade e de sync têm `search_path` vazio.
- O esquema exposto continua só `public`. `private` não fica exposto.
- Um `POST` direto a `/rest/v1/goals` (ou `budgets`) com a chave anónima devolve 403.
- `sync_pull` (o antigo) não devolve orçamentos, subscrições nem objetivos. `sync_pull_v2`
  devolve-os ao dono.

## Se algo falhar

Parar. Não aplicar a migration seguinte, não editar uma migration já publicada e não improvisar
um `UPDATE` na produção.

- Se o dry-run não for exatamente a lista acima, não há push.
- Se o push falhar a meio, o histórico diz quais ficaram aplicadas. Não relançar até se
  perceber a causa.
- Não há migrations de reversão. A recuperação é restaurar a cópia feita antes do push
  (painel ou o dump) e voltar a ler o histórico. Restaurar também precisa de autorização
  explícita.
- Se a app que já está publicada deixar de sincronizar, não publicar a app nova por cima
  para "tapar" o erro. Restaurar a cópia e só depois decidir.

## Edge Functions

Depois das migrations, com a mesma regra de autorização. As funções foram publicadas e testadas
no staging a 2026-11-09 (`delete-account`: 401 sem confirmação, apaga só o dono do token;
`suggest-entry`: 401 sem sessão, 503 sem o segredo).

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
npx supabase functions deploy delete-account --remote=slfgslfzolfvqavuccom --use-api --yes
npx supabase functions deploy suggest-entry --remote=slfgslfzolfvqavuccom --use-api --yes
```

O segredo da IA é definido pelo responsável, no terminal dele, nunca num ficheiro nem na
conversa: `npx supabase secrets set ANTHROPIC_API_KEY=… --remote=slfgslfzolfvqavuccom`. Sem
ele, a app diz que a IA não está ativa. Antes de abrir ao público, decidir o limite diário por
utilizador (ADR-029).

## Publicar a app

Só quando o histórico mostra `00100` a `00900`, as verificações passam e o SMTP e os
redirects da produção estão feitos. A publicação (EAS ou o alojamento da PWA) é um passo
separado, também com autorização. Até lá, a app nova fica no repositório.

## Execução (2026-11-09)

- O EAS `production` aponta `EXPO_PUBLIC_SUPABASE_URL` para `slfgslfzolfvqavuccom`.
- Cópia de segurança às 16:57–16:58 (hora local). O painel não tinha cópias. O `db dump` precisa
  de Docker, por isso correu-se o script do `db dump --dry-run` com o `pg_dump` 17 local,
  trocando `--quote-all-identifier` por `--quote-all-identifiers`. Cada `--dry-run` cria uma
  palavra-passe temporária nova, por isso cada script tem de correr logo a seguir ao seu. Ficheiros
  em `C:\Users\Emanuel\Documents\Miven-backups\miven-prod-20261109-165722-*` (esquema, dados,
  `-Fc` de `public` e `auth`). Dados nesse momento: 1 perfil, 3 contas, 15 categorias,
  0 movimentos.
- Dry-run: as sete migrations, `00300` a `00900`, por ordem. Aplicação sem erros. Histórico
  local e remoto iguais de `00100` a `00900`.
- Verificações desta lista: todas passaram (ADR-032). O `POST` anónimo dá 401 (não 403): `anon`
  não tem permissão na tabela.
- Edge Functions publicadas. O segredo `ANTHROPIC_API_KEY` ainda não está definido.
- Ensaio real com utilizador temporário (`live-sync-test.ts`, `MIVEN_LIVE_CONFIRM`): passou e
  apagou o utilizador.
- Auth do painel feita à mão: URL do site `https://miven.pt`, os seis redirects (`miven://`,
  `miven.pt` e `www.miven.pt`; os dois `centflow://` antigos ficaram), confirmação por email
  ligada e palavra-passe mínima 8. Confirmado com `config diff` (só leitura).
- SMTP do Resend ligado (domínio `miven.pt` verificado). Registo de teste com
  `delivered@resend.dev`: email de confirmação enviado; utilizador apagado.
- Por fazer: o segredo da IA.
- Build 0.1.4 (compilação 8) publicado na fonte SideStore; o IPA descarrega.

## Execução de 2026-11-10 — nome de utilizador (ADR-038)

Autorizado pelo responsável com `CONFIRMO-PRODUCAO`. Guard antes de cada comando.

1. Cópia: `~/Documents/Miven-backups/miven-prod-20261110-023219-{schema.sql,data.sql,public-auth.dump}`
   (`pg_dump` 17; fora do git e de pastas sincronizadas).
2. Dry-run: só `20261110001000` e `20261110001100`, por esta ordem, alvo produção.
3. `db push --skip-vault`: as duas aplicadas; histórico local e remoto iguais até `001100`.
4. Verificação só de leitura: `login_attempts` com RLS e sem `SELECT` para `anon` e
   `authenticated` (REST anónimo: 401); `login_email` `security definer` com `search_path`
   vazio; `anon` executa `login_email` e `username_available`; `pgcrypto` presente; trigger
   `on_auth_user_created` ativo. `username_available` por REST com a chave pública: `true`.

## Execução de 2026-11-10 — preço anterior das subscrições (ADR-041)

Autorizado pelo responsável ("Confirmo produção"). Guard antes de cada comando.

1. Cópia: `~/Documents/Miven-backups/miven-prod-20261110-152936-{schema.sql,data.sql}` (`pg_dump`
   17 a partir do `db dump --dry-run`; fora do git e de pastas sincronizadas).
2. Dry-run: só `20261111000100`, alvo produção.
3. `db push --skip-vault`: aplicada; histórico local e remoto iguais até `20261111000100`.
4. Verificação só de leitura: `subscriptions.previous_amount` (`bigint`) e `amount_changed_on`
   (`date`) existem; `private.sync_apply_op` com `search_path` vazio; RLS ligado em
   `subscriptions`.
