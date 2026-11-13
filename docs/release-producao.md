# Lançamento das Fases 3 a 5 em produção

> **Estado atual (2026-11-11), verificado só em leitura:** produção e staging com as mesmas 21
> migrações (`20261108000100` a `20261117000100`); 14 tabelas com RLS, sem leitura nem escrita
> para `anon` e sem escrita direta para `authenticated`; esquema `private` não exposto; funções
> com `search_path` vazio; Edge Functions `delete-account` e `suggest-entry` ativas nos dois
> (validam a sessão com `auth.getUser()`); sem segredos próprios (falta `ANTHROPIC_API_KEY`).
> App publicada: **0.1.14** (veículos; ver o registo de 2026-11-11 abaixo). As
> secções seguintes são o registo histórico de cada execução.

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

## Execução de 2026-11-10 (noite) — limites, histórico do património e bens vendidos

Autorizado pelo responsável ("Confirmo produção"). Guard antes de cada comando. Plano em
[release-plan-0.1.9.md](release-plan-0.1.9.md).

1. Cópia: `~/Documents/Miven-backups/miven-prod-20261110-195644-{schema.sql,data.sql}`.
2. Verificações antes: nada depende de `email_registered`; a produção **não tinha utilizadores nem
   dados financeiros** (na cópia das 15:29 havia 1 utilizador, o seu perfil e 15 categorias; foi
   eliminado entre as 15:29 e as 19:56 pelo próprio responsável, a testar a eliminação de
   conta; a cópia das 15:29 guarda-o).
3. Dry-run: só `000200`, `000300`, `000400`, por esta ordem, alvo produção.
4. `db push --skip-vault`: as três aplicadas; histórico local e remoto iguais até `20261111000400`.
5. Verificação só de leitura: `email_registered` inexistente; `lookup_attempts` com RLS e sem
   `select` para `anon`/`authenticated`; `categories.essential smallint`,
   `wealth_items.value_history text`, `wealth_items.closed_on date`; `search_path` vazio em
   `sync_apply_op`, `throttle`, `request_client`, `login_email` e `username_available`.
6. Ensaio anónimo pela API: `email_registered` 404; `username_available` 200.
7. App 0.1.9 **não publicada**: falta a ronda de testes físicos (secção 5 do plano).

## Execução de 2026-11-11 (madrugada) — veículos, Fase 1 (`20261112000100`)

Autorizado pelo responsável ("autorizo produção"). Desenho em
[fase1-veiculos.md](fase1-veiculos.md), ADR-054. Guard antes de cada comando.

1. Staging: dry-run com só `20261112000100`; aplicada; histórico local e remoto iguais; verificação
   só de leitura das colunas novas, de `entries_vehicle_rules` e do `search_path` vazio de
   `sync_apply_op`.
2. Cópia da produção: `db dump` indisponível (o CLI precisa do Docker, que não estava instalado) e
   sem cópias automáticas no plano. Contagem só de leitura antes da migração: `auth.users` = 0 e
   todas as tabelas de dados vazias (exceto `lookup_attempts` = 2). Registo em
   `~/Documents/Miven-backups/miven-prod-20261111-contagem-antes.txt`. O esquema reconstrói-se das
   migrações do repositório.
3. Produção: dry-run com só `20261112000100`, alvo produção; `db push --skip-vault` aplicada;
   histórico local e remoto iguais até `20261112000100`.
4. Verificação só de leitura: `entries.vehicle_id/vehicle_cost_type/quantity_milli/odometer_km`,
   `vehicles.make/kind_label/icon`, `documents.vehicle_id`, restrições `entries_vehicle_rules` e
   `vehicles_purchase_currency`, `search_path` vazio em `sync_apply_op`.
5. Compatibilidade testada em PGlite (`server-test.ts`): uma app 0.1.13 que edita um movimento ou
   um veículo não apaga os campos novos. O ensaio real contra o staging (`live-sync-test`) não
   correu: precisa das chaves na shell, que não estavam definidas.
6. Depois da migração: app 0.1.14 publicada (iPhone, Android e web).

## Execução de 2026-11-11 (manhã) — documentos com anexos (`20261113000100`)

Autorizado pelo responsável (staging e produção). Desenho em
[fase4-documentos.md](fase4-documentos.md), ADR-056. Guard antes de cada comando na produção.

1. Staging: dry-run só com `20261113000100`; aplicada; `delete-account` publicada. Verificação só
   de leitura: balde `documents` privado, 10 MB, JPEG/PNG/WebP/PDF; quatro políticas em
   `storage.objects` (ler, enviar, substituir e apagar só na pasta da própria pessoa); colunas
   `attachments`, `acquired_on`, `amount`, `currency`; `search_path` vazio em `sync_apply_op`.
2. Produção: contagem antes (`auth.users` = 1, `entries` = 1, `documents` = 0) em
   `~/Documents/Miven-backups/miven-prod-20261111-contagem-antes-anexos.txt`; `db dump`
   indisponível (sem Docker). Dry-run só com `20261113000100`, alvo produção; aplicada;
   `delete-account` publicada.
3. Verificação só de leitura igual à do staging; dados intactos (1 utilizador, 1 movimento);
   histórico local e remoto iguais até `20261113000100`.
4. Compatibilidade testada em PGlite: uma app 0.1.14 que edita um documento não apaga os anexos
   nem o valor de compra.

