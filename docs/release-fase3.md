# Lançamento da Fase 3 em produção

Plano. Não executar nenhum passo sem uma autorização nova, nessa altura, com a frase
`CONFIRMO-PRODUCAO` no comando. Este documento não autoriza o lançamento.

Produção: `slfgslfzolfvqavuccom`. Staging: `qlimqcgrgaqzwjmafora`. Não escrever no staging neste
lançamento. Não usar `supabase link` para trocar o projeto ligado.

Estado de partida, ensaiado no staging em 2026-11-08: a produção tem só
`20261108000100` e `20261108000200`. Faltam, por esta ordem:

1. `20261108000300_sync_write_guard.sql`
2. `20261108000400_budgets.sql`
3. `20261108000500_category_budget_delete.sql`
4. `20261108000600_subscriptions.sql`
5. `20261108000700_savings_goals.sql`

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

O dry-run tem de listar só as cinco migrations, de `00300` a `00700`, por esta ordem, e não
dizer que as aplicou. Se aparecer outra migration, a produção, o staging, ou um aviso de
reparação, parar.

Só então, com a mesma autorização:

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
npx supabase db push --skip-vault --remote=slfgslfzolfvqavuccom --yes
```

Confirmar o histórico. Local e remoto têm de coincidir de `00100` a `00700`:

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
npx supabase migration list --remote=slfgslfzolfvqavuccom
```

## O que verificar

Só leitura (`db query --read-only` ou o painel). Não criar utilizadores.

- `budgets`, `subscriptions`, `goals` e `goal_contributions` têm RLS ligado.
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

## Publicar a app

Só quando o histórico mostra `00100` a `00700`, as verificações passam e o SMTP e os
redirects da produção estão feitos. A publicação (EAS ou o alojamento da PWA) é um passo
separado, também com autorização. Até lá, a app nova fica no repositório.
