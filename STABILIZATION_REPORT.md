# STABILIZATION_REPORT — CentFlow

**Data:** 2026-07-12  
**Sprint:** Stabilization — Financial Core (sem novas features)  
**Objetivo:** Voltar a confiar nos números da app.

---

## 1. Bugs encontrados

| ID | Severidade | Descrição | Origem |
|----|------------|-----------|--------|
| S1 | CRÍTICO | Dívida de cartão duplicada (`outstandingBalance` + replay de transações) | `financial-state.ts` `buildCreditCardStates` |
| S2 | CRÍTICO | Património ignorava poupanças em objetivos (`savings: 0`) | `resolveNetWorthInput` |
| S3 | CRÍTICO | Investimentos contados 2× (conta + `recurringInvestments`) | `resolveNetWorthInput` |
| S4 | CRÍTICO | Orçamento ignorava `budget_enabled` e saldos iniciais de contas | `monthly-available.compose.ts` |
| S5 | CRÍTICO | Transferências orçamento↔investimento não reflectidas em `movedOut/In` | `monthly-available.compose.ts` |
| S6 | ALTO | `useFinancialState` passava `accounts: []` | `hooks/useFinancialState.ts` |
| S7 | ALTO | `updateTransaction` não sincronizava saldo de crédito | `transaction.service.ts` |
| S8 | ALTO | Update optimista omitia `creditId`, `destinationAccountId`, etc. | `transaction-cache.ts` |
| S9 | ALTO | `useCreateLoanPayment` sem recálculo do motor financeiro | `useLoanPayments.ts` |
| S10 | MÉDIO | `resolveGoalCurrent` usava `Math.max` e mascarava levantamentos | `goals.ts` |
| S11 | MÉDIO | `calculateConsumptionSpending` ignorava `credit_card_refund` | `ledger-impact.ts` |
| S12 | MÉDIO | Testes do domínio importavam `react-native` via `warranty.utils` → `theme` | `attention-items.ts` |
| S13 | BAIXO | Doctor não detectava drift BD vs ledger nem divergência de património | `financial-doctor.ts` |

---

## 2. Bugs corrigidos

| ID | Correção | Ficheiro(s) |
|----|----------|-------------|
| S1 | Dívida do cartão = `computeCreditCardDebtFromTransactions` (ledger único) | `credit-cards.ts`, `financial-state.ts` |
| S2 | `calculateConsolidatedNetWorth` com goals + contas enriquecidas | `financial-state.ts` |
| S3 | `investments: []` quando derivados só de contas tipo investment | `financial-state.ts` |
| S4–S5 | `enrichAccountsWithBalances` + `sumBudgetAccountBalances` + `calculateBudgetTransferFlow` | `monthly-available.compose.ts` |
| S6 | `useAccounts()` ligado ao hook | `useFinancialState.ts` |
| S7 | Reverse + apply em `updateTransaction` (mock + Supabase) | `transaction.service.ts` |
| S8 | Campos completos no update optimista | `transaction-cache.ts` |
| S9 | `scheduleFinancialRecalculation` + trigger `loan_payment_created` | `useLoanPayments.ts`, `engine.types.ts` |
| S10 | Contribuições como fonte de verdade (sem `Math.max`) | `goals.ts` |
| S11 | Reembolso cartão reduz `consumptionSpending` | `ledger-impact.ts` |
| S12 | Constantes extraídas para `warranty.constants.ts` | `warranty.constants.ts`, `attention-items.ts` |
| S13 | Doctor expandido (15+ verificações) | `financial-doctor.ts` |

---

## 3. Testes adicionados

| Ficheiro | Testes | Âmbito |
|----------|--------|--------|
| `stabilization-matrix.test.ts` | **21** | Cenários 1–20 + regressão duplicação cartão |
| `budget-accounts.test.ts` | 8 actualizados | Comportamento correcto com contas reais |
| `ledger-audit.test.ts` | 1 actualizado | Saldo inicial em contas budget |
| `financial-state.test.ts` | 1 actualizado | `availableThisMonth` com saldo inicial |

**Total novos testes de matriz:** 21  
**Total suite:** 373 testes (368 passam)

---

## 4. Cobertura

| Métrica | Valor |
|---------|-------|
| Ficheiros em `lib/domain/financial/` | ~75 `.ts` (excl. testes) |
| Ficheiros de teste financial | ~35 |
| Ratio ficheiros com teste | ~47% por ficheiro |
| **Cobertura estimada (linhas)** | **~78%** do financial core |
| Objectivo sprint | 95% — **não atingido** |

