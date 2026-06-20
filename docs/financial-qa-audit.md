# Auditoria QA Financeira — CentFlow

**Data:** 2026-06-20  
**Âmbito:** Mecânicas, cálculos e fluxos financeiros principais  
**Método:** Revisão de código + testes automatizados (`npm test`) + mapeamento de gaps  
**Regra:** Nenhuma correção aplicada nesta fase — apenas diagnóstico

---

## Resumo executivo

| Área | Veredicto | Testes auto. | Confiança |
|------|-----------|--------------|-----------|
| 1. Movimentos | **PARCIAL** | Indirecto (filtro datas) | Média |
| 2. Património líquido | **PASS** (core) / **PARCIAL** (métricas) | 13 casos | Alta (fórmula) |
| 3. Créditos | **PASS** | 2 casos | Alta |
| 4. Subscrições | **PARCIAL** | 3 casos (detecção) | Média |
| 5. Objetivos | **PARCIAL** | 1 caso (soma) | Média-baixa |
| 6. Garantias/OCR | **PARCIAL** | 0 casos | Baixa |
| 7. Home | **PARCIAL** | 0 casos | Média |
| 8. Doctor | **PARCIAL** | 0 casos | Média (movement_create) |

**Testes automatizados:** 32/32 PASS (`npm test`, 2026-06-20)

---

## 1. Movimentos

### Checklist manual

| # | Cenário | Passos | Resultado esperado | Auto? |
|---|---------|--------|-------------------|-------|
| M1 | Receita passada | Criar receita com data ≤ hoje | PL actual sobe; lista mostra movimento | Indirecto |
| M2 | Despesa passada | Criar despesa com data ≤ hoje | PL actual desce | Indirecto |
| M3 | Receita futura | Criar receita com data > hoje | PL actual **inalterado**; hint "+X previstos" | ✅ `net-worth-projection.test.ts` |
| M4 | Despesa futura | Criar despesa com data > hoje | PL actual inalterado; projeção desce | ✅ |
| M5 | Edição | Alterar valor/data de movimento existente | PL recalcula; cache invalida home | ❌ |
| M6 | Eliminação | Apagar movimento | PL recalcula; item desaparece da lista | ❌ |
| M7 | OCR sucesso | Digitalizar talão → confirmar | Campos preenchidos; movimento criado | ❌ |
| M8 | OCR falha | Talão ilegível / rede off | App não crasha; utilizador pode preencher manual | ❌ |
| M9 | Editar data passado→futuro | Mudar data para amanhã | Sai do PL actual; entra na projeção | ❌ |

### Ficheiros envolvidos

- `lib/api/services/transaction.service.ts` — CRUD + OCR
- `lib/supabase/transactions.ts` — persistência
- `hooks/queries/useTransactions.ts` — cache + mutations
- `components/movements/AddTransactionModal.tsx` / `EditTransactionModal.tsx`
- `lib/domain/transaction-date.utils.ts` — filtro temporal
- `lib/api/invalidate-queries.ts` — invalidação home/dashboard

### Veredicto: **PARCIAL**

**O que passa (código + testes):**
- Filtro `occurred` vs `future` testado (9 casos em `net-worth-projection.test.ts`)
- Invalidação de queries após create/delete
- Tracing Doctor em `movement_create` (create path)

**O que falha ou está em risco:**
- Falha OCR engolida sem `traceMovementError` (`transaction.service.ts` L125-127)
- Zero testes unitários de CRUD, edit, delete
- Edit/delete sem `logDoctorMutationFailure`

**Correção recomendada (não aplicada):**
1. Adicionar `traceMovementError` no catch OCR
2. Testes para `invalidateTransactionQueries` e mutations optimistic
3. Instrumentar edit/delete no Doctor

---

## 2. Património líquido

### Fórmula implementada

```
Ativos = contas (saldo movimentos ocorridos) + inventário + investimentos + poupanças (goals.current)
Passivos = Σ créditos.outstandingBalance
PL actual = Ativos - Passivos
Projeção = PL actual + Σ(movimentos futuros líquidos)
```

