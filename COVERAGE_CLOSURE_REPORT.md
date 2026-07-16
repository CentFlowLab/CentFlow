# Coverage Closure Report — CentFlow

> Sprint: fecho de cobertura do domínio financeiro  
> Data: Julho 2026  
> **Sem commit, push, OTA ou build EAS**

---

## 1. Cobertura antes

Medição: `npm run test:coverage` (Node `--experimental-test-coverage`, `lib/domain/financial/**`)

### Global `lib/domain/financial/**`

| Métrica | Antes |
|---------|-------|
| Lines (statements) | **90,27%** |
| Branches | **82,43%** |
| Functions | **85,38%** |

### Ficheiros prioritários

| Ficheiro | Lines | Branches | Functions |
|----------|-------|----------|-----------|
| `transactions.ts` | 67,88% | 87,88% | 60,78% |
| `transfers.ts` | 85,71% | 66,67% | 88,89% |
| `simulator.ts` | 92,99% | 65,45% | 87,04% |

**Testes antes:** 433

---

## 2. Cobertura depois

### Global `lib/domain/financial/**`

| Métrica | Depois | Meta mínima | Estado |
|---------|--------|-------------|--------|
| Lines (statements) | **91,74%** | ≥ 90% | ✅ |
| Branches | **83,94%** | ≥ 88% | ❌ |
| Functions | **87,83%** | ≥ 90% | ❌ |

### Ficheiros prioritários

| Ficheiro | Lines | Branches | Functions | Linhas não cobertas |
|----------|-------|----------|-----------|---------------------|
| `transactions.ts` | **98,54%** | **91,53%** | **100%** | 271-274 |
| `transfers.ts` | **95,54%** | **89,80%** | **100%** | 108-112 |
| `simulator.ts` | **98,96%** | **76,24%** | **96,67%** | 74, 79, 96, 228-229, 453, 594 |

**Testes depois:** **481** (+48)

---

## 3. Testes adicionados

Expansão em ficheiros existentes (sem duplicar motor de paridade):

### `transactions.test.ts` (+18 testes)

- `isRealCashflowTransaction`, `transactionCashDelta` por tipo
- Filtros temporais (`filterOccurred`, `filterFuture`, `filterByPeriod`)
- `getMonthlyCashflow`, `groupTransactionsByDate`
- `groupTransactionsByCategory` / `getTopCategory`
- `groupTransactionsByMerchant` / `getTopMerchant`
- `sumGlobalCashBalance` (contribuições, retiradas, empréstimos, scopes)
- `filterOccurredInCalendarMonth`, `filterOccurredForMonthlyBudget`
- `filterFutureForMonthlyBudget`, `toSpendableMovement`
- Invariantes: pagamento cartão não duplica despesa; reembolso reduz consumo

### `transfers.test.ts` (+9 testes)

- Contas em falta, `not_enough_accounts`
- Saldo exatamente igual; `calculateTransferImpact` null e `initialBalance`
- `validationMessage` para todas as razões
- `assertTransferPreservesTotal` no-op e contas só com `initialBalance`
- Transferência para conta `investment`

### `simulator.test.ts` (+21 testes)

- Erros: valor zero, saldo insuficiente, crédito não-cartão
- Warnings: `NEGATIVE_BUDGET`, `LOW_LIQUIDITY`
- Subscrições anual/trimestral
- Determinismo e imutabilidade do estado real
- `creditUtilizationAfterPayment`, `buildScenarioFromSuggestionId`
- Cenários: conta sem orçamento, `increase_monthly_savings`, `withdraw_goal`
- `daysRemaining: 0`, recomendações, `reduce_category_spending`

---

## 4. Branches cobertos (principais)

| Área | Branches novos exercitados |
|------|---------------------------|
| **transactions** | scope `all`; contribuição vs retirada; loan payments; merchant fallback; cartão/reembolso; futuro vs ocorrido |
| **transfers** | `missing_account`, `not_enough_accounts`; saldo = valor; impacto null; `initialBalance` fallback |
| **simulator** | erros de validação; warnings liquidez/orçamento; billing anual/trimestral; sugestões `fin-amort` / `fin-high-taeg`; conta non-budget |

---

## 5. Functions cobertas (principais)

