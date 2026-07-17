# CentFlow — UX Remediation Audit (Fase 0)

**Data:** 2026-07-17  
**Branch:** `rc2-ios-sideload`  
**Baseline:** `tsc --noEmit` OK · `npm test` 487/487 pass  
**HEAD:** `2e0ba95`

---

## 1. Baseline

| Check | Resultado |
|-------|-----------|
| `git status` | `HANDOFF.md` modificado (gerado) |
| Branch | `rc2-ios-sideload` |
| TypeScript | 0 erros |
| Testes | 487 pass / 0 fail |

---

## 2. Mapa de ecrãs e ficheiros

### Tabs

| Tab | Rota | Componentes-chave | Hooks |
|-----|------|-------------------|-------|
| Início | `app/(tabs)/index.tsx` | MonthlySpendableCard, FinancialActionsCard, RecommendationsCard, Home* cards | useHomeScreenData, useMonthlySpendable, useCentFlowIntelligence |
| Movimentos | `app/(tabs)/movimentos.tsx` | FlashList, SwipeableTransactionListItem, AddTransactionModal | useTransactions, CRUD |
| Análises | `app/(tabs)/analises.tsx` | Analysis*Tab, InsightsSection, CashflowProjectionCard | useAnalysisData |
| Créditos | `app/(tabs)/creditos.tsx` | CreditsSection, CreditFormModal | useLiabilities |
| Ativos | `app/(tabs)/ativos.tsx` | Goals/Warranties/Inventory sections | useAssets |
| Perfil | `app/(tabs)/perfil.tsx` (fora da tab bar) | ProfileHubSections, FinancialProfileProgress | useProfile, useFinancialProfile |

### Navegação / chrome

| Peça | Path |
|------|------|
| Tab bar | `components/layout/CentFlowTabBar.tsx` + `TabBarAnalisesIcon.tsx` |
| Métricas tab | `hooks/useTabBarMetrics.ts` |
| Header | `components/layout/AppHeader.tsx` (variants `main` / `detail`) |
| Avatar menu | `components/layout/ProfileMenuSheet.tsx` |

### Definições

Todas as rotas em `app/settings/` existem e parecem funcionais (sem “em breve”).  
Doctor exposto em beta via `isDiagnosticsEnabled()` → secção “Testes”.  
Eliminar conta só via Privacidade (não no índice).

### Design tokens

`lib/theme/` — colors, themes, typography, spacing, radius, ThemeProvider, useThemedStyles.

---

## 3. Cálculos por valor (resumo)

| Métrica UI | Fonte canónica | Risco |
|------------|----------------|-------|
| Disponível este mês | `monthly-available.ts` → `useMonthlySpendable` | Negativo sem explicação clara; legado `calculateMonthlySpendable` diverge |
| Saldo acumulado (sheet) | `budgetAccountBalance` | Confusão com “disponível” |
| Saldo previsto (Análises) | `cashflow-projection.ts` | ≠ monthEnd do disponível |
| Fluxo líquido | `getNetCashflow` (rolling 30d) | Período ≠ mês civil |
| Taxa de poupança | `savings.ts` | UI faz `Math.max(0, rate)` — esconde défice |
| Fundo emergência | `metrics.ts` vs `recommendations.ts` | **Duas fórmulas** |
| Património | `netWorth.ts` | previous=0 → ±100% |
| Recomendações | `recommendations.ts` + `action-engine.ts` | Podem contradizer insights |
| vs mês anterior (Movimentos) | `MovementMonthSummaryCard` | Risco −100% sem base |

Detalhe completo → `FINANCIAL_METRICS_GLOSSARY.md`.

---

## 4. Funcionalidades internas expostas

| Item | Exposição actual | Acção P0 |
|------|------------------|----------|
| CentFlow Doctor | Settings em `development` **e** `beta` | Restringir a `__DEV__` / development only |
| OCR | Botão principal no AddTransactionModal | Feature flag; formulário manual primário |
| Contas bancárias (produto) | `ACCOUNTS_FEATURE_ENABLED=false` | Manter oculto |
| Benchmarks UI | env off | Manter oculto |
| Open Banking | Settings “Ligações bancárias” | Auditar; manter se funcional |

---

## 5. Placeholders / incompletos

- Sem strings “em breve” em settings.
- Contas locais desligadas por flag (correcto).
- Header de Créditos passa `subtitle` ignorado em variant `main`.
- Análises sem título de ecrã no AppHeader.
- Perfil gamificado (nível, % perfil, áreas activas).

---

## 6. Inconsistências UX encontradas

1. Home com muitos cartões equivalentes (recomendações + acções + atenção + assistente + insight).
2. Tab Análises elevada (logo) quebra equilíbrio visual.
3. Headers inconsistentes (título / brand / +).
4. Taxonomia Ativos = objetivos + garantias + inventário (não são todos ativos).
5. Poupança UI clampada a ≥0%.
6. Emergência com duas definições.
7. Conteúdo: padding tabs via `useResponsiveLayout` — validar overlap com tab elevada.
8. Copy: “activas”, cashflow misturado com PT-PT.
9. Eliminar conta escondido sob Privacidade.
10. Doctor visível em builds beta (testers externos).

---

## 7. Riscos de regressão

| Área | Risco |
|------|-------|
| Motor financeiro | Alterar fórmulas sem testes → números mudam em produção |
| Recomendações | Filtrar demais → Home vazia |
| Tab bar | Remover elevação Análises → layout shift |
| OCR flag | Testers beta perdem OCR se flag off por defeito |
| Doctor | `__DEV__` only — beta perde painel (intencional) |
| Perfil | Remover progresso pode confundir quem já o usa |

---

## 8. Plano por prioridade

### P0 (esta sprint — primeiro)

1. Glossário + guardrails (`safeDivide`, percentagens, MoM).
2. Unificar messaging emergência; corrigir poupança UI.
3. Insights/recs: amostra mínima + 1 rec na Home.
4. Doctor só development/`__DEV__`.
5. OCR atrás de flag; manual primário.
6. Tab bar equilibrada + padding conteúdo centralizado.
7. Eliminar conta no índice Settings.
8. Home: hierarquia Situação → 1 acção → recentes.

### P1

Headers unificados · Análises secções · Créditos âmbito totais · Ativos IA · Perfil sem gamificação · Settings reorganizadas · Novo movimento validação.

### P2

Tokens tipografia/contraste · badges · empty states · microcopy PT-PT · a11y fino.

---

## 9. Restrições desta sprint

- Sem OTA · sem merge `main` · sem builds · sem alterar bundle ID / Apple / Android nativo.
- Sem novas features sem necessidade clara.
- Commits temáticos locais quando autorizado; sem publicação.

---

*Fase 0 concluída — implementação começa na Fase 1.*
