# Beta Readiness — Relatório Financeiro CentFlow

> Sprint: integração motor financeiro + TypeScript verde + beta readiness  
> Data: Julho 2026  
> **Sem commit, push, OTA ou build EAS** (confirmado no final).

---

## 1. Resumo executivo

O sprint concluiu a integração arquitectural do motor financeiro unificado (`calculateFinancialState` / `runCoreFinancialState`) com um **snapshot central** (`useFinancialEngineSnapshot`), **seletores puros** (`engine.selectors.ts`) e migração dos consumidores críticos. **TypeScript está verde (0 erros)**. A suíte de testes passou de **421 para 433 testes**, todos verdes. O gerador **handoff** funciona em Node sem `react-native`.

**Recomendação:** **BETA PÚBLICA CONTROLADA** — com ressalvas de cobertura de branches/funções e lint global ainda não aplicado ao projeto inteiro.

---

## 2. Erros TypeScript — antes/depois

| Métrica | Antes | Depois |
|---------|-------|--------|
| `npx tsc --noEmit` | **47 erros** | **0 erros** |

Auditoria completa: [`docs/typescript-error-audit.md`](docs/typescript-error-audit.md)

Principais correcções: Sentry null-guards, Open Banking `{ result, previous }`, rotas via `appHref()`, fixtures de teste, `Partial<Record<StepId, Runner>>` no motor.

---

## 3. Consumidores migrados

| Consumidor | Estado | Fonte de dados |
|------------|--------|----------------|
| `useFinancialState` | ✅ | `useFinancialEngineSnapshot.coreState` |
| `useCashflowProjection` | ✅ | `engineResults.cashflowProjection` + seletor |
| `useCategoryBudgetStatus` | ✅ | `engineResults.categoryBudgets` + seletor |
| `AnalysisDebtTab` | ✅ | Snapshot + `selectDebtSummary` / `selectCreditCardDebts` |
| `useCentFlowIntelligence` | ⚠️ | Lê `state.creditSummary` do snapshot (via `useFinancialState`) — coerente com motor |
| `assistant-chat` | ⚠️ | Recebe `FinancialState` já calculado — sem motor paralelo |

**Pendente (não bloqueante):** `useAccountsWithBalances` continua a usar `enrichAccountsWithBalances` para listagem de contas (saldos por conta, não património global). Não duplica dívida de cartão.

---

## 4. Estratégia de snapshot/cache final

```
Queries brutas (transactions, accounts, credits, …)
        ↓
useFinancialEngineSnapshot
  ├─ fingerprint de inputs (counts + data)
  ├─ scheduleFinancialRecalculation (microtask) → queryKeys.financialEngine(userId)
  ├─ lê cache TanStack Query quando disponível
  └─ fallback: runCoreFinancialState(gatherFinancialEngineInput(...))
        ↓
Seletores puros (engine.selectors.ts) → vistas por ecrã
```

| Aspecto | Comportamento |
|---------|---------------|
| **Quem cria o snapshot** | `recalculateFinancialState` (cache) ou `runCoreFinancialState` (fallback inline) |
| **Quem consome** | `useFinancialState`, `useCashflowProjection`, `useCategoryBudgetStatus`, `AnalysisDebtTab`, Assistant |
| **Invalidação** | Mutações de transacções/contas + `scheduleFinancialRecalculation`; `invalidateAccountDerivedQueries` inclui `financialEngine` |
| **Stale data** | `staleTime: Infinity` no cache do motor; invalidação explícita após mutações |
| **Dupla execução** | Evitada quando cache populado; fallback único até cache estar pronto |

**Performance pós-migração (10k tx):**

| Operação | Antes | Depois | Δ |
|----------|-------|--------|---|
| `calculateFinancialState` | ~225 ms | ~242 ms | +7,6% |
| `recalculateFinancialState` | ~320 ms | ~281 ms | −12,2% |

Dentro do limite de +10% no core; seletores < 10 ms (100 iterações em dataset moderado).

---

## 5. Mutações de contas

`hooks/queries/useAccounts.ts`:

- `useSaveAccount` → `invalidateAccountDerivedQueries` + `scheduleFinancialRecalculation` (`account_created` / `account_updated`)
- `useDeleteAccount` → idem (`account_deleted`)

Testes de integração: `lib/domain/financial/account-mutations.integration.test.ts` (8 cenários).

---

## 6. Auditoria creditSummary / ledger

Pesquisa global: todos os valores de dívida em ecrãs críticos derivam de `FinancialState.creditSummary` e `creditCards[].debt` (ledger).

- `financial-state.ts`: `creditsWithLedgerDebt` antes de `summarizeCreditExposure`
- `engine.selectors.ts`: `selectDebtSummary` usa `creditCards` + empréstimos
- Teste multi-ecrã: `engine.selectors.test.ts`

**Não permitido e não encontrado em ecrãs migrados:** soma paralela entidade + transacções.

---

## 7. Testes executados

| Comando | Resultado |
|---------|-----------|
| `npm test` | **433/433** pass |
| `npx tsc --noEmit` | **0 erros** |
| `npm run test:coverage` | Ver secção 8 |
| `npm run handoff` | ✅ Sucesso |
| `npm run lint` | ✅ 0 erros, 0 warnings (ficheiros do sprint) |

**Novos testes (+12):**

- `engine.selectors.test.ts` — 4 testes (consistência dívida + performance seletores)
- `account-mutations.integration.test.ts` — 8 testes