### Checklist manual

| # | Cenário | Resultado esperado | Auto? |
|---|---------|-------------------|-------|
| PL1 | Só movimentos passados | PL = receitas - despesas (ocorridas) | ✅ |
| PL2 | Movimento futuro isolado | PL actual = 0 (sem outros dados) | ✅ |
| PL3 | Mistura passado + futuro | PL actual só passado; projeção inclui futuro | ✅ |
| PL4 | Inventário 10k + salário futuro 1090 | PL = 10k; hint +1090 | ✅ |
| PL5 | Variação mensal na Home | % e delta vs mês anterior | ❌ (sempre 0 em Supabase) |
| PL6 | Investimentos recorrentes | Entram no PL se activos | ❌ (`investments: []` fixo) |

### Ficheiros envolvidos

- `lib/domain/net-worth.service.ts`
- `lib/domain/dashboard.compose.ts`
- `lib/domain/transaction-date.utils.ts`
- `lib/domain/net-worth.service.test.ts` (4 casos)
- `lib/domain/net-worth-projection.test.ts` (9 casos)
- `components/dashboard/NetWorthHeroCard.tsx`

### Veredicto: **PASS** (fórmula core) / **PARCIAL** (métricas derivadas)

**PASS:**
- Fórmula ativos − passivos correcta e testada
- Movimentos futuros **excluídos** do PL actual (confirmado por testes)
- `futureMovementsDelta` exposto na Home

**PARCIAL:**
- `previousMonthNetWorth`, `netWorthChangePercent`, `netWorthChangeThisMonth` = 0 fixos em `dashboard.compose.ts`
- Investimentos recorrentes nunca populados no path Supabase
- Risco conceptual de **double-count** entre `goal.current` e saldo de movimentos (ver secção 5)

**Correção recomendada:**
1. Calcular delta mensal real (movimentos do mês vs anterior)
2. Ligar investimentos recorrentes quando schema existir
3. Documentar ou separar “saldo total” vs “alocado em objetivos”

---

## 3. Créditos

### Checklist manual

| # | Cenário | Resultado esperado | Auto? |
|---|---------|-------------------|-------|
| C1 | Criar crédito outstandingBalance=5000 | PL desce 5000 | ✅ (unit) |
| C2 | Editar saldo em dívida para 3000 | PL reflecte 3000, não valor inicial | Manual |
| C3 | Eliminar crédito | PL sobe | Manual |
| C4 | originalAmount ≠ outstandingBalance | PL usa **outstandingBalance** | ✅ (código) |

### Ficheiros envolvidos

- `lib/domain/net-worth.service.ts` — `sumCreditLiabilities`
- `lib/api/services/liabilities-fetch.ts`
- `hooks/queries/useLiabilities.ts`
- `components/assets/CreditFormModal.tsx`
- `lib/supabase/liabilities.ts`

### Veredicto: **PASS**

**Confirmado:**
- `sumCreditLiabilities` soma `outstandingBalance` (testado)
- Home/Dashboard fetch créditos via `fetchCreditsForCurrentUser()`
- Save/delete invalida `queryKeys.home`

**Riscos menores:**
- `fetchCreditsForCurrentUser()` devolve `[]` em erro de auth (silencioso)
- Pagamentos de crédito não reduzem saldo automaticamente via movimentos

**Correção recomendada:**
- Teste integração “criar crédito → PL desce”
- Tratar erro de fetch com estado de erro visível

---

## 4. Subscrições

### Checklist manual

| # | Cenário | Resultado esperado | Auto? |
|---|---------|-------------------|-------|
| S1 | Subscrição mensal 10€ | Custo mensal = 10€ no score | ❌ |
| S2 | Subscrição anual 120€ | Custo mensal = 10€ | ❌ |
| S3 | Renovação em 5 dias | Alerta assistente + UI warning | Manual |
| S4 | Renovação passada (ontem) | Label correcto (não “em breve”) | ❌ **FALHA** |
| S5 | Subscrição no PL | **Não** deve alterar património | ✅ (design) |
| S6 | Detecção automática (2+ movimentos) | Sugere subscrição pendente | ✅ (3 testes) |

