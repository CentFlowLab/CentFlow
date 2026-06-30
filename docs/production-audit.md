# Auditoria de Produção — CentFlow

Data: 30 Jun 2026  
Âmbito: prontidão para produção (runtime, TypeScript, segurança, performance, acessibilidade, Supabase, Expo)  
Stack: Expo SDK 56 · React Native 0.85 · React 19 · TanStack Query v5 · Supabase

---

## Resumo executivo

Auditoria completa do repositório CentFlow com verificação automática (`tsc --noEmit`, 117 testes unitários) e revisão manual de ~60 ficheiros críticos.

**Resultado:** a base de código está madura — TypeScript strict, sem `@ts-ignore`/`any`, tratamento de erros consistente nas mutações, e efeitos críticos (auth, realtime, deep links) com cleanup adequado. Foram corrigidos **8 issues** directamente neste PR; os restantes estão documentados por prioridade.

| Prioridade | Encontrados | Corrigidos neste PR | Pendentes |
|------------|-------------|---------------------|-----------|
| P0 Crítico | 2 | 2 | 0 |
| P1 Importante | 7 | 6 | 1 |
| P2 Melhorias | 12 | 0 | 12 |

---

## Verificações realizadas

| Área | Método | Resultado |
|------|--------|-----------|
| TypeScript | `npx tsc --noEmit` | 1 erro → **corrigido** |
| Testes unitários | `npm test` (117 testes) | **117/117 pass** |
| `@ts-ignore` / `any` | grep em `*.{ts,tsx}` | **0 ocorrências** |
| Runtime errors | Error boundaries, safe-analytics, try/catch em mutações | Boa cobertura |
| Memory leaks | Revisão de `useEffect` + RAF/Reanimated | 1 leak → **corrigido** |
| Duplicate fetches | query keys home vs dashboard | **corrigido** |
| Supabase | client, auth, realtime, RLS patterns | Configuração sólida |
| Expo config | `app.json`, `eas.json`, OTA | Correcto |
| Acessibilidade | `accessibilityLabel` em componentes-chave | Parcial (ver P2) |
| Segurança | SecureStore, URL validation, log redaction | 1 gap → **corrigido** |

---

## P0 — Crítico

### P0-1 · Erro TypeScript bloqueia build de produção

**Ficheiro:** `app/settings/shortcuts.tsx`  
**Problema:** ícone SF Symbol `'widgets'` não existe no tipo `SFSymbols7_0` — `tsc --noEmit` falhava.  
**Impacto:** builds EAS/CI com verificação de tipos falham.  
**Correcção:** substituído por `square.grid.2x2.fill` no iOS; Android mantém `widgets`.  
**Estado:** ✅ Corrigido

### P0-2 · Memory leak + loop de animação no HealthScoreCard

**Ficheiro:** `components/analysis/HealthScoreCard.tsx`  
**Problema:**
- `requestAnimationFrame` sem `cancelAnimationFrame` no cleanup → `setState` em componente desmontado
- `displayScore` nas dependências do `useEffect` re-disparava a animação a cada frame

**Impacto:** warnings React, possível crash em dispositivos lentos, consumo CPU desnecessário na aba Análises.  
**Correcção:** ref para valor inicial, flag `cancelled`, cleanup com `cancelAnimationFrame`, deps sem `displayScore`.  
**Estado:** ✅ Corrigido

---

## P1 — Importante

### P1-1 · Fetch duplicado home + dashboard

**Ficheiros:** `hooks/queries/useDashboardData.ts`, `lib/api/keys.ts`  
**Problema:** `useHomeScreenData` (`queryKeys.home`) e `useDashboardData` (`queryKeys.dashboard`) chamavam `fetchHomeScreenData()` em paralelo — duplicando 3–4 requests Supabase quando export-PDF e Home estavam activos.  
**Correcção:** `useDashboardData` passa a usar `queryKeys.home` (cache partilhado). `queryKeys.dashboard` mantido só para invalidação de caches legados OTA.  
**Estado:** ✅ Corrigido

### P1-2 · Deep links de email sem try/catch

**Ficheiro:** `components/app/EmailDeepLinkHandler.tsx`  
**Problema:** `router.push()` ou parse de URL podiam gerar promise rejection não tratada.  
**Correcção:** try/catch com `logAppError('email-deep-link', ...)`.  
**Estado:** ✅ Corrigido

### P1-3 · Abertura de faturas sem validação de URL

**Ficheiros:** `lib/receipt/attach-entity-receipt.ts`, `lib/receipt/open-receipt.ts`  
**Problema:** `WebBrowser.openBrowserAsync(url)` aceitava qualquer string — risco de abrir esquemas não-HTTP se dados corrompidos chegassem à BD.  
**Correcção:** validação `^https?:` antes de abrir.  
**Estado:** ✅ Corrigido

### P1-4 · AttachReceiptButton sem feedback de erro