---

## 8. Cobertura formal (`lib/domain/financial/**`)

Medição: Node `--experimental-test-coverage` (runner nativo, sem mudança de runner).

| Métrica | Valor | Meta | Estado |
|---------|-------|------|--------|
| **Lines** | **90,21%** | ≥ 90% | ✅ |
| **Branches** | **82,41%** | ≥ 85% | ❌ |
| **Functions** | **85,21%** | ≥ 90% | ❌ |

> Node reporta `line % | branch % | funcs %` — não distingue statements de lines; assume-se line ≈ statements.

**Ficheiros com cobertura crítica baixa:**

- `transactions.ts` — 67,88% lines (updates/deletes parciais)
- `simulator.ts` — branches 65,45%
- `transfers.ts` — branches 66,67%
- `spending-calendar.ts` — 77,33% lines

---

## 9. Performance antes/depois

Ver secção 4. Baseline mantida dentro de tolerância. `recalculateFinancialState` melhorou com orquestração única de `coreState`.

---

## 10. Resultado do handoff

```
npm run handoff → ✓ Handoff gerado
```

Correcção: `scripts/handoff-metrics.ts` importa apenas funções puras (`netWorth.ts`, `projections.ts`), sem `buildMockDashboard` / barrel `@/lib/domain`.

---

## 11. Resultado do lint

| Âmbito | Resultado |
|--------|-----------|
| `npm run lint` (ficheiros do sprint) | ✅ 0 erros |
| `npx expo lint` (projeto completo) | ❌ 173 problemas pré-existentes — **P2 pendente** |

`eslint-config-expo@~56.0.4` foi instalado automaticamente pelo CLI Expo. Lint global não activado para evitar centenas de alterações não relacionadas.

---

## 12. Ficheiros criados

- `docs/typescript-error-audit.md`
- `lib/domain/financial/engine.selectors.ts`
- `lib/domain/financial/engine.selectors.test.ts`
- `lib/domain/financial/account-mutations.integration.test.ts`
- `lib/domain/financial/test-financial-state.fixture.ts`
- `hooks/useFinancialEngineSnapshot.ts`
- `hooks/useFinancialState.types.ts`
- `lib/navigation/href.ts`
- `lib/sentry/runtime.ts`
- `scripts/handoff-metrics.ts`
- `eslint.config.js` (auto Expo)
- `BETA_READINESS_FINANCIAL_REPORT.md`

---

## 13. Ficheiros modificados (principais)

- `hooks/useFinancialState.ts`, `useCashflowProjection.ts`
- `hooks/queries/useCategoryBudgets.ts`, `useAccounts.ts`
- `components/analysis/AnalysisDebtTab.tsx`
- `lib/domain/financial/financial-state.ts`, `financial-doctor.ts`
- `lib/sentry/capture.ts`, `init.ts`
- `lib/analytics/analytics.service.ts`
- `app/open-banking/callback.tsx`, `app/settings/bank-connections.tsx`
- Testes: `calendar.test.ts`, `decision-simulator.test.ts`, `recommendations.test.ts`, `engine.integration.test.ts`, `engine-parity.test.ts`, `stabilization-matrix.test.ts`
- `scripts/generate-handoff.ts`
- `package.json` (scripts `test:coverage`, `lint`; devDeps eslint)

---

## 14. Código deprecated ainda existente

- `buildMockDashboard()` em `lib/data/mocks.ts` — mantido para testes legacy; handoff usa `handoff-metrics.ts`
- `mockDashboard` export deprecated
- `lib/domain/net-worth.service.ts` — re-export layer; motor canónico é `financial-state.ts`
- `as unknown as` em mappers Supabase (`preferences.service.ts`, `mappers.ts`, etc.) — pré-existente, fora do âmbito

---

## 15. Riscos pendentes

1. **Cobertura branches/funções** abaixo da meta (82% / 85%)
2. **Lint global** não aplicado (173 issues pré-existentes)
3. **`useAccountsWithBalances`** — saldos por conta via enrich local (não snapshot); aceitável para UI de contas
4. **Typed routes Expo** desactualizados — mitigado com `appHref()`, regenerar typed routes no próximo native build
5. **ESLint** adicionou ~212 pacotes via `expo lint` auto-install

---

## 16. Scores atualizados

| Dimensão | Antes | Depois |
|----------|-------|--------|
| **Financial Core** | 86/100 | **92/100** |
| **Type Safety** | 52/100 | **98/100** |
| **Test Reliability** | 88/100 | **94/100** |
| **Beta pública** | 68/100 | **78/100** |

---

## 17. Recomendação

### **BETA PÚBLICA CONTROLADA**

Motivos:

- ✅ Motor unificado, snapshot central, seletores, TS verde, 433 testes
- ✅ Handoff Node funcional
- ⚠️ Cobertura branches/funções abaixo da meta formal
- ⚠️ Lint global e alguns consumidores secundários ainda não auditados linha a linha

**Não** atingido: **PRONTO PARA BETA PÚBLICA** (cobertura + lint global).

**Não** bloqueado: **BETA INTERNA** (superado).

---

## 18. Confirmação explícita

- ✅ **Sem commit**
- ✅ **Sem push**
- ✅ **Sem OTA**
- ✅ **Sem build EAS**

---

## Comandos de validação reproduzíveis

```bash
npx tsc --noEmit
npm test
npm run test:coverage
npm run handoff
npm run lint
```
