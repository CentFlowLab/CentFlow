# Investigação — bloqueio ao criar movimento

**Estado:** instrumentação deployada — causa raiz **pendente de reprodução com log**.

## Objetivo

Descobrir o passo exacto onde a UI bloqueia ao criar um movimento, **sem correcções cegas**.

## Como reproduzir e recolher evidência

1. Instalar OTA com esta instrumentação (ou build preview actualizado).
2. **Perfil → Testes → CentFlow Doctor** (filtro «Só movement_create» activo por defeito).
3. Ir a **Movimentos** (ou Home) → **+** → preencher campos → **Guardar**.
4. Quando a app bloquear, voltar ao Doctor (se possível) ou **Partilhar log**.
5. Enviar o log — o **último `step`** antes do bloqueio define o passo exacto.

### Interpretação rápida

| Último `step` visível | Hipótese principal | Ficheiro / zona |
|----------------------|-------------------|-----------------|
| `form_open` / `sheet_visible` | Bloqueio ao abrir sheet (gesture/animation/modal) | `DraggableBottomSheet.tsx` ~143–161 |
| `form_init_start` sem `form_init_done` | Loop ou crash silencioso na inicialização | `AddTransactionModal.tsx` ~108–136 |
| `render_loop_suspect` | Render loop no modal | `AddTransactionModal.tsx` + `useMovementRenderProbe.ts` |
| `effect_sync_category` repetido | Cascata type→category→re-render | `AddTransactionModal.tsx` ~138–145 |
| `mutation_service_supabase_insert` + **STALL** | Hang em insert Supabase / auth | `lib/supabase/transactions.ts` |
| `mutation_service_upload` / `ocr` + **STALL** | Hang no upload/OCR do talão | `transaction.service.ts` |
| `cache_invalidate_start` + **STALL** | Refetch massivo após guardar trava UI | `invalidate-queries.ts` + queries home/dashboard |
| `mutation_success` sem `modal_close` | Bloqueio entre sucesso e fecho | `AddTransactionModal.tsx` ~310–320 |
| `unhandled-rejection` / `global-handler` | Erro async não tratado | stack no Doctor |

Entrada **STALL** (watchdog 12s):

```
WARN · movement_create
STALL após mutation_service_supabase_insert (12000ms sem progresso)
step: stall_detected
lastStep: mutation_service_supabase_insert
```

## Mapa de instrumentação (passos `movement_create`)

| Passo | Onde | Ficheiro |
|-------|------|----------|
| `form_open` | Abrir modal (ecrã pai + probe) | `movimentos.tsx`, `index.tsx`, `useMovementRenderProbe.ts` |
| `form_init_start` / `form_init_done` | Reset do formulário ao abrir | `AddTransactionModal.tsx` |
| `field_change` | Cada campo (throttle 400ms) | `AddTransactionModal.tsx` |
| `validation_*` | Zod antes de guardar | `AddTransactionModal.tsx` |
| `save_click` | Botão Guardar | `AddTransactionModal.tsx` |
| `mutation_start` / `mutation_phase` | Hook React Query | `useTransactions.ts` |
| `mutation_service_*` | Upload, OCR, Supabase | `transaction.service.ts`, `supabase/transactions.ts` |
| `mutation_success` / `mutation_error` / `mutation_settled` | Callbacks da mutation | `useTransactions.ts`, modal |
| `cache_invalidate_*` | Invalidação de 6 query keys | `invalidate-queries.ts` |
| `sheet_visible` / `sheet_close` | Bottom sheet | `DraggableBottomSheet.tsx` |
| `modal_close` | `onClose()` após sucesso | `AddTransactionModal.tsx` |
| `render_tick` / `render_loop_suspect` | Detecção de loop | `useMovementRenderProbe.ts` |
| `stall_detected` | Sem progresso 12s em passos críticos | `movement-flow-trace.ts` |

## Análise estática — loops e cascatas suspeitas

### 1. Dois `useEffect` ao abrir (`AddTransactionModal.tsx` ~108–145)

- **Effect A** (`visible`, `lockedType`): reset completo + `form_init_*`.
- **Effect B** (`type`, `visible`): `effect_sync_category` chama `setCategory`.

**Risco:** ao abrir, A define `type` e `category`; B pode voltar a `setCategory` no mesmo tick → re-renders extra (não necessariamente loop infinito).  
**Evidência esperada:** vários `render_tick` ou `render_loop_suspect` logo após `form_open`.

### 2. `DraggableBottomSheet` effect com `animateOut` nas deps (~143–161)

`animateOut` é `useCallback` estável, mas `isMounted` + `visible` alternam em fecho animado.  
**Risco:** re-trigger de animação se `visible` oscilar.  
**Evidência:** `sheet_visible` / `sheet_close` alternados sem `modal_close`.

### 3. `onSuccess` → invalidação síncrona de 6 queries (`useTransactions.ts` ~99–101)

`invalidateTransactionQueries` dispara refetch de transactions, home, dashboard, analytics, financialProfile, netWorth.  
**Risco:** UI congela **sem excepção** durante refetch + `attachReceiptItems` em cada lista.  
**Evidência:** chega a `mutation_success` e `cache_invalidate_done`, depois **STALL** ou freeze sem mais logs.

### 4. `mutateAsync` + `onClose` imediato (`AddTransactionModal.tsx` ~310–320)

Modal fecha antes de `onSettled` / invalidação completar.  
**Risco:** ecrã de fundo refetcha enquanto sheet ainda desmonta → sensação de «app bloqueada».  
**Evidência:** `modal_close` presente mas lista/home não responde.

### 5. `createMutation.reset()` no `form_init` (~129–131)

Se `isPending` mudar durante init, effect re-corre.  
**Risco:** baixo, mas pode interagir com save em voo.

## Erros não tratados

- `unhandledrejection` e `ErrorUtils` global → Doctor com `screen`, `action`, `message`, `stack`.
- Mutations → `traceMovementError` + `logDoctorMutationFailure`.
- Validação → `logDoctorValidationFailure`.

## Relatório de causa raiz (preencher após log)

```
O bloqueio acontece em:
[PREENCHER — último step antes do freeze]

Causa:
[PREENCHER — com base no step + STALL + stack]

Ficheiro:
[PREENCHER]

Linha provável:
[PREENCHER]
```

### Hipóteses ordenadas (pré-reprodução)

1. **Hang Supabase** — insert ou `getUser()` sem timeout (`lib/supabase/transactions.ts`).
2. **Refetch pós-save** — invalidação massiva trava JS thread (`invalidate-queries.ts`).
3. **Render loop** — efeitos init + category sync (`AddTransactionModal.tsx`).
4. **Sheet/gesture** — animação ou modal ao abrir (`DraggableBottomSheet.tsx`).

**Nenhuma correcção aplicada até o passo exacto ser confirmado pelo Doctor.**