### Ficheiros envolvidos

- `lib/subscriptions/subscription-utils.ts` — `subscriptionToMonthlyAmount`
- `lib/domain/financial/centflow-score.ts` — `monthlySubscriptionTotal`
- `hooks/useCentFlowIntelligence.ts` — `countRenewalsSoon` (14 dias)
- `components/assets/SubscriptionsSection.tsx` — `getRenewalStatus` (7 dias)
- `lib/subscriptions/detect-subscriptions.test.ts`

### Veredicto: **PARCIAL**

**PASS:**
- Subscrições não entram no PL (correcto)
- Detecção por padrão de movimentos testada
- Conversão mensal/trimestral/anual implementada em código

**FALHA identificada:**
- `getRenewalStatus`: se `diffDays < 0` (data passada), mostra **"Renova em breve"** — semanticamente errado (`SubscriptionsSection.tsx` L29-30)

**PARCIAL:**
- Janelas inconsistentes: assistente **14d** vs UI **7d** vs email backend **7d**
- Sem testes para `monthlySubscriptionTotal` / `subscriptionToMonthlyAmount`

**Correção recomendada:**
1. Corrigir label para renovações passadas (“Renovação em atraso” ou similar)
2. Unificar janela de alertas (7 ou 14 dias em toda a app)
3. Adicionar testes de conversão de intervalos

---

## 5. Objetivos

### Checklist manual

| # | Cenário | Resultado esperado | Auto? |
|---|---------|-------------------|-------|
| G1 | Criar objetivo current=500 | PL sobe 500 (poupanças) | Manual |
| G2 | Criar movimento receita 500 **sem** editar goal | goal.current **não** muda | Manual |
| G3 | Editar goal.current | PL actualiza após invalidação cache | Manual |
| G4 | goal.current negativo | Ignorado no PL | ✅ |
| G5 | Objetivo atinge target | PL **não** deve duplicar automaticamente | Manual |

### Ficheiros envolvidos

- `lib/domain/net-worth.service.ts` — `sumGoalSavings`
- `lib/domain/dashboard.compose.ts`
- `components/assets/GoalFormModal.tsx`
- `hooks/queries/useAssets.ts` — invalidação home

### Veredicto: **PARCIAL**

**Comportamento actual (por design):**
- `goal.current` **entra automaticamente** no PL via `sumGoalSavings` → campo `savings`
- **Não** há ligação automática movimento → objetivo
- Objetivos **não** aumentam património por si só — só quando o utilizador edita `current`

**Interpretação do requisito “não aumentar automaticamente”:**
- ✅ Não há auto-sync de movimentos para goals
- ⚠️ Editar `current` propaga ao PL sem movimento associado — pode ser intencional (poupança alocada) ou double-count se o cash já está nos movimentos

**Correção recomendada:**
1. Decisão de produto: goals como “alocação virtual” vs “poupança real”
2. Teste: “goal.current + saldo movimentos” não deve duplicar o mesmo dinheiro
3. Alinhar `getGoalsAggregate` com `Math.max(0)` como `sumGoalSavings`

---

## 6. Garantias / OCR

### Checklist manual

| # | Cenário | Resultado esperado | Auto? |
|---|---------|-------------------|-------|
| W1 | Criar garantia manual | Persiste; não afecta PL | Manual |
| W2 | Associar movimento com talão | Preenche produto/loja | Manual |
| W3 | OCR falha no movimento | Sem crash; formulário manual | Manual |
| W4 | Garantia a expirar ≤30d | Alerta no assistente | Manual |
| W5 | Eliminar movimento associado | Garantia não crasha (órfã?) | Manual |

### Ficheiros envolvidos

