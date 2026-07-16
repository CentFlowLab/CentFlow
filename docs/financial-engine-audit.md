# Auditoria — Motores Financeiros CentFlow

> Gerado no sprint de unificação (Jul 2026). Checkpoint estável de referência: `258a73a`.

## Resumo

A aplicação mantinha **dois caminhos de cálculo**:

| Motor | Entrada | Saída | Papel anterior |
|-------|---------|-------|----------------|
| **v1** `calculateFinancialState` | `CalculateFinancialStateInput` | `FinancialState` (~30 campos) | Home, Património, Doctor, dashboard.compose |
| **v2** `recalculateFinancialState` | `FinancialEngineInput` | `FinancialEngineStepResults` | Scheduler + passos derivados (património, orçamento, score duplicados) |

**Decisão:** v1 como única fonte de regras; v2 torna-se **orquestrador + cache** sem fórmulas duplicadas.

---

## Diagrama de dependências (textual)

```
                    ┌─────────────────────────────────────┐
                    │     Dados brutos (React Query)      │
                    │ transactions, accounts, credits,    │
                    │ goals, contributions, loans, etc.   │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           v                       v                       v
  useFinancialState        gatherFinancialEngineInput   home.service /
  (hook)                   (engine.gather.ts)            dashboard.service
           │                       │                       │
           │                       v                       │
           │              scheduleFinancialRecalculation   │
           │              (engine.runner.ts)              │
           │                       │                       │
           v                       v                       v
  calculateFinancialState ◄── runCoreFinancialState ── composeDashboardFromLocalSources
  (financial-state.ts)      (engine.core.ts)          (dashboard.compose.ts)
           │                       │
           │                       v
           │              recalculateFinancialState
           │              (engine.ts — 1× core, depois passos)
           │                       │
           v                       v
  FinancialState            FinancialEngineStepResults
  (única verdade)           { coreState, budget*, netWorth*, ... }
           │                       │
           ├─ Home / Património    ├─ useFinancialRecommendations
           ├─ useMonthlySpendable   ├─ RecommendationsCard
           ├─ financial-doctor      └─ cache queryKeys.financialEngine
           └─ CentFlow Intelligence
```

\* Passos `budget`, `netWorth`, `healthScore`, `homeSummary`, `liabilities` **leem `coreState`** — não recalculam.

---

## Consumidores por motor (pré-unificação)

### Motor v1 (`calculateFinancialState`)

| Consumidor | Ficheiro |
|------------|----------|
| `useFinancialState` | `hooks/useFinancialState.ts` |
| Dashboard local | `lib/domain/dashboard.compose.ts` |
| Home (via compose) | `lib/api/services/home.service.ts` |
| Doctor | `lib/domain/financial/financial-doctor.ts` |
| Simulador | `lib/domain/financial/simulator.ts` |
| Assistant (parcial) | `lib/domain/financial/assistant.ts` |
| Matriz estabilização (21 testes) | `stabilization-matrix.test.ts` |

### Motor v2 (`recalculateFinancialState` / passos)

| Consumidor | Ficheiro | Problema pré-fix |
|------------|----------|------------------|
| `useFinancialRecommendations` | `hooks/useFinancialRecommendations.ts` | Lia `results.recommendations` |
| Passo `netWorth` | `engine.steps.ts` | `resolveNetWorthFromContext` — fórmula simplificada ≠ v1 |
| Passo `budget` | `engine.steps.ts` | `buildMonthlyAvailableBreakdown` duplicado |
| Passo `healthScore` | `engine.steps.ts` | Recalculava score com inputs diferentes |
| Passo `recommendations` | `engine.steps.ts` | Já chamava v1 internamente (dupla execução) |

### Cálculos locais duplicados (identificados)

| Local | Duplicação |
|-------|------------|
| `useCashflowProjection` | Passo `cashflowProjection` |
| `useCategoryBudgetStatus` | Passo `categoryBudgets` |
| `AnalysisDebtTab` | `outstandingBalance` estático vs ledger |
| `useAccountsWithBalances` | Paralelo a `enrichAccountsWithBalances` |

---

## Tabela v1 vs v2 (divergências)

| ID | Área | v1 | v2 (antes) | Risco |
|----|------|----|-----------|-------|
| D1 | Património | Contas reais + investimentos + objetivos com contribuições | `sumGlobalCashBalance` + `investments:[]` | **Crítico** — PL errado |
| D2 | Orçamento | `buildMonthlyAvailableBreakdown` com contas | Idem mas sem `coreState` sync | Médio |
| D3 | Home fetch | Sem `accounts` em alguns paths | — | Alto — PL sem saldos iniciais |
| D4 | Health score | `calculateCentFlowScore` via state completo | Inputs parciais do passo | Médio |
| D5 | Recomendações | 2× `calculateFinancialState` | Dupla execução | Performance |
| D6 | Datas | `filterOccurredTransactions` em PL sem contas | Passo netWorth ignorava contas | Alto |
| D7 | Cartões | Ledger `computeCreditCardDebtFromTransactions` | `outstandingBalance` cru em creditState | Médio |
| D8 | Objetivos PL | Só com contribuições registadas | `goal.current` sempre somava | Duplicação |
| D10 | Loan payments | Import errado `engine.invalidation` | Recálculo não disparava | **Corrigido** |

---

## Código duplicado removido / deprecado

- `resolveNetWorthFromContext` — **eliminado** de `engine.steps.ts`
- Passos `recalculateBudget`, `recalculateNetWorth`, `recalculateHealthScore` — wrappers sobre `ctx.coreState`
- `recalculateRecommendations` — usa `ctx.coreState` (1× motor)

---

## Riscos residuais

1. **tsc:** 47 erros pré-existentes fora do núcleo financeiro (Sentry, rotas, test mocks).
2. **`useCashflowProjection` / `useCategoryBudgetStatus`:** ainda calculam localmente (passos v2 existem mas hooks não migrados).
3. **`creditSummary` em `FinancialState`:** usa `summarizeCreditExposure(credits)` — cartões devem consultar `creditCards[].debt` para UI de cartão.
4. **Contas em mutações:** criar/editar conta não dispara `scheduleFinancialRecalculation` (documentado).
5. **Cobertura:** sem runner de cobertura configurado — estimativa manual ~82% no módulo financeiro.

---

## Estratégia recomendada (implementada)

1. **Eleger v1** (`calculateFinancialState`) — melhor cobertura, fixes 258a73a, funções puras.
2. **v2 = scheduler** — `runCoreFinancialState` uma vez; passos derivam snapshot.
3. **Contrato** — `engine.contract.ts` + `engine.core.ts`.
4. **Fetch paths** — `home.service` e `dashboard.service` passam `accounts`.
5. **Testes** — paridade v1↔v2, CREATE/UPDATE/DELETE, 21 estabilização mantidos.
6. **Remoção futura** — quando zero consumidores dos wrappers, colapsar passos em selectors sobre `coreState`.