## Execução de 2026-11-11 (noite) — compra de veículo, cartões e empréstimos, objetivos

Autorizado pelo responsável ("Produção", em resposta ao pedido para aplicar no staging).
Migrações `20261114000100` (compra de veículo só como despesa), `20261115000100` (ADR-057) e
`20261116000100` (ADR-058). Guard antes de cada comando na produção.

1. Staging: dry-run só com as três, por ordem; aplicadas; histórico local e remoto iguais até
   `20261116000100`. Verificação só de leitura: 26 colunas novas; restrições
   `accounts_card_fields`, `wealth_items_opening`, `entries_loan_rules` e
   `entries_vehicle_purchase_expense`; `search_path` vazio em `sync_apply_op`; 14 tabelas com RLS.
2. Produção: cópia com `pg_dump` 17 (credenciais do `db dump --dry-run`) em
   `~/Documents/Miven-backups/miven-prod-20261111-201137-{public-auth.dump,schema.sql}`. Contagem
   antes em `miven-prod-20261111-contagem-antes-objetivos.txt`: 1 utilizador, 3 contas (2 cartões),
   2 movimentos (nenhuma compra de veículo como rendimento), 3 itens de património, 0 objetivos.
3. Dry-run só com as três, alvo produção; aplicadas sem erros; histórico local e remoto iguais até
   `20261116000100`.
4. Verificação só de leitura igual à do staging; dados intactos (1 utilizador, 2 movimentos).
5. Compatibilidade testada em PGlite: uma app 0.1.15 que edita contas, empréstimos, movimentos,
   objetivos ou contribuições não apaga os campos novos.
6. App com estas alterações **não publicada**; os testes em aparelhos ainda não foram feitos.

## Execução de 2026-11-12 — ordem das categorias (`20261117000100`)

Autorizado pelo responsável ("Sim, aplica"). ADR-059. Guard antes de cada comando na produção.

1. Staging: dry-run só com `20261117000100`; aplicada; histórico igual; verificação só de leitura:
   `categories.sort_order` (`integer`), `search_path` vazio em `sync_apply_op`, 14 tabelas com RLS.
2. Produção: cópia em `~/Documents/Miven-backups/miven-prod-20261112-000955-{public-auth.dump,schema.sql}`
   e contagem antes (1 utilizador, 16 categorias, 3 movimentos). Dry-run só com `20261117000100`;
   aplicada sem erros; histórico local e remoto iguais até `20261117000100`.
3. Verificação só de leitura igual à do staging; dados intactos (1 utilizador, 16 categorias,
   3 movimentos).
4. Compatibilidade testada em PGlite: uma app 0.1.16 que edita uma categoria não apaga a posição.

## Execução de 2026-11-12 — integrações e administração, **só staging**

Autorizado pelo responsável ("Sim, push e staging"). ADR-064 e ADR-065.

1. Staging: dry-run só com `20261118000100_integrations.sql` e `20261119000100_admin.sql`;
   aplicadas sem erros; histórico local e remoto iguais até `20261119000100`.
2. Verificação só de leitura: RLS ligado em `integrations`, `investment_snapshots`,
   `private.integration_secrets`, `private.admin_roles` e `private.admin_audit`; `authenticated`
   lê `integrations` mas não escreve; `integration_secret_*` e `private.admin_require` não são
   executáveis por `authenticated`; `admin_role`, `admin_overview` e `admin_audit_log` são (e
   verificam o papel por dentro); todas com `search_path` vazio.
3. **Produção: não aplicado.** Função `t212` e segredo `INTEGRATIONS_KEY`: não publicados.

## Execução de 2026-11-12 (noite) — Trading 212 no staging

Autorizado pelo responsável (pedido de teste no staging). ADR-064.

1. Segredo `INTEGRATIONS_KEY` gerado aleatoriamente e definido no staging (`secrets set` a partir de
   um ficheiro temporário apagado logo a seguir; o valor nunca foi mostrado nem guardado).
2. Função `t212` publicada no staging; sem sessão responde 401.
3. Conta de teste `technical` no staging (`private.admin_roles`), para validar o painel.
4. Teste real do responsável com uma conta de demonstração da Trading 212: ligação, resumo e
   posições corretos (custo + ganho = valor total).
5. **Produção: nada.** Migrações, função e segredo continuam por aplicar.

## Execução de 2026-11-13 — onboarding por conta, staging e produção

Autorizado pelo responsável ("aplica em todo o lado"; produção com as três migrações pendentes).
ADR-064, ADR-065 e ADR-067.

1. Staging: dry-run só com `20261120000100_onboarding.sql`; aplicada sem erros. A app contra o
   staging leu o perfil (200) e gravou `onboarding_completed_at` de uma conta antiga com dados.
2. Produção: `production:guard`; dump lógico (esquema e dados) guardado fora do repositório;
   dry-run com `20261118000100`, `20261119000100` e `20261120000100`, por esta ordem; aplicadas
   sem erros; histórico local e remoto iguais até `20261120000100` e `db push --dry-run` sem nada
   por aplicar.
3. **Por fazer na produção:** função `t212` e segredo `INTEGRATIONS_KEY` (sem eles, a integração
   Trading 212 não liga; as tabelas ficam vazias). App com o código do onboarding por conta ainda
   não publicada (alterações locais, sem commit).
