# Glossário de métricas financeiras — CentFlow

Fonte de verdade para labels e fórmulas na UI. Qualquer ecrã deve usar a mesma definição.

---

## Convenções

- Moeda: formatação PT-PT (`formatCurrency`).
- Períodos: **mês civil** vs **rolling 30 dias** devem estar rotulados.
- Sem dados: mostrar “Sem dados suficientes” / ocultar — nunca `0` como conclusão falsa.
- Guardrails: `lib/domain/financial/safe-math.ts`.

---

## Disponível este mês

| Campo | Valor |
|-------|--------|
| **Definição** | Saldo das contas de orçamento menos obrigações futuras do mês. |
| **Fórmula** | `budgetAccountBalance − futureObligations` |
| **Inclui** | Contas `budget_enabled`, obrigações planeadas (prestações, subscrições, etc.). |
| **Exclui** | Investimentos, inventário, compras de cartão (não reduzem caixa até pagamento). |
| **Período** | Mês civil até `asOf`. |
| **Sem dados** | Contas vazias → 0 com empty state, não “saudável”. |
| **Denominador 0** | N/A (não é rácio). |
| **UI** | `MonthlySpendableCard`, sheet, Análises resumo. |
| **Label PT-PT** | Preferir “Disponível este mês” + subtítulo “após obrigações previstas”. |

**Nota:** Valor pode ser negativo = “Previsto negativo” — explicar componentes, não julgar.

---

## Saldo realizado (mês)

| Campo | Valor |
|-------|--------|
| **Definição** | Receitas recebidas − despesas pagas até hoje (ocorridas). |
| **Fórmula** | `incomeOccurred − expenseOccurred` (transações `filterOccurred`). |
| **Inclui** | Movimentos com data ≤ hoje. |
| **Exclui** | Futuros, transferências internas sem impacto cash. |
| **UI** | Card Situação do mês (Home) — a implementar/alinhar. |
| **Label** | “Realizado este mês”. |

---

## Saldo previsto (fim do mês)

| Campo | Valor |
|-------|--------|
| **Definição** | Realizado + receitas futuras do mês − despesas/obrigações futuras do mês. |
| **Fórmula** | Alinhada a `monthEndProjection` / breakdown disponível. |
| **Não confundir com** | Horizonte 30/60/90 de `buildCashflowProjection` (“Saldo previsto a 30 dias”). |
| **Label** | “Previsto até ao fim do mês” vs “Saldo previsto (30 dias)”. |

---

## Fluxo líquido

| Campo | Valor |
|-------|--------|
| **Definição** | Receitas − despesas no período seleccionado. |
| **Fórmula** | `getNetCashflow` |
| **Período Análises** | Rolling 30 dias (rotular). |
| **UI** | `TrendsSummaryCard`, métrica cashflow. |

---

## Taxa de poupança

| Campo | Valor |
|-------|--------|
| **Definição** | `(receitas − despesas) / receitas × 100`. |
| **Fórmula** | `calculateSavingsRate` — `null` se `income ≤ 0`. |
| **Sem rendimento** | “Sem dados suficientes” — **não** mostrar 0%. |
| **Défice** | Mostrar valor negativo ou “Défice” — **não** clamar a 0%. |
| **UI** | `AnalysisSummaryTab`, compose metrics. |

---

## Património líquido

| Campo | Valor |
|-------|--------|
| **Definição** | Activos − passivos (créditos, cartões). |
| **Fórmula** | `calculateNetWorth` / consolidado no engine. |
| **Variação %** | Se base anterior = 0 → “Sem comparação” (não ±100%). |
| **UI** | Tab Património em Análises. |

---

## Fundo de emergência (meses)

| Campo | Valor |
|-------|--------|
| **Definição canónica (recomendação)** | `availableThisMonth / fixedMonthly` onde `fixedMonthly = subscrições + prestações`. |
| **Alvo** | 3 meses. |
| **Sem despesas fixas** | Não calcular / não recomendar. |
| **Negativo** | Tratar como 0 meses cobertos + alerta de disponível negativo. |
| **Deprecated** | `emergencyMonths = available / (avgDailySpend × 30)` com cap 99 — alinhar a esta definição. |
| **UI** | Só via recomendação/oportunidade, sem card hero. |

---

## Dívida total

| Campo | Valor |
|-------|--------|
| **Definição** | Soma de outstanding créditos pessoais + cartões. |
| **Labels por âmbito** | “Dívida total” / “Total créditos pessoais” / “Total cartões”. |
| **UI** | `AnalysisDebtTab`, `CreditsSection`. |

---

## Progresso de objectivo

| Campo | Valor |
|-------|--------|
| **Fórmula** | `current / target` clamp 0–100% (sobrecumprimento só se UI o marcar). |
| **target ≤ 0** | 0%, sem divisão. |

---

## Comparação vs período anterior

| Campo | Valor |
|-------|--------|
| **Regra** | Se base ≤ 0 ou amostra insuficiente → “Sem comparação disponível”. |
| **Nunca** | −100% / Infinity por base zero. |
