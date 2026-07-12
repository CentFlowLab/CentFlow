# Pipeline Sentry → GitHub Issue → Auto-fix → PR

Documentação de configuração manual (dashboards Sentry e GitHub). O código da app e o workflow `.github/workflows/auto-fix-errors.yml` já estão no repositório.

## PARTE 1 — App (Sentry)

### Dependência nativa

`@sentry/react-native` é uma **dependência nativa**. Após merge deste PR:

```bash
npm run eas:build:preview:android
npm run eas:build:preview:ios   # ou CentFlow Release (IPA unsigned)
```

OTA **não** substitui rebuild nativo para novos plugins nativos.

### Variáveis de ambiente

| Variável | Onde configurar | Descrição |
|----------|-----------------|-----------|
| `EXPO_PUBLIC_SENTRY_DSN` | EAS Environment (preview + production) | DSN público do projecto Sentry |
| `SENTRY_ORG` | EAS Build secrets / CI | Slug da organização Sentry |
| `SENTRY_PROJECT` | EAS Build secrets / CI | Slug do projecto Sentry |
| `SENTRY_AUTH_TOKEN` | EAS Build secrets | Upload de source maps no build |

No [EAS Dashboard](https://expo.dev) → Project → Environment variables:
- `preview`: `EXPO_PUBLIC_SENTRY_DSN`
- `production`: `EXPO_PUBLIC_SENTRY_DSN`

### Privacidade

A app **nunca** envia para o Sentry:
- Valores monetários reais
- Descrições de transações
- IBANs ou saldos
- IDs de utilizador em claro (apenas hash anónimo SHA-256 truncado)

Erros de domínio financeiro recebem tag `financial_domain` e `requires_manual_review`.

---

## PARTE 2 — Sentry → GitHub Issue

### 1. Integração Sentry ↔ GitHub

1. [Sentry](https://sentry.io) → **Settings → Integrations → GitHub**
2. Instalar e autorizar acesso ao repositório **CentFlowLab/CentFlow**
3. Associar o projecto Sentry `centflow` (ou o nome do teu projecto)

### 2. Labels no GitHub

Criar manualmente ou deixar o workflow criar automaticamente:

| Label | Cor | Uso |
|-------|-----|-----|
| `auto-detected-error` | `#d73a4a` | Dispara o workflow de auto-fix |
| `requires-manual-review` | `#fbca04` | Bloqueia auto-fix (lógica financeira) |
| `auto-fix-pr` | `#0e8a16` | PR criado pelo agente |

### 3. Regras de alerta no Sentry

Criar **duas** regras em **Alerts → Create Alert → Issues**:

#### Regra A — Erros gerais (auto-fix)

- **When:** A new issue is created **OR** an issue is seen more than **3 times in 1 hour**
- **If:** `financial_domain` is not set **AND** `requires_manual_review` is not set
- **Then:** Create a GitHub issue
  - Repository: `CentFlowLab/CentFlow`
  - Labels: `auto-detected-error`, `bug`
  - Title template: `[Sentry] {title}`
  - Include: stack trace, tags `screen`, `user_action`, `error_source`, link do evento Sentry

#### Regra B — Lógica financeira (só issue, sem auto-fix)

- **When:** A new issue is created **OR** 3+ eventos/hora
- **If:** `financial_domain` **is set** OR message contains `cashflow`, `amortiz`, `savings`, `balance`, `saldo`
- **Then:** Create a GitHub issue
  - Labels: `requires-manual-review`, `bug`, `financial`
  - **Não** adicionar `auto-detected-error`

> A Regra B tem prioridade conceptual: issues com `requires-manual-review` nunca disparam o workflow de auto-fix.

### 4. Secret Anthropic

GitHub → **Settings → Secrets → Actions**:

| Secret | Valor |
|--------|-------|
| `ANTHROPIC_API_KEY` | API key Anthropic para Claude Code Action |

---

## PARTE 3 — Workflow auto-fix

Ficheiro: `.github/workflows/auto-fix-errors.yml`

- **Trigger:** `issues: labeled` com `auto-detected-error`
- **Bloqueio:** se `requires-manual-review` presente → não corre
- **Rate limit:** máximo 5 execuções/dia
- **Output:** branch `fix/auto-{issue_number}` + PR (sem merge)
- **Ferramentas Claude:** `Edit,Write,Read,Bash,Glob,Grep` (+ git/gh/npm test)

---

## PARTE 4 — Salvaguardas

### Branch protection (obrigatório)

GitHub → **Settings → Branches → main**:

- [x] Require a pull request before merging
- [x] Require approvals: **1** (mínimo)
- [ ] Do not allow bypassing (recomendado)

Isto garante que **nenhum PR do agente** pode fazer merge sem aprovação do Manu.

### Exclusões financeiras

Erros com tag `financial_domain` (cashflow, poupança, amortização) → issue com `requires-manual-review` apenas.

### Rate limit

5 auto-fixes/dia via cache GitHub Actions. Issues excedentes ficam abertas para revisão manual.

### Secrets

O workflow **não** tem acesso a `SUPABASE_SERVICE_ROLE_KEY`, `GOCARDLESS_*` nem outros secrets de produção.

---

## Verificação

1. Build nativo com Sentry DSN configurado
2. Forçar erro de teste (só em beta): botão dev ou `throw new Error('Sentry test')`
3. Confirmar evento no Sentry com tags `screen` / `user_action`
4. Confirmar issue GitHub com label correcta
5. Confirmar PR criado pelo workflow (sem merge automático)
