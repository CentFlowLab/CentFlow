# CentFlow — Relatório de remediação (sprint confiança financeira)

**Branch:** `rc2-ios-sideload`  
**Baseline HEAD:** `e7bd7ea`  
**Validação:** `npx tsc --noEmit` OK · `npm test` **502** pass · OTA **não** publicada · main **não** alterada

---

## 1. Estado inicial

Inconsistência aparente Home (−2 245 €) vs Movimentos (−97 €) vs Análises vs Património (“Ativos” negativos); onboarding com resto mal rotulado; Edge Function visível; tab Ativos com taxonomia incorrecta.

## 2. Problemas P0 encontrados

Ver `CENTFLOW_CURRENT_STATE_AUDIT.md`.

## 3. Correções financeiras

- Glossário alinhado (`FINANCIAL_METRICS_GLOSSARY.md`)  
- Home: decomposição + saldo previsto  
- `safePercentage` / `Não calculável` em rácios de património  
- Património UI sem “Ativos: −X” sem contexto  
- Labels realizado vs previsto em Análises e Movimentos  

## 4. Onboarding

- Copy plano / segurança / OCR / IA  
- Seleção múltipla com checkbox + a11y  

## 5. Home

- Uma prioridade; recentes; menos cartões concorrentes  

## 6–11. Movimentos / Análises / Créditos / Património / Perfil

- Labels e totais explícitos; tab Património; “Registar pagamento”; perfil sem regressão de gamificação  

## 12. Definições

- Open Banking escondido por defeito  

## 13. Funcionalidades escondidas

Ver `FEATURE_READINESS_MATRIX.md` (OCR, Open Banking).

## 14. Erros técnicos

`lib/open-banking/user-errors.ts` — Edge Function → mensagem de produto.

## 15. Design system

Incremental (labels, menos cartões na Home/Análises). Tokens semânticos completos: pendente.

## 16. Acessibilidade

ChoiceCard radio/checkbox + estados. Auditoria Dynamic Type: pendente dispositivo.

## 17–18. Testes

Adicionados: safe-math alargado, plan 1000/2500/12, open-banking user-errors. **502** pass.

## 19. Ficheiros alterados (principais)

`MonthlySpendableCard/Sheet`, `AnalysisPatrimonyTab`, `analysis.mapper`, `analysis.compose`, `PlanResult`, `onboarding`, `product-features`, `user-errors`, Home components, Credits labels, docs.

## 20. Riscos restantes

- Objetivos ainda na tab Património (IA documentada)  
- Home “Resumo rápido” ainda presente se há actividade  
- Open Banking código vivo mas UI off  
- Sem QA em iPhone físico nesta sprint  
- Período Análises “Mês” = rolling 30 dias (rotulado, não mês civil)

## 21. Recomendação de release

**INTERNAL BETA**

Não PUBLIC BETA CANDIDATE até: validação humana iPhone + revisão de inventário/formulário + confirmação export/eliminar conta em dispositivo.