**Ficheiro:** `components/attachments/AttachReceiptButton.tsx`  
**Problema:** falha ao anexar ou visualizar fatura era silenciosa.  
**Correcção:** toast de erro; cancelamento de picker ignorado (`Seleção cancelada`).  
**Estado:** ✅ Corrigido

### P1-5 · `console.error` em produção fora do sistema de diagnóstico

**Ficheiros:** `lib/insights/safe-analytics.ts`, `hooks/useCentFlowIntelligence.ts`, `components/dashboard/DashboardHeaderLeading.tsx`, `components/analysis/AnalysisErrorBoundary.tsx`, `lib/api/services/liabilities-fetch.ts`  
**Problema:** erros de analytics/intelligence iam para `console.error`/`console.warn` em vez de `logAppError`/`logAppEvent` — inconsistente com o pipeline de diagnóstico (redacção de secrets, export).  
**Correcção:** migrado para `logAppError` / `logAppEvent`.  
**Estado:** ✅ Corrigido

### P1-6 · Código morto do template Expo

**Ficheiros removidos:**
- `components/useColorScheme.ts` / `.web.ts`
- `components/useClientOnlyValue.ts` / `.web.ts`
- `lib/haptics/light-impact.ts` (zero imports; duplicava `lib/ui/haptics.ts`)

**Export removido:** `ChangePasswordModal` do barrel `components/settings/index.ts` (deprecated, zero consumidores).

**Estado:** ✅ Corrigido

### P1-7 · Migrations Supabase pendentes em produção

**Problema:** várias migrations SQL documentadas em `handoff.config.json` ainda não aplicadas (`merchant`, `merchant_groups`, `credit_commission_rate`).  
**Impacto:** features de merchant matching e comissão de amortização podem falhar em runtime.  
**Acção:** aplicar `supabase db push` antes de beta público.  
**Estado:** ⏳ Pendente (infra, não código)

---

## P2 — Melhorias

### P2-1 · Feature Contas desactivada mas código presente

`ACCOUNTS_FEATURE_ENABLED = false` em `lib/config/product-features.ts`. O ecrã `app/(tabs)/contas.tsx` existe mas a tab está oculta (`href: null`) e não há links de navegação.  
**Recomendação:** remover ou activar com flag quando backend estiver pronto.

### P2-2 · Analytics não ligado a provider real

`lib/analytics/analytics.service.ts` — apenas `console.log` em `__DEV__`. TODO explícito para PostHog/Supabase.  
**Recomendação:** integrar antes de métricas de produto em produção.

### P2-3 · Widgets nativos não implementados

`lib/widgets/widget-data.ts` — hook `useWidgetSnapshot` definido mas nunca usado.  
**Recomendação:** implementar ou remover até haver build nativo dedicado.

### P2-4 · Haptics são no-op em OTA

`lib/ui/haptics.ts` — intencional para builds OTA-only sem `expo-haptics`.  
**Recomendação:** activar no próximo IPA nativo.

### P2-5 · Acessibilidade parcial

Componentes críticos (swipe rows, heatmap, tab bar) têm `accessibilityLabel` em ~50 locais, mas faltam em:
- chips de filtro de Movimentos (só texto visual)
- gráficos SVG (HealthScoreCard, DonutChart) — sem `accessibilityRole`/`accessibilityValue`
- botões de swipe (ações escondidas)

**Recomendação:** audit VoiceOver/TalkBack antes de App Store.

### P2-6 · `RECORD_AUDIO` no Android sem uso aparente

`app.json` declara `android.permission.RECORD_AUDIO` mas não há gravação de áudio no código.  
**Recomendação:** remover permissão se não for necessária (melhora review Play Store).

### P2-7 · Duplicação de UI de perfil

`app/(tabs)/perfil.tsx` (ecrã completo) vs `ProfileMenuSheet` (sheet rápido).  
**Recomendação:** unificar UX numa única entrada.

### P2-8 · `ChangePasswordModal` deprecated

Ficheiro `components/settings/ChangePasswordModal.tsx` mantido mas não exportado. Password change está em `app/settings/security.tsx`.  
**Recomendação:** eliminar ficheiro no próximo cleanup.

### P2-9 · Aliases deprecated em assets

`AddGoalModal`, `AddWarrantyModal` — aliases sem consumidores.  
**Recomendação:** remover.

### P2-10 · npm audit — 29 vulnerabilidades em devDependencies

Majoritariamente em `eas-cli` e dependências transitivas (`glob`, `tar`, `uuid`). Não afectam runtime da app.  
**Recomendação:** `npm audit fix` periódico; não forçar breaking changes perto do beta.

### P2-11 · Copiar URL nos atalhos usa Share em vez de Clipboard

Documentado em handoff — `expo-clipboard` requer novo IPA.  
**Recomendação:** adicionar no próximo build nativo.

### P2-12 · Error boundaries por secção apenas em Análises