- `components/assets/WarrantyFormModal.tsx`
- `components/assets/WarrantyReceiptPicker.tsx`
- `lib/domain/warranty.utils.ts`
- `lib/api/services/receipt.service.ts` — OCR movimentos
- `scripts/test-ocr-sanitize.ts` — teste manual OCR

### Veredicto: **PARCIAL**

**PASS (design):**
- Garantias não entram no PL
- OCR é fluxo de **movimentos**, não garantias directamente
- Erros API mostrados no modal (`getApiErrorMessage`)

**Gaps:**
- Zero testes automatizados garantias/warranty.utils
- Sem Doctor logging em CRUD garantias
- OCR failure silenciosa (secção 1)
- Possível garantia órfã se movimento eliminado

**Correção recomendada:**
1. Testes `warranty.utils` (expiração, urgência)
2. Doctor em create/update/delete garantia
3. Validar FK ou cleanup ao apagar movimento com garantia

---

## 7. Home

### Checklist manual

| # | Campo Home | Fonte de dados | Bate certo? | Auto? |
|---|------------|----------------|-------------|-------|
| H1 | Património líquido | `composeDashboardFromLocalSources` | ✅ (testes PL) | Indirecto |
| H2 | "+X previstos" | `projection.futureMovementsDelta` | ✅ | Indirecto |
| H3 | Variação % mês | `netWorthChangePercent` | ❌ sempre 0 | — |
| H4 | Gastos semanais | `sumWeeklyExpenses` (só ocorridos) | Manual | — |
| H5 | CentFlow Score | `useCentFlowIntelligence` | Manual | — |
| H6 | Últimos movimentos | `recentTransactions` (top N) | Manual | — |
| H7 | Attention items | `attentionItems` | ❌ sempre `[]` | — |
| H8 | Objetivo em destaque | `featuredGoal` | Manual | — |

### Pipeline Supabase

```
fetchTransactions + fetchAssetsData + fetchCreditsForCurrentUser
  → composeDashboardFromLocalSources()
  → composeHomeScreenData()
```

### Ficheiros envolvidos

- `lib/api/services/home.service.ts`
- `lib/api/mock-home.ts`
- `hooks/queries/useHomeScreenData.ts`
- `app/(tabs)/index.tsx`
- `hooks/useCentFlowIntelligence.ts`

### Veredicto: **PARCIAL**

**PASS:**
- Agregação core do PL alinhada com fórmula testada
- Score e assistente derivados dos mesmos dados (transactions, credits, goals)

**PARCIAL/FALHA:**
- Métricas de evolução mensal inúteis (0 fixo)
- `attentionItems` vazio em produção Supabase
- `recentTransactions` ordena por `new Date(date)` sem normalização T12:00 (risco timezone menor)

**Correção recomendada:**
1. Implementar `attentionItems` live (garantias, créditos, subscrições)
2. Calcular delta mensal real
3. Teste `home.service` com fixtures controladas

---

## 8. Doctor (diagnóstico)

### Checklist manual

| # | Cenário | screen | action | stack | context | Auto? |
|---|---------|--------|--------|-------|---------|-------|
| D1 | Erro ao criar movimento | movement_create | movement:* | ✅ | ✅ | Manual |
| D2 | Erro ao editar movimento | movements | — | ? | ? | ❌ não instrumentado |
| D3 | Falha OCR | movement_create | — | ❌ | ❌ | ❌ |
| D4 | Crash global | runtime screen | — | ✅ | ✅ | Manual (dev/beta) |
| D5 | Produção | — | — | — | — | ❌ Doctor desactivado |

### Ficheiros envolvidos

- `lib/diagnostics/app-log.ts` — `logAppError` (stack, context, severity)
- `lib/diagnostics/runtime-context.ts` — screen/action
- `lib/doctor/movement-flow-trace.ts`
- `lib/doctor/log-mutation.ts`
- `hooks/useDiagnosticScreen.ts`
- `lib/diagnostics/config.ts` — só dev/beta
- `app/settings/diagnostics.tsx`

### Veredicto: **PARCIAL**

