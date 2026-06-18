# Auditoria de Estabilização — CentFlow

Data: 17 Jun 2026  
Âmbito: estabilidade, correção financeira, Doctor, remoção de stories — **sem novas funcionalidades**

---

## Resumo executivo

Fase focada em tornar a app **confiável e financeiramente correcta** antes de evoluir features. Corrigido crash provável na criação de movimentos, património líquido incompleto em Supabase, Doctor com contexto útil, stories removidas, Perfil Financeiro compacto.

---

## 1. Crash ao criar movimento

### Problemas encontrados

| Problema | Causa raiz | Severidade |
|----------|------------|------------|
| Categoria vazia após mudar tipo | Dois `useEffect` conflituosos: um definia categoria válida, outro fazia `setCategory('')` | Alta (bloqueia save) |
| Modais empilhados | `ReceiptDigitizePreview` + `DraggableBottomSheet` visíveis em simultâneo | Alta (crash nativo iOS) |
| `GestureHandlerRootView` aninhado | Root duplicado dentro do bottom sheet | Média |
| Race pós-save | `onClose()` + `invalidateQueries` + `setPhase` durante animação de fecho | Média |
| `handleConfirmReceipt` sem try/catch | Erro após mutação bem-sucedida podia deixar UI inconsistente | Média |

### Correções realizadas

- Removido `useEffect` que esvaziava categoria (`AddTransactionModal.tsx`)
- Bottom sheet só renderiza quando `visible && !pendingDraft` (preview digitizado exclusivo)
- Removido `GestureHandlerRootView` interno do `DraggableBottomSheet`
- `handleProcessReceipt` em `useCallback`; retake com deps correctas
- `handleConfirmReceipt` com try/catch; toast antes de `onClose()`; analytics isolado
- `setDiagnosticAction('save_movement')` no save manual e OCR
- `createMutation.reset()` apenas se não `isPending`
- `onSettled` da mutation com `queueMicrotask` para evitar race de fase

### Validação recomendada

- [ ] Criar movimento manual (despesa/receita, mudar tipo, guardar)
- [ ] Criar com talão + OCR
- [ ] Digitalizar com preview (variante digitizada)

---

## 2. CentFlow Doctor

### Problemas encontrados

- Warnings tipo «Error measuring text field» sem stack nem ecrã
- Erros sem `screen` / `action` / `severity`
- Mutações falhadas sem contexto de ecrã activo

### Correções realizadas

- `lib/diagnostics/runtime-context.ts` — rastreio de ecrã e última acção
- `hooks/useDiagnosticScreen.ts` — Home, Movimentos, Perfil, Doctor, `movement_create`
- `logAppError` / console.warn com stack capturado e contexto automático
- Severidade: `low` | `medium` | `high` | `critical`
- Export de log formatado: `screen`, `action`, `stack`
- UI Doctor mostra severidade + ecrã + acção por entrada
- React Query mutations registam `action` da mutation key

### Riscos ainda existentes

- Produção não instala handlers globais (só dev/beta) — intencional
- Nem todas as mutations têm `logDoctorMutationFailure` explícito
- Navegação Expo Router sem hook global de erros de rota

---

## 3. Stories removidas

### Eliminado

- `HomeStoriesRow.tsx`
- `useHomeStoryNotifications.ts`
- `lib/home/story-seen.storage.ts`
- Row, sheets e estado associado em `app/(tabs)/index.tsx`

### Substituído por (já existente)

- `HomeAssistantCard` — acções contextuais
- `CentFlowScoreCard` + sheet — insights de score
- Secção «O que devo fazer?» — sugestões
- Alertas via assistente (subscrições, garantias, objetivos)

`HomeChangesSheet` e `HomeAttentionSheet` mantidos no codebase mas **sem entrada na Home** (podem ser removidos numa limpeza futura).

---

## 4. Perfil

- `ProfileHubSections` já cobre Conta, Preferências, CentFlow, Estatísticas (fase anterior)
- `useDiagnosticScreen('profile')` adicionado

---

## 5. Perfil Financeiro reduzido

- `FinancialProfileProgress` no Perfil: `variant="compact"`
- Sem glow/gradiente em modo compact
- Margem reduzida (`spacing.lg`)
- Detalhe completo continua no sheet ao tocar

---

## 6. Património líquido

### Problema (causa raiz)

`composeDashboardFromLocalSources` em Supabase usava:
- `credits: []` — **créditos ignorados**
- Sem poupanças de objetivos
- PL ≈ saldo de movimentos + inventário apenas

### Fórmula corrigida

```
Ativos = contas + inventário + investimentos + poupanças (objetivos.current)
Passivos = Σ créditos.outstandingBalance
PL = Ativos - Passivos
```

### Correções

- `calculateNetWorth` aceita `savings` no input e breakdown
- `sumGoalSavings()` — soma `Goal.current`
- `composeDashboardFromLocalSources` recebe `credits`
- `fetchCreditsForCurrentUser()` partilhado entre Home e Dashboard
- `dashboard.mapper` inclui `breakdown.savings`
- **Testes**: `lib/domain/net-worth.service.test.ts` (4 casos, todos passam)

### Riscos ainda existentes

- `previousMonthNetWorth` ainda fixo (= PL actual) em Supabase — delta mensal 0
- Saldo de contas = derivado de movimentos, não contas bancárias reais
- Investimentos recorrentes ainda vazios no schema Supabase

---

## Ficheiros principais alterados

```
components/movements/AddTransactionModal.tsx
components/layout/DraggableBottomSheet.tsx
hooks/queries/useTransactions.ts
lib/diagnostics/app-log.ts
lib/diagnostics/runtime-context.ts
hooks/useDiagnosticScreen.ts
lib/domain/net-worth.service.ts
lib/domain/net-worth.service.test.ts
lib/domain/dashboard.compose.ts
lib/api/services/home.service.ts
lib/api/services/dashboard.service.ts
app/(tabs)/index.tsx
app/(tabs)/perfil.tsx
app/(tabs)/movimentos.tsx
app/settings/diagnostics.tsx
components/profile/FinancialProfileProgress.tsx
```

### Ficheiros removidos

```
components/dashboard/HomeStoriesRow.tsx
hooks/useHomeStoryNotifications.ts
lib/home/story-seen.storage.ts
```

---

## Checklist de validação

| Teste | Estado |
|-------|--------|
| Criar movimento manual | ✅ corrigido (categoria + modais) |
| Criar movimento OCR | ✅ try/catch + sequência fecho |
| Criar crédito/subscrição | ⏳ sem alteração (já funcionava) |
| Doctor captura erros com contexto | ✅ |
| Património com créditos + poupanças | ✅ + testes |
| Perfil compacto | ✅ |
| Stories ausentes | ✅ |
| `npm test` | ✅ 18/18 |

---

## Próximos passos recomendados (fora deste scope)

1. Calcular `previousMonthNetWorth` real (snapshot mensal ou histórico)
2. Remover `HomeChangesSheet` / `HomeAttentionSheet` se não forem reutilizados
3. Teste manual completo no dispositivo LiveContainer pós-OTA
4. Expandir Doctor a todas as mutations restantes