`AnalysisErrorBoundary` protege secções individuais. Home, Movimentos e Ativos dependem do boundary global do Expo Router.  
**Recomendação:** considerar boundaries por tab se crashes localizados forem reportados.

---

## Áreas verificadas sem issues críticos

### Runtime & crashes
- Root `ErrorBoundary` com `logAppError` e ecrã de retry
- `safe-analytics.ts` envolve todos os cálculos de insights
- `useCentFlowIntelligence` com fallback seguro
- Mutations (movimentos, OCR, créditos) com try/catch + toast

### State management
- TanStack Query com `enabled: isAuthenticated`
- Invalidação centralizada (`invalidate-queries.ts`, `transaction-invalidation.ts`)
- Auth context com `mounted` guard e cleanup de subscriptions

### Async race conditions
- `RemoteDataSyncEffect` — `cancelled` flag + cleanup timeout/subscription
- `QuickExpenseLinkHandler` — dedupe de URL (1.5s), `savingRef` mutex
- `auth/callback.tsx` — `mounted` guard + `handledRef`
- `BiometricGate` — aprovação por sessão, distinção inactive vs background

### Navigation & safe area
- `SafeAreaProvider` com `initialWindowMetrics` no root
- Tab bar com `resolveTabBarBottomInset` (57 testes de layout)
- Settings screens com `KeyboardAwareScrollView` + `paddingBottom` dinâmico
- Modais com `resolveModalBottomPadding` / `resolveSheetBottomPadding`

### Keyboard handling
- `useKeyboardVisible` esconde tab bar
- Formulários em modais usam `KeyboardAwareScrollView` ou `keyboardShouldPersistTaps="handled"`
- `softwareKeyboardLayoutMode: "resize"` no Android

### Supabase
- Cliente singleton com SecureStore adapter
- `tryGetSupabaseClient()` para degradação graciosa
- Realtime sync com invalidação de 6 tabelas
- Auth: `restoreSession` com signOut em perfil inválido
- Tipos gerados em `database.types.ts`

### Expo configuration
- `runtimeVersion: { policy: "appVersion" }` — OTA seguro
- `typedRoutes: true`
- Plugins correctos (SecureStore, LocalAuthentication, ImagePicker, OCR)
- `newArchEnabled: false` — estável para produção actual

### Security
- Tokens em SecureStore (não AsyncStorage)
- Redacção de secrets nos logs (`app-log.ts`)
- Password policy com Zod (12+ chars, weak list)
- Biometric gate com escape de emergência
- `Stack.Protected` para rotas autenticadas

### Loading & error states
- Todas as 5 tabs principais: `isLoading` + `isError` + retry
- `QueryScreenState` disponível em `components/ui`
- Home mostra aviso quando `liabilitiesLoadFailed`

---

## Ficheiros alterados neste PR

| Ficheiro | Alteração |
|----------|-----------|
| `app/settings/shortcuts.tsx` | Fix ícone SF Symbol (P0) |
| `components/analysis/HealthScoreCard.tsx` | RAF cleanup (P0) |
| `hooks/queries/useDashboardData.ts` | Cache partilhado com home (P1) |
| `lib/api/keys.ts` | Deprecation note em dashboard key |
| `components/app/EmailDeepLinkHandler.tsx` | try/catch deep links (P1) |
| `components/attachments/AttachReceiptButton.tsx` | Error toasts (P1) |
| `lib/receipt/attach-entity-receipt.ts` | URL validation (P1) |
| `lib/receipt/open-receipt.ts` | URL validation (P1) |
| `lib/insights/safe-analytics.ts` | logAppError (P1) |
| `hooks/useCentFlowIntelligence.ts` | logAppError (P1) |
| `components/dashboard/DashboardHeaderLeading.tsx` | logAppError (P1) |
| `components/analysis/AnalysisErrorBoundary.tsx` | Remove console duplicado (P1) |
| `lib/api/services/liabilities-fetch.ts` | logAppEvent (P1) |
| `components/settings/index.ts` | Remove export morto (P1) |
| `components/useColorScheme*.ts` | Removidos (P1) |
| `components/useClientOnlyValue*.ts` | Removidos (P1) |
| `lib/haptics/light-impact.ts` | Removido (P1) |

---

## Validação pós-deploy

- [ ] `npx tsc --noEmit` — 0 erros
- [ ] `npm test` — 117/117
- [ ] Abrir Atalhos rápidos (Definições) — ícone renderiza
- [ ] Aba Análises — score anima sem warnings no console
- [ ] Exportar PDF — não duplica loading (cache partilhado)
- [ ] Anexar fatura em garantia — erro visível se falhar
- [ ] Deep link `centflow://...` de email — navega sem crash

---

## Conclusão

A app está **pronta para beta controlado** após aplicar as migrations Supabase pendentes (P1-7). Os fixes deste PR eliminam o único erro de compilação TypeScript, um memory leak real, fetches duplicados e gaps de segurança/feedback em anexos de faturas. As melhorias P2 são evolutivas e não bloqueiam release OTA.
