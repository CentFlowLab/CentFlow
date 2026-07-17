# CentFlow — Current State Audit (Sprint 2026-07-17)

## Baseline

| Item | Valor |
|------|--------|
| Branch | `rc2-ios-sideload` |
| HEAD | `e7bd7ea` |
| Alterações locais | `HANDOFF.md` (gerado) |
| TypeScript | OK |
| Testes | 492 pass / 0 fail |

---

## Problemas P0 confirmados

| # | Problema | Ecrã | Componente | Fonte | Cálculo actual | Esperado | Prioridade | Risco | Teste |
|---|----------|------|------------|-------|----------------|----------|------------|-------|-------|
| 1 | Disponível ≠ realizado; misturado com obrigações futuras | Home | MonthlySpendableCard | monthly-available.ts | `saldo contas − obrigações futuras` | Decompor realizado / obrigações / previsto | P0 | Confiança | spendable decompose |
| 2 | «Este mês» Movimentos ≠ Disponível ≠ Fluxo Análises | Movimentos / Análises | MovementMonthSummaryCard / TrendsSummaryCard | transaction-grouping vs analysis 30d | Mês civil vs rolling 30d | Labels de período explícitos + mesmos conceitos | P0 | Confusão | period labels |
| 3 | «Ativos» pode ser negativo | Análises/Património | AnalysisPatrimonyTab | netWorth + account balances | Soma saldos sem floor | «Saldos e caixa» + explicar negativos | P0 | Semântica | netWorth display |
| 4 | Rácio dívida 0% com ativos ≤0 | Património | analysis.mapper | `assets>0 ? L/A*100 : 0` | 0 enganoso | «Não calculável» | P0 | Confiança | debt ratio null |
| 5 | Onboarding «livres» / −792 | Onboarding | PlanResult / plan.ts | `income − monthlySaving` | UI clampa a 0; copy «livres» | «Antes das despesas mensais»; sem negativo falso | P0 | Confiança | plan.ts tests |
| 6 | Edge Function non-2xx na UI | Open Banking | bank-connections | gocardless.service | error.message cru | Mensagem de produto | P0 | UX | error map |
| 7 | Tab Ativos ≠ património | Ativos | ativos.tsx | goals/warranties/inventory | Nome incorrecto | Renomear / taxonomia | P0 UX | IA | — |
| 8 | Home ainda densa | Home | index.tsx | várias secções | Prioridade + recomendações | Uma prioridade | P1 | Densidade | — |
| 9 | «Pagar cartão» | Créditos | CreditsSection etc. | label | Sugere transferência | «Registar pagamento» | P1 | Semântica | — |

---

## Mapa de ficheiros (resumo)

- Onboarding: `app/onboarding.tsx`, `lib/onboarding/plan.ts`, `components/onboarding/premium/*`
- Home: `app/(tabs)/index.tsx`, `components/budget/MonthlySpendable*`
- Movimentos: `app/(tabs)/movimentos.tsx`, `lib/domain/transaction-grouping.ts`
- Análises: `app/(tabs)/analises.tsx`, `lib/domain/analysis.compose.ts`, `analysis-period.ts`
- Património métricas: `lib/domain/financial/netWorth.ts`, `AnalysisPatrimonyTab.tsx`
- Open Banking: `lib/open-banking/gocardless.service.ts`, `app/settings/bank-connections.tsx`
- Guardrails: `lib/domain/financial/safe-math.ts`

---

## Gaps vs sprint anterior

- Glossário existe mas Home **não** mostra decomposição realizado/previsto.
- Tab bar / perfil / Doctor / OCR já melhorados.
- Open Banking ainda mostra erros técnicos.
- Onboarding copy «livres» ainda incorrecta conceptualmente.