**PASS (movement_create):**
- Tracing estruturado: `form_open`, `mutation_service_*`, `sheet_visible`, etc.
- `logAppError` captura stack + context mergeado
- UI Doctor filtra e exporta logs

**PARCIAL:**
- Doctor **desactivado em production** (`isDiagnosticsEnabled`)
- Edit/delete/warranty/goal sem `logDoctorMutationFailure`
- OCR failure não registada
- UI Doctor filtra por defeito só `movement_create`

**Correção recomendada:**
1. `traceMovementError` no catch OCR
2. Estender Doctor a todas as mutations financeiras
3. Avaliar telemetria anonymizada em production (opcional)

---

## Matriz consolidada

| ID | Área | Veredicto | Causa provável | Prioridade |
|----|------|-----------|----------------|------------|
| M | Movimentos | PARCIAL | Sem testes CRUD; OCR silencioso | Alta |
| PL | Património líquido | PASS / PARCIAL | Core OK; métricas mensais stub | Média |
| CR | Créditos | PASS | outstandingBalance correcto | Baixa |
| SB | Subscrições | PARCIAL | Label renovação passada errada; janelas 7/14d | Média |
| GO | Objetivos | PARCIAL | Modelo ambíguo goal.current vs movimentos | Média |
| GA | Garantias/OCR | PARCIAL | Sem testes; OCR indirecto | Média |
| HO | Home | PARCIAL | attentionItems vazio; delta 0 | Média |
| DO | Doctor | PARCIAL | Cobertura só movement_create | Alta |

---

## Cobertura de testes automatizados

```
npm test → 32/32 PASS

lib/domain/net-worth.service.test.ts          4  (PL, credits, goals)
lib/domain/net-worth-projection.test.ts       9  (filtro temporal, compose)
lib/subscriptions/detect-subscriptions.test.ts 3  (detecção)
lib/credit/credit-analysis.test.ts           4  (análise TAEG)
lib/credit/credit-type.utils.test.ts         3  (tipos)
lib/layout/tab-bar-metrics.test.ts           5  (UI — fora âmbito financeiro)
lib/security/passwordPolicy.test.ts          4  (auth — fora âmbito)

NÃO COBERTO:
- transaction.service CRUD/OCR
- home.service agregação
- goals → PL integração
- warranties
- subscriptions monthly cost / renewals
- Doctor
```

---

## Plano de QA manual recomendado (ordem)

1. **Baseline PL:** inventário 0, sem créditos/goals → criar receita passada +100 → PL = 100
2. **Futuro:** adicionar receita +50 amanhã → PL permanece 100; hint +50
3. **Crédito:** outstandingBalance 200 → PL = -100 (ou 100-200 conforme baseline)
4. **Goal:** current 300 → PL sobe 300 (validar se aceitável vs movimentos)
5. **Subscrição:** renewsAt em 3 dias → verificar assistente + secção Ativos
6. **OCR:** talão ilegível → sem crash; verificar Doctor (hoje: provavelmente vazio)
7. **Home:** comparar PL hero vs soma manual ativos-passivos
8. **Edit/Delete:** alterar e apagar movimento → PL coerente

---

## Próximos passos (após aprovação)

Correções sugeridas por prioridade — **não implementadas nesta fase:**

| P | Item | Esforço |
|---|------|---------|
| P0 | OCR failure → `traceMovementError` | Baixo |
| P0 | Testes CRUD movimentos (mock Supabase) | Médio |
| P1 | Corrigir `getRenewalStatus` data passada | Baixo |
| P1 | Unificar janelas alerta subscrições | Baixo |
| P1 | Doctor em edit/delete mutations | Médio |
| P2 | Delta mensal PL real | Médio |
| P2 | attentionItems live na Home | Médio |
| P2 | Decisão produto goals vs double-count | Produto |
| P3 | Testes home.service + warranty.utils | Médio |

---

*Documento gerado na fase de QA financeiro. Nenhuma alteração de código de produção foi feita.*