| Ficheiro | Funções que passaram a 100% |
|----------|----------------------------|
| `transactions.ts` | Todas (18 funções exportadas) |
| `transfers.ts` | Todas (4 funções exportadas) |
| `simulator.ts` | `buildScenarioFromSuggestionId`, `creditUtilizationAfterPayment` (+ cenários internos via `simulateFinancialDecision`) |

---

## 6. Gaps restantes

### `transactions.ts` (271-274) — **relevante**

Cadeia `filterFutureForMonthlyBudget` → `toSpendableMovement` → filtro de null. Parcialmente coberta; linhas residuais no predicado de tipo.

### `transfers.ts` (108-112) — **defensivo**

`default` em `validationMessage` — ramo inalcançável com o union type actual (`TransferValidationResult`). Código defensivo; remoção insegura sem alterar contrato.

### `simulator.ts` — **relevante / defensivo**

| Linhas | Classificação | Nota |
|--------|---------------|------|
| 74, 79 | relevante | `adjustBudgetIfNeeded` / `daysRemaining` — ramos parcialmente exercitados |
| 96 | defensivo | `featuredGoalGap` com lista de objetivos vazia |
| 228-229 | relevante | `investmentTotal` em transferência para investimento |
| 453, 594 | relevante | ramos de explicação `increase_monthly_savings` / cancelamento |
| 576-579 | defensivo | `estimateInterestSaved` quando TAEG/prestação ausentes |

### Domínio global — **fora do foco deste sprint**

Ficheiros que puxam branches/functions para baixo da meta:

| Ficheiro | Branches | Prioridade futura |
|----------|----------|-------------------|
| `decision-simulator.ts` | 60,71% | Alto |
| `spending-calendar.ts` | ~96% lines / gaps 104-134 | Médio |
| `simulator.ts` (branches) | 76,24% | Médio |
| `subscription-payments.ts` | 73,53% | Médio |
| `transactions.ts` (ledger) | via `ledger-impact.ts` | Baixo |

---

## 7. Código morto removido

**Nenhum.** Todos os gaps identificados são ramos defensivos ou dependências de outros módulos — remoção não justificada.

---

## 8. Resultado `npm test`

```
481/481 pass
0 fail
```

Testes anteriores: **433** — nenhum removido.

---

## 9. Resultado TypeScript

```
npx tsc --noEmit → 0 erros
```

---

## 10. Resultado lint scoped

```
npm run lint → 0 erros, 0 warnings
```

Ficheiros lintados: `transactions.test.ts`, `transfers.test.ts`, `simulator.test.ts` (via script scoped do projeto).

`npm run lint:all` (173 issues pré-existentes) **não corrigido** — fora de âmbito.

---

## 11. Ficheiros criados

- `COVERAGE_CLOSURE_REPORT.md`

---

## 12. Ficheiros modificados

- `lib/domain/financial/transactions.test.ts`
- `lib/domain/financial/transfers.test.ts`
- `lib/domain/financial/simulator.test.ts`

---

## 13. Riscos pendentes

1. **Meta global branches (88%) e functions (90%) não atingida** — limitada por `decision-simulator.ts` e outros módulos fora do foco.
2. **`simulator.ts` branches** ainda em 76% — ramos de explicação/warning difíceis de isolar sem testes de integração mais pesados.
3. **Lint global** continua com 173 issues pré-existentes.

---

## 14. Recomendação atualizada

### **BETA PÚBLICA CONTROLADA**

Motivos:

- ✅ Ficheiros prioritários (`transactions`, `transfers`) com cobertura forte e functions a 100%
- ✅ `simulator.ts` lines 99% e functions 97%
- ✅ 481 testes verdes, TypeScript verde
- ❌ Meta global branches **83,94%** < 88%
- ❌ Meta global functions **87,83%** < 90%

**Não declarado:** PRONTO PARA BETA PÚBLICA (metas globais de cobertura incompletas).

**Superado:** BETA INTERNA.

---

## Confirmação explícita

- ✅ Sem commit
- ✅ Sem push
- ✅ Sem OTA
- ✅ Sem build EAS

---

## Comandos de reprodução

```bash
npm test
npm run test:coverage
npm run lint
npx tsc --noEmit
```
