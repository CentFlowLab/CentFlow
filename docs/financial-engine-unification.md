# Unificação do Motor Financeiro — Arquitetura Final

## Arquitetura anterior

```
UI / Hooks ──┬── calculateFinancialState (v1) ──► FinancialState
             └── recalculateFinancialState (v2) ──► passos com fórmulas próprias
```

Problema: património, orçamento e score podiam divergir entre ecrãs.

## Arquitetura final

```
Dados brutos
     │
     ▼
calculateFinancialState  ◄── runCoreFinancialState (única API de regras)
     │
     ├──► useFinancialState / dashboard.compose / doctor / UI
     │
     └──► recalculateFinancialState
              │
              ├─ coreState (FinancialState) — gravado em cache
              └─ passos derivados (sem fórmulas):
                   budget, netWorth, healthScore, homeSummary,
                   liabilities, subscriptions*, creditState*,
                   categoryBudgets, cashflowProjection, recommendations
```

\* `subscriptions.detected` e `creditState.analyses` mantêm I/O analítico; totais vêm de `coreState`.

## Contrato

Ver `lib/domain/financial/engine.contract.ts`:

- **Entrada:** `FinancialEngineCoreInput` / `CalculateFinancialStateInput`
- **Saída:** `FinancialState` / `FinancialEngineCoreResult`
- **`referenceDate`:** obrigatória em testes (`today` / `referenceDate`)
- **Sem** React, RN ou Supabase no núcleo

## Regras financeiras centralizadas

Todas em `financial-state.ts` e submódulos (`credit-cards`, `goals`, `ledger-impact`, `monthly-available.compose`, etc.):

1. Cartão — ledger único, sem duplicação com `outstandingBalance`
2. Contas — saldo inicial 1×; transferências neutras no PL
3. Património — ativos − passivos; objetivos só com contribuições registadas
4. Orçamento — `budget_enabled`; transferências não consomem
5. Movimentos futuros — excluídos de saldos de conta e PL actual
6. Investimentos — sem double-count em contas `investment`
7. Empréstimos — pagamentos via `loanPayments` + recálculo

## Política de datas

- `filterOccurredTransactions(transactions, asOf)` para saldos e PL actual
- Projeção: `sumTransactionCashBalance(..., 'future', asOf)` separada
- Testes usam datas fixas (`2026-07-15T12:00:00`)

## Política monetária

- `roundMoney` / `addMoney` / `subtractMoney` em `money.ts`
- Minor units implícitos (EUR centavos como float — débito técnico documentado)

## Invalidação

| Mutação | `scheduleFinancialRecalculation` |
|---------|-------------------------------|
| Transações CRUD | ✅ `useTransactions` |
| Objetivos / contribuições | ✅ `useAssets`, `useGoalContributions` |
| Créditos | ✅ `useLiabilities` |
| Pagamento empréstimo | ✅ `useLoanPayments` (import corrigido) |
| Orçamentos categoria | ✅ `useCategoryBudgets` |
| Contas CRUD | ❌ pendente |
| Open banking | ✅ `useBankConnections`, realtime |

Após recálculo: `queryClient.setQueryData(financialEngine)` + `invalidateFinancialDerivedQueries`.

## Compatibilidade

- `FinancialEngineStepResults.coreState` — novo campo; consumidores antigos dos passos mantêm shape
- `engine.steps.ts` passos são **deprecated wrappers** — sem regras

## Performance (baseline medida)

Dataset sintético: 10 contas, 5 créditos, 10 objetivos, 10 000 transações @ `2026-07-15`:

| Operação | Duração |
|----------|---------|
| `calculateFinancialState` | ~225 ms |
| `recalculateFinancialState` (passos completos) | ~320 ms |

## Limitações

- Hooks `useCashflowProjection` e `useCategoryBudgetStatus` ainda não leem cache do motor
- ESLint não configurado
- `npx tsc --noEmit` — 47 erros fora do núcleo unificado
- Cobertura formal não instrumentada (`npm test` apenas)

## Migração pendente (pós-sprint)

1. `useFinancialState` ler `coreState` do cache quando fresh
2. Migrar `AnalysisDebtTab` para `creditCards[].debt`
3. Disparar recálculo em mutações de contas
4. Remover passos-wrapper quando UI usar só `coreState`
