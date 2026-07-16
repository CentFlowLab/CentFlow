# Auditoria TypeScript — CentFlow Beta Readiness

> Gerado durante o sprint Beta Readiness (Jul 2026).  
> **Estado final:** `npx tsc --noEmit` → **0 erros** (baseline inicial: **47 erros**).

## Resumo por categoria

| # | Categoria | Erros (antes) | Estado |
|---|-----------|---------------|--------|
| 1 | Tipos Supabase/database.types | 2 | ✅ Resolvido |
| 2 | Sentry | 4 | ✅ Resolvido |
| 3 | Rotas/dashboard-routes | 8 | ✅ Resolvido |
| 4 | Financial Doctor | 2 | ✅ Resolvido |
| 5 | Habits | 0 | — |
| 6 | Testes e mocks | 14 | ✅ Resolvido |
| 7 | Imports ou exports incorretos | 3 | ✅ Resolvido |
| 8 | Nullability | 5 | ✅ Resolvido |
| 9 | Tipos realmente incompatíveis | 7 | ✅ Resolvido |
| 10 | Código morto ainda compilado | 2 | ✅ Resolvido |

---

## Detalhe dos erros corrigidos

### 1. Tipos Supabase/database.types

| Ficheiro | Erro | Causa | Solução | Risco |
|----------|------|-------|---------|-------|
| `lib/analytics/analytics.service.ts` | `properties` não assignável a `Json` | Insert Supabase exige tipo `Json` | Import `Json` e cast de objeto plano | Baixo |
| `lib/api/keys.ts` | Chave `emailEvents` em falta | Refactor de query keys incompleto | Restaurar chave tipada | Baixo |

### 2. Sentry

| Ficheiro | Erro | Causa | Solução | Risco |
|----------|------|-------|---------|-------|
| `lib/sentry/capture.ts` | `Sentry` possibly null | `getSentry()` devolve null quando inactivo | Guard + variável local `sentry` | Baixo |
| `lib/sentry/init.ts` | Idem | Idem | Idem | Baixo |
| `lib/sentry/capture.ts` | `isEnabled` inexistente SDK v8 | API mudou no @sentry/react-native v8 | `isSentryClientActive()` em `runtime.ts` | Baixo |

### 3. Rotas/dashboard-routes

Typed routes Expo desactualizados (`precos` vs `creditos`). Solução: `lib/navigation/href.ts` com `RelativePathString`.

Ficheiros corrigidos: `dashboard-routes.ts`, `index.tsx`, `movimentos.tsx`, `useQuickAddActions.ts`, `privacy.tsx`, `CashflowProjectionCard.tsx`, `HomeAssistantCard.tsx`, `open-banking/callback.tsx`.

### 4. Financial Doctor

| Erro | Solução |
|------|---------|
| `projectedNetWorth` inexistente | Usar `projection.netWorth` |
| `inventory` obrigatório | `inventory?: InventoryItem[]` no input |

### 5. Testes e mocks

Fixture canónica: `lib/domain/financial/test-financial-state.fixture.ts`.

Ficheiros: `calendar.test.ts`, `decision-simulator.test.ts`, `recommendations.test.ts`, `stabilization-matrix.test.ts`, `engine-parity.test.ts`, `engine.integration.test.ts`.

### 6–10. Restantes

- Open Banking: mutações devolvem `{ result, previous }` — corrigido em `callback.tsx` e `bank-connections.tsx`.
- `useLoanPayments`: guard `accountId` obrigatório.
- `transaction.types.ts`: campo `merchant?: string | null`.
- `engine.integration.test.ts`: `Partial<Record<FinancialEngineStepId, FinancialEngineStepRunner>>`.

---

## Regras aplicadas

- ❌ Sem `any`, `@ts-ignore`, ou `as unknown as`
- ✅ Fixture e href documentados como tipos de compatibilidade explícitos

## Validação

```bash
npx tsc --noEmit   # 0 erros
npm test           # 421+ verdes
```
