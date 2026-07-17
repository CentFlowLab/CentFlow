# CentFlow — UX Remediation Report

## 1. Resumo executivo

Sprint focada em **confiança financeira** e **superfície de produto limpa** para beta.  
Baseline: 487 → **492** testes; TypeScript limpo.  
**Sem OTA, sem merge em main, sem builds nativos.**

## 2. P0 corrigidos

| Item | Estado |
|------|--------|
| Guardrails NaN/Infinity/% absurdas | Feito (`safe-math`) |
| −100% vs mês anterior | Feito |
| Taxa de poupança clampada | Feito |
| Fundo emergência (duas fórmulas) | Alinhado a fixos mensais |
| Doctor em beta | Só DEV |
| OCR incompleto na UI | Flag off |
| Tab bar desequilibrada | Feito |
| Eliminar conta acessível | Feito |
| Home sobrecarregada | Reduzida |
| Perfil gamificado | Removido |

## 3. Métricas financeiras alteradas

- Ver `FINANCIAL_METRICS_GLOSSARY.md`.
- `emergencyMonths` = disponível / (subs + prestações).
- Comparações MoM sem base → `null`.

## 4. Insights corrigidos

- Copy emergência em meses (não dias mágicos).
- Home: 1 recomendação + 1 acção.
- Poupança negativa visível.

## 5. Funcionalidades escondidas

- Doctor (não-DEV).
- OCR UI (env).
- Quick-add receipt quando OCR off.

## 6–13. Ecrãs

Ver `UX_CHANGELOG.md` e `ASSETS_INFORMATION_ARCHITECTURE.md`.  
Créditos (âmbitos de totais), headers unificados e Situação do mês realizado/previsto: **parcial / P1**.

## 14. Design system

Tokens existentes mantidos; tipografia/contraste P2 não fechados nesta passagem.

## 15. Acessibilidade

Áreas de toque settings/perfil reforçadas (`minHeight: 48`). Auditoria a11y completa P2.

## 16. Testes

- `safe-math.test.ts` (novo).
- Onboarding quick-add actualizado para OCR off.
- **492/492** pass.

## 17. Performance

Sem alterações estruturais de listas; tab bar mais leve (sem animação Análises).

## 18. Ficheiros alterados (principais)

- `lib/domain/financial/safe-math.ts` (+ test)
- `lib/domain/transaction-grouping.ts`, `metrics.ts`, `recommendations.ts`, `opportunities.ts`
- `lib/domain/analysis.compose.ts`
- `lib/diagnostics/config.ts`, `lib/config/product-features.ts`
- `lib/onboarding/quick-actions.ts`
- `app/(tabs)/_layout.tsx`, `index.tsx`, `perfil.tsx`
- `components/layout/CentFlowTabBar.tsx`
- `components/profile/ProfileHubSections.tsx`
- `components/movements/*`, `components/analysis/AnalysisSummaryTab.tsx`
- `app/settings/index.tsx`
- Docs: `CENTFLOW_UX_REMEDIATION_AUDIT.md`, `FINANCIAL_METRICS_GLOSSARY.md`, `ASSETS_INFORMATION_ARCHITECTURE.md`, `BETA_VISUAL_QA_REPORT.md`, `UX_CHANGELOG.md`, este relatório

## 19. Riscos restantes

- Card «Situação do mês» realizado vs previsto ainda não é um bloco único dedicado.
- Headers ainda não unificados num design system de 3 variantes.
- Créditos: labels de âmbito a fechar em P1.
- OCR off pode surpreender testers que já usavam talões.
- Validação visual só em código — **não** em dispositivo físico.

## 20. Pendente dispositivo real

- Tab bar + home indicator.
- Teclado no novo movimento.
- Contraste temas.
- Smoke eliminar conta / Face ID / OAuth.

## 21. Recomendação de release

**INTERNAL BETA** — confiança financeira e superfície limpas o suficiente para testers internos; **não** PUBLIC BETA CANDIDATE sem QA visual físico e fecho P1 (headers + Situação do mês + Créditos).

**NO-GO** para produção pública.
