# Bottom Sheets — Auditoria Teclado & Flicker

**Data:** 2026-06-19  
**Âmbito:** `DraggableBottomSheet` e todos os formulários que o utilizam.

---

## 1. Causa raiz — Flicker

### Problema principal (confirmado)

No `DraggableBottomSheet` anterior, o ciclo de abertura era:

1. `visible=true` → `setIsMounted(true)` → montagem do `Modal`
2. `finishClose()` repunha `translateY = 0` ao desmontar
3. **Primeiro frame pintado com o sheet em `translateY=0` (posição final)**
4. Só depois o `useEffect` movia para `translateY=420` e animava com `withSpring`

Esse flash de 1 frame (sheet visível → salto para baixo → animação) é percebido como **flicker/reconstrução**.

### Contribuintes secundários

| Factor | Impacto |
|--------|---------|
| Backdrop ligado ao `translateY` na abertura | Opacidade 0→1 sincronizada com salto do sheet |
| `withSpring` na abertura | Bounce extra, sensação de instabilidade |
| `return null` quando `!isMounted` | Remount completo do `Modal` + `GestureHandlerRootView` a cada abertura |
| Sequência QuickAdd → Formulário | Dois modais em série (menu fecha → form abre) — flicker duplo intencional para evitar bloqueio |

### O que **não** causava flicker

- Keys dinâmicas nos formulários
- `LayoutAnimation`
- Re-renders do ecrã pai (confirmado: modais estão fora do `ScrollView` principal)

---

## 2. Causa raiz — Teclado sobre inputs

### Problema principal

Combinação **ineficaz** para bottom sheets:

- `KeyboardAvoidingView` com `keyboardVerticalOffset={8}` — insuficiente dentro de `Modal`
- `ScrollView` simples **sem** auto-scroll ao focus
- Sheet com `maxHeight: 92%` mas sem elevação quando o teclado abre
- Campos no fundo (ex.: notas em Créditos) ficavam atrás do teclado

### Infraestrutura já disponível mas não usada

O projeto já tinha `react-native-keyboard-aware-scroll-view` (usado em `SettingsScreenLayout`) mas o bottom sheet usava `ScrollView` + `KeyboardAvoidingView`.

---

## 3. Solução implementada

### Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `components/layout/DraggableBottomSheet.tsx` | Refactor completo: animações, teclado, scroll |
| `components/layout/BottomSheetScrollContext.tsx` | **Novo** — contexto do scroll para inputs |
| `components/ui/TextField.tsx` | Auto `scrollToFocusedInput` no focus |

### Anti-flicker

1. **`useLayoutEffect`** — posiciona o sheet fora do ecrã **antes** do paint
2. **Opacidade do backdrop independente** (`backdropOpacity`) — fade suave, não ligado ao salto inicial
3. **Abertura com `withTiming(280ms)`** — sem bounce de spring na entrada
4. **Estado inicial `translateY = FALLBACK_SHEET_HEIGHT`** — nunca arranca em 0
5. **Fecho** anima backdrop + sheet em paralelo com `withTiming`

### Teclado premium

1. **`KeyboardAwareScrollView`** substitui `KAV + ScrollView`
   - `enableAutomaticScroll`
   - `enableOnAndroid`
   - `enableResetScrollToCoords={false}` (evita saltos ao fechar teclado)
   - `extraScrollHeight` / `extraHeight` generosos para bottom sheets
2. **Elevação do sheet** via `keyboardOffset` (Reanimated) — o sheet sobe com o teclado (estilo Revolut)
3. **`TextField`** chama `scrollToFocusedInput` no focus quando dentro de um sheet
4. **`keyboardDismissMode="interactive"`** no iOS

### Formulários cobertos (automático)

Todos usam `DraggableBottomSheet` + `TextField`:

- Movimentos (`AddTransactionModal`, `EditTransactionModal`)
- Créditos (`CreditFormModal`)
- Objetivos (`GoalFormModal`)
- Subscrições (`SubscriptionFormModal`)
- Garantias (`WarrantyFormModal`)
- Ativos/Inventário (`InventoryFormModal`)

---

## 4. Riscos restantes

| Risco | Severidade | Nota |
|-------|------------|------|
| Sequência menu `+` → formulário | Média | Ainda há transição dupla (menu fecha, form abre). Evita bloqueio RN; melhoria futura: sheet único com rotas internas |
| `react-native-keyboard-controller` | Baixa | Solução nativa superior; requer novo build (não OTA). Avaliar em build seguinte |
| Inputs `TextInput` directos (sem `TextField`) | Baixa | `KeyboardAwareScrollView` cobre a maioria; auditar se surgirem casos |
| Android `edgeToEdgeEnabled` | Baixa | `softwareKeyboardLayoutMode: resize` já configurado; monitorizar em dispositivos antigos |
| Formulários muito longos (>92% ecrã) | Baixa | Combinação elevação + scroll deve bastar; testar Créditos/notas em iOS e Android |

---

## 5. Checklist de validação manual

- [ ] Abrir/fechar Movimento 10× — sem flash no primeiro frame
- [ ] QuickAdd → Movimento — transição aceitável (pode haver breve gap)
- [ ] Créditos → campo Notas — input sempre visível com teclado aberto
- [ ] Objetivo/Subscrição/Garantia/Ativo — focus em último campo
- [ ] iOS — dismiss interactivo do teclado
- [ ] Android — resize + scroll automático
- [ ] Swipe handle fecha; scroll no form não fecha

---

## 6. Referência técnica — animações

```
Abertura:  translateY: sheetHeight → 0  (timing 280ms)
           backdropOpacity: 0 → 1        (timing 280ms)
Fecho:     translateY: 0 → sheetHeight  (timing 240ms)
           backdropOpacity: 1 → 0        (timing 240ms)
Teclado:   keyboardOffset: 0 → kbHeight - safeArea  (timing = duração do OS)
Pan:       backdrop segue translateY durante drag
```