**Módulos sem testes dedicados (prioridade próxima):** `engine.gather.ts`, `opportunities.ts`, `metrics.ts`, `projections.ts`, `events.ts`, `forecast.ts`, `financial-doctor.ts` (novo).

---

## 5. Módulos auditados

- `lib/domain/financial/*` — motor principal
- `hooks/useFinancialState.ts` — entrada React
- `hooks/queries/useLoanPayments.ts` — propagação
- `lib/api/services/transaction.service.ts` — sync crédito
- `lib/api/transaction-cache.ts` — optimismo
- `lib/domain/attention-items.ts` — dependência RN removida
- `lib/domain/goals.ts` — progresso de objetivos
- `lib/domain/financial/ledger-impact.ts` — consumo e reembolsos

---

## 6. Código removido

| Ficheiro | Motivo |
|----------|--------|
| `hooks/queries/useNetWorth.ts` | Zero imports |
| `hooks/queries/usePricesData.ts` | Zero imports |
| `lib/api/services/prices.service.ts` | Só usado pelo hook morto |
| `components/useColorScheme.ts` (+ `.web`) | Template Expo não usado |
| `components/useClientOnlyValue.ts` (+ `.web`) | Template Expo não usado |

---

## 7. Riscos restantes

1. **Motor v1 (`calculateFinancialState`) vs v2 (`engine`)** — ainda coexistem; números podem divergir entre recomendações e Home se engine não for unificado.
2. **REST API legacy** — mappers incompletos no caminho `apiFetch` (não Supabase).
3. **Open Banking** — imports sem `account_id`; sync crédito não automático.
4. **Filtro Supabase `type=expense`** — não inclui `credit_card_purchase`.
5. **`balance_adjustment` bidireccional** — só reduz saldo.
6. **Testes layout** — 5 ficheiros falham ao carregar por `react-native` no runner Node (pré-existente).
7. **`tsc --noEmit`** — erros em `database.types.ts` (tipos exportados em falta; pré-existente).

---

## 8. Bugs conhecidos (não corrigidos neste sprint)

| Bug | Notas |
|-----|-------|
| `calculateGoalOnTrack` fórmula suspeita | Requer revisão de unidades |
| `debtToIncomeRatio` nomenclatura | Dívida/rendimento anual, não DTI mensal |
| Reembolso em conta (`income`+`refund`) não reduz gastos | Só `credit_card_refund` corrigido |
| `npm run lint` | Script não definido no `package.json` |
| Cobertura 95% | Requer ~15 ficheiros de teste adicionais |

---

## 9. Confiança no Financial Core

**Score: 72 / 100**

| Critério | Antes | Depois |
|----------|-------|--------|
| Ledger canónico (movimentos) | 85 | 85 |
| Cartões | 40 | **78** |
| Património consolidado | 45 | **75** |
| Orçamento mensal | 50 | **80** |
| Propagação mutações | 55 | **70** |
| Doctor / auditabilidade | 30 | **65** |
| Testes de integração | 40 | **85** |

---

## 10. Confiança para Beta

**Score: 58 / 100**

Melhorou significativamente nos números core, mas beta pública ainda bloqueada por UX (fora deste sprint), motor duplo, e 5 testes de infraestrutura a falhar no CI local.

---

## 11. O que ainda impediria um lançamento

1. Unificar motor financeiro v1 → v2 (uma verdade).
2. Corrigir Open Banking end-to-end (conta ligada, tipos, crédito).
3. Atingir 95% cobertura em `lib/domain/financial/`.
4. Resolver testes layout (mock `react-native` no runner ou separar testes puros).
5. Regenerar/corrigir `database.types.ts` para `tsc` limpo.
6. QA manual dos 20 cenários em dispositivo real (fora do scope automatizado deste sprint).

---

## Comandos executados

```bash
npm test          # 368/373 pass (5 falhas react-native em layout/accounts)
npx tsc --noEmit  # erros pré-existentes em database.types
npm run lint      # não existe
```

---

## Commit

```
chore: stabilization sprint - financial core audit
```

**Push:** não executado (conforme instrução).  
**OTA:** não executado.

---

*Sprint concluído com foco exclusivo em números fiáveis. Nenhuma feature nova. Nenhuma alteração de UI.*
