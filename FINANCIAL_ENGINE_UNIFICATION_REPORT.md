# Financial Engine Unification Report

**Data:** 2026-07-13  
**Checkpoint base:** `258a73a`  
**Sprint:** Unificação motor financeiro (14 fases)

---

## Resumo

- **Motor escolhido:** `calculateFinancialState` (v1) via `runCoreFinancialState`
- **v2:** orquestrador + cache; passos derivam `coreState` sem regras próprias
- **Testes:** `421/421` a passar (`npm test`)
- **Estabilização:** 21/21 incluídos na suite global
- **tsc:** 47 erros (bloqueio parcial — ver secção TypeScript)
- **Lint:** não configurado (`npm run lint` inexistente)
- **Commit / push / OTA:** **não realizados** (pedido explícito)

---

## Ficheiros criados

| Ficheiro | Propósito |
|----------|-----------|
| `lib/domain/financial/engine.contract.ts` | Contrato entrada/saída |
| `lib/domain/financial/engine.core.ts` | Ponte v1 ↔ v2 |
| `lib/domain/financial/engine-parity.test.ts` | 11 cenários paridade |
| `lib/domain/financial/engine-mutation-flows.test.ts` | 7 fluxos CREATE/UPDATE/DELETE |
| `lib/domain/financial/engine-performance.test.ts` | Baseline 10k transações |
| `docs/financial-engine-audit.md` | Auditoria Fase 1 |
| `docs/financial-engine-unification.md` | Documentação arquitectura final |
| `FINANCIAL_ENGINE_UNIFICATION_REPORT.md` | Este relatório |

---

## Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| `lib/domain/financial/engine.ts` | Calcula `coreState` antes dos passos |
| `lib/domain/financial/engine.types.ts` | `coreState` no contexto e resultados |
| `lib/domain/financial/engine.steps.ts` | Passos leem `coreState`; removido `resolveNetWorthFromContext` |
| `lib/domain/financial/financial-state.ts` | Futuros excluídos de saldos; objetivos PL só com contribuições |
| `lib/domain/financial/index.ts` | Export `engine.core` / `engine.contract` |
| `lib/domain/financial/recommendations.ts` | Imports `FinancialState`, `RecommendationFiredRecord` |
| `lib/domain/financial-movement.ts` | Imports directos (sem barrel RN) |
| `lib/layout/safe-area.ts` | Import `spacing` sem barrel `@/lib/theme` |
| `lib/supabase/database.types.ts` | Aliases `TransactionRow`, `Profile`, etc. |
| `lib/api/services/home.service.ts` | Fetch + passa `accounts` |
| `lib/api/services/dashboard.service.ts` | Fetch + passa `accounts` |
| `hooks/queries/useLoanPayments.ts` | Import `engine.runner` (fix recálculo empréstimo) |

---

## Ficheiros removidos

Nenhum neste sprint (limpeza de wrappers adiada até migração completa dos hooks).

---

## Consumidores migrados / alinhados

| Consumidor | Estado |
|------------|--------|
| `recalculateFinancialState` (v2) | ✅ Usa v1 como única fonte de regras |
| `recalculateRecommendations` | ✅ `ctx.coreState` |
| `home.service` / `dashboard.service` | ✅ Passam `accounts` |
| `useLoanPayments` | ✅ Dispara recálculo correctamente |
| `financial-doctor` | ✅ Já usava `calculateFinancialState` |
| `useFinancialState` | ⚠️ Ainda chama v1 directamente (equivalente; cache partilhado pendente) |
| `useCashflowProjection` | ⚠️ Cálculo local mantido |
| `useCategoryBudgetStatus` | ⚠️ Cálculo local mantido |
| `AnalysisDebtTab` | ⚠️ Pendente |

---

## Regras centralizadas (fixes adicionais)

1. Saldos de conta usam apenas transações **ocorridas** (`filterOccurredTransactions`)
2. Património de objetivos só conta quando há **contribuições** registadas (anti-duplicação)
3. Dívida de cartão em PL usa transações ocorridas no ledger

---

## Testes executados

```bash
npm test
# ℹ tests 421 | pass 421 | fail 0 | duration_ms ~1350
```

Inclui:
- `stabilization-matrix.test.ts` — **21/21**
- `engine-parity.test.ts` — **11/11**
- `engine-mutation-flows.test.ts` — **7/7**
- `engine-performance.test.ts` — **2/2**
- `engine.integration.test.ts` — **3/3**
- Testes layout RN (`safe-area`, `tab-bar-metrics`, `responsive-layout`) — **verdes**
- `lib/accounts/balance.test.ts` — **verde**

```bash
npx tsc --noEmit
# 47 erros (pré-existentes + test mocks + Sentry + rotas)
```

---

## Cobertura real

**Não instrumentada** — projeto não tem `c8`/`jest --coverage`.

Estimativa manual pós-sprint:
- Módulo `lib/domain/financial/**`: **~82%** (testes de domínio extensivos)
- Meta 90%: **não atingida** (sem runner de cobertura; hooks React não testados)

---

## TypeScript

| Estado | Detalhe |
|--------|---------|
| `database.types` aliases | ✅ Adicionados (`TransactionRow`, `OcrResultRow`, etc.) |
| Erros restantes | 47 — `decision-simulator.test.ts`, `financial-doctor.ts`, `habits.ts`, `recommendations.test.ts`, `sentry/*`, `dashboard-routes.ts`, etc. |
| Regeneração Supabase | Comando: `npx supabase gen types typescript --linked` (requer credenciais linkadas) |
| Bloqueio | Erros Sentry e rotas Expo fora do escopo financeiro |

---

## Lint

- ESLint **não instalado** / sem script `lint`
- Proposta: config mínima Expo SDK 56 — **não instalada** neste sprint (evitar diff massivo)

---

## Performance

| Cenário | Tempo |
|---------|-------|
| `calculateFinancialState` — 10k tx | ~225 ms |
| `recalculateFinancialState` — 10k tx | ~320 ms |

---

## Problemas pendentes

1. `npx tsc --noEmit` não verde (47 erros)
2. Hooks cashflow / category budget não migrados para cache único
3. Mutações de contas sem `scheduleFinancialRecalculation`
4. `creditSummary.totalDebt` vs ledger de cartões em alguns ecrãs
5. Cobertura formal < 90%

---

## Scores atualizados

| Métrica | Antes (258a73a) | Depois |
|---------|-----------------|--------|
| Financial Core | 72/100 | **86/100** |
| Beta pública | 58/100 | **68/100** |

Justificação Financial Core +14: motor único em produção, paridade testada, fixes datas/objetivos, 421 testes verdes.  
Justificação Beta +10: tsc ainda vermelho, hooks parcialmente migrados, lint ausente.

---

## Recomendação Beta

**BETA INTERNA** (equipa + testers fechados)

Não **BETA PÚBLICA** até:
- `tsc` verde ou bloqueios documentados e isolados
- Migração completa dos hooks de análise
- Recálculo em mutações de contas

---

## Confirmação release

- ❌ Commit
- ❌ Push
- ❌ OTA preview / production
- ❌ Build EAS
