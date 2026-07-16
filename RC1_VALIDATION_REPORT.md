# RC1 Validation Report — CentFlow

> Validação Release Candidate 1 — Julho 2026  
> **Auditoria estática + comandos locais** · Sem build EAS · sem OTA · sem dispositivo físico  
> **Sem commit · sem push**

---

## Resumo executivo

A base técnica do RC1 está **sólida**: 487 testes verdes, TypeScript 0 erros, compliance implementado no código, EAS configurado, e padrões de cleanup de listeners majoritariamente correctos.

**Nenhum cenário de runtime móvel foi validado em dispositivo** neste sprint (cold start, Face ID, Apple Sign-In nativo, notificações, FPS, tempos de ecrã). A auditoria cobre **código + medições Node/Metro**, não UX real em iPhone/Android.

**Recomendação: 🟡 RC1 INTERNO** — pode criar build EAS amanhã para TestFlight Internal / Play Closed Testing **após** smoke test manual em dispositivo. **Não** RC1 APROVADO sem matriz de dispositivo.

---

## Comandos executados

| Comando | Resultado |
|---------|-----------|
| `npm test` | **487/487** pass · 1466 ms |
| `npx tsc --noEmit` | **0 erros** |
| `engine-performance.test.ts` | 242 ms / 232 ms (10k tx) |
| `npx expo export --platform ios` | **27.6 s** · HBC **12.2 MB** |
| `npm run assets:validate-icons` | ✅ alpha real splash + android foreground |
| `npx expo config --type public` | ✅ v1.0.0, portrait, usesAppleSignIn, runtimeVersion appVersion |

**Não executado:** `eas build`, profiling em dispositivo, TestFlight upload, Play Console.

---

## 1. Auditoria runtime

Legenda: **Código** = fluxo implementado em código · **Runtime** = validado em dispositivo neste sprint.

| Cenário | Código | Runtime | Evidência / notas |
|---------|--------|---------|-------------------|
| Cold start | ✅ | ⏳ **Dispositivo** | `SplashScreen.preventAutoHideAsync`, `AuthProvider` bootstrap, `AppSecurityBootstrap` |
| Warm start | ✅ | ⏳ Dispositivo | Cache TanStack + sessão Supabase `restoreSession` |
| Retorno background | ✅ | ⏳ Dispositivo | `RemoteDataSyncEffect` AppState → `invalidateAllRemoteData` |
| Kill + reopen | ✅ | ⏳ Dispositivo | SecureStore token + `restoreSession` |
| Mudança de conta | ✅ | ⏳ Dispositivo | `signOut` + `queryClient.clear()` + novo login |
| Logout / login | ✅ | ⏳ Dispositivo | `auth.context.tsx` L161–186 |
| Sessão expirada | ✅ | ⏳ Dispositivo | `subscribeToAuthSessionChanges` + banner login |
| Token inválido | ✅ | ⏳ Dispositivo | `getSession` falha → `clearSession` |
| OTA disponível | ✅ | ⏳ Dispositivo | `checkForUpdates` + `reloadIfUpdatePending` em `AppSecurityBootstrap` |
| OTA falhada | ✅ | ⏳ Dispositivo | `applyUpdateSafely` → `reason: apply_failed`, app continua |
| Build incompatível | ✅ | ⏳ Dispositivo | `runtimeVersion: appVersion` + `ForceUpdateScreen` |
| Perda de internet | ⚠️ | ⏳ Dispositivo | Sem NetInfo; `ErrorState` + retry por ecrã |
| Recuperação automática | ⚠️ | ⏳ Dispositivo | Refetch on reconnect (RQ); sem banner offline global |

### Riscos runtime (código)

| ID | Risco | Ficheiro |
|----|-------|----------|
| R1 | Race async auth listener cleanup | `lib/auth/auth.context.tsx` L97–122 |
| R2 | Race async Supabase realtime subscribe | `components/app/RemoteDataSyncEffect.tsx` L24–29 |
| R3 | OAuth callback polling continua após unmount | `app/auth/callback.tsx` |

---

## 2. Auditoria memória

| Categoria | Resultado | Detalhe |
|-----------|-----------|---------|
| AppState listeners | ✅ Cleanup | 4 ficheiros, todos `subscription.remove()` |
| Linking listeners | ✅ Cleanup | EmailDeepLink, QuickExpense, reset-password |
| Keyboard / BackHandler | ✅ Cleanup | DraggableBottomSheet, ConfirmReceiptModal |
| Auth Supabase listener | ⚠️ Médio | Race async no cleanup (`auth.context.tsx`) |
| Realtime Supabase | ⚠️ Médio | Race no delay 1.5s (`RemoteDataSyncEffect`) |
| TanStack Query cache | ⚠️ Médio | `financial-engine` gcTime `Infinity` |
| Reanimated | ✅ Baixo | Sem `cancelAnimation`; padrão normal RN |
| setTimeout órfãos | ⚠️ Baixo | Toast provider, DraggableBottomSheet scroll |
| Notification listeners | N/A | Sem `addNotification*Listener` em componentes |

**Nenhum leak de risco alto** identificado em auditoria estática.

---

## 3. Auditoria queries

### Config global (`lib/api/queryClient.ts`)

| Opção | Valor |
|-------|-------|
| staleTime | 2 min |
| gcTime | 30 min |
| retry (queries) | 2 |
| retry (mutations) | 1 |
| refetchOnReconnect | true |
| refetchOnWindowFocus | true (default v5) |
| onError | `logAppError` em QueryCache + MutationCache |

### Achados prioritários

| ID | Achado | Severidade |
|----|--------|------------|
| Q1 | `['home']` e `['dashboard']` — mesmo `fetchHomeScreenData`, caches separados | Alta (performance) |
| Q2 | `fetchAnalysisData` / `fetchFinancialProfile` ignoram cache granular | Alta |
| Q3 | Open Banking sync invalida só `transactions()`, não home/analytics | Média |
| Q4 | `['active-sessions']` sem invalidação | Média |
| Q5 | `invalidateAllRemoteData` parcial (não cobre liabilities, profile, etc.) | Média |
| Q6 | Over-invalidation em mutações financeiras + motor | Média (aceitável RC1) |
| Q7 | `usePatrimonyAllocation` — hook sem consumidores | Baixa |

### Optimistic + rollback

| Local | Estado |
|-------|--------|
| Update/delete transacção | ✅ patch + rollback + invalidate |
| Import CSV | ✅ |
| Preferências | ✅ merge + rollback tema |
| Create transacção | ❌ sem optimistic (só invalidate) |

---

## 4. Auditoria segurança

| Item | Estado | Validação |
|------|--------|-----------|
| SecureStore (token, consent, biometria) | ✅ Código | `lib/auth/storage.ts`, `secureStorage.ts` |
| Logout limpa sessão + cache | ✅ Código | `queryClient.clear()`, `resetAnalytics` |
| Delete account | ✅ Código | RPC + limpeza local (`delete-account.service.ts`) |
| Apple Login | ✅ Código | `signInWithIdToken` — **⏳ dispositivo iOS** |
| Google Login | ✅ Código | OAuth browser — **⏳ dispositivo** |
| JWT / refresh | ✅ Código | Supabase SDK `autoRefreshToken` |
| Deep links | ✅ Código | `centflow://` handlers |
| OAuth callback | ✅ Código | `auth/callback.tsx` |
| Doctor | ✅ Código | beta/dev only; sem PII |
| Sentry | ✅ Código | Opt-in consent; scrubbing `privacy.ts` |
| Analytics | ✅ Código | Opt-in; sem persistência sem consentimento |
| Biometria | ✅ Código | `BiometricGate` — **⏳ Face ID dispositivo** |

**Sem Universal Links / Associated Domains** no repo (só custom scheme `centflow://`).

---

## 5. Auditoria UI

| Item | Estado | Notas |
|------|--------|-------|
| Dark mode | ✅ | `userInterfaceStyle: dark` + tema único |
| Landscape | ✅ Bloqueado | `orientation: portrait` |
| Tablets iOS | ⚠️ | `supportsTablet: true` — **layout não auditado em iPad** |
| Safe Areas | ✅ Código | `SafeAreaProvider`, `ScreenContainer` |
| Teclado | ✅ Código | `KeyboardAvoidingView`, `DraggableBottomSheet` keyboard listeners |
| BottomSheet | ✅ Código | `DraggableBottomSheet` — gesture + back handler |
| Dynamic Type | ⚠️ | `allowFontScaling={false}` em onboarding premium — pode prejudicar acessibilidade |
| VoiceOver / TalkBack | ⏳ | `accessibilityLabel` em ~55 ficheiros — **sem teste manual** |
| Contraste | ⏳ | Tema dark premium — **sem auditoria WCAG automatizada** |

---

## 6. Auditoria performance

### Medido (Node/Metro — não dispositivo)

| Métrica | Valor | Comando |
|---------|-------|---------|
| Suite testes | 1466 ms | `npm test` |
| Motor 10k tx (`calculateFinancialState`) | **242 ms** | `engine-performance.test.ts` |
| Motor pipeline (`recalculateFinancialState`) | **232 ms** | idem |
| Bundle iOS HBC | **12.2 MB** | `npx expo export --platform ios` |
| Tempo export Metro | **27.6 s** | idem |

### Não medido — requer dispositivo físico

| Ecrã / acção | Estado |
|--------------|--------|
| Home mount time | ⏳ |
| Movimentos | ⏳ |
| Análises | ⏳ |
| OCR abertura | ⏳ |
| Objetivos / Créditos / Perfil | ⏳ |
| Assistente | ⏳ |
| Calendário | ⏳ |
| Open Banking fluxo | ⏳ |
| Render count / FPS | ⏳ |
| Navegação entre tabs | ⏳ |
| Cold / warm start | ⏳ |

**Nota:** Q1/Q2 (queries duplicadas) podem impactar tempo de ecrã em dispositivo — validar no smoke test.

---

## 7. Auditoria observabilidade

| Canal | Cobertura | Gaps |
|-------|-----------|------|
| **Doctor** (`logAppError`) | API fetch, RQ queries/mutations, security, doctor traces, unhandled rejection | Só visível em beta/dev diagnostics |
| **Sentry** | Error boundary, init condicional consent | Sem DSN em build = sem telemetria produção |
| **ErrorBoundary** | Root `_layout.tsx` | Mensagem humana + retry |
| **StartupErrorScreen** | Auth bootstrap + version guard | ✅ |
| **Analytics console** | `__DEV__` only | ✅ |

### Erros silenciosos potenciais

| Local | Comportamento |
|-------|---------------|
| `analytics.service.ts` insert fail | Fire-and-forget; só `console.warn` em `__DEV__` |
| SplashScreen `.catch(() => {})` | Intencional — não bloqueia arranque |
| Realtime sync fail | `console.warn` em `__DEV__` apenas |

**Conclusão:** erros críticos de utilizador passam por `ErrorState`/toast; erros técnicos vão para Doctor (beta) ou Sentry (se consent + DSN). **Validação em dispositivo pendente** para confirmar que crashes nativos chegam ao Sentry.

---

## 8. Auditoria App Store

| Item | Estado |
|------|--------|
| App Icon 1024×1024 | ✅ Validado |
| Splash `#0A1628` | ✅ |
| Adaptive Icon Android | ✅ alpha validado |
| Notification icon | ✅ `expo-notifications` plugin |
| Permissions | ✅ CAMERA; Face ID copy; RECORD_AUDIO removido |
| Version 1.0.0 | ✅ |
| Build number | ⏳ `autoIncrement` production — definido no EAS build |
| runtimeVersion | ✅ `appVersion` policy |
| Privacy / Terms in-app | ✅ `/legal/*` |
| Delete Account | ✅ |
| Apple Login | ✅ código; **⏳ build nativo + dispositivo** |
| Metadata | ✅ `docs/store/` |
| Deep links | ✅ `centflow://` |
| Associated Domains | ❌ Não configurado |
| URL pública política | ⏳ Bloqueador loja pública |
| Conta demo revisores | ⏳ Pendente |
| Revisão jurídica | ⏳ Bloqueador submissão pública |

---

## 9. Auditoria Build

| Item | Estado |
|------|--------|
| EAS profiles (dev/beta/production) | ✅ `eas.json` |
| Expo SDK 56 | ✅ |
| Plugins nativos | expo-apple-authentication, ocr-kit, notifications, sentry (condicional), updates |
| `expo-apple-authentication` | ✅ package.json + app.json — **novo IPA obrigatório** |
| Google OAuth | ✅ Supabase + env em eas.json |
| Expo Updates | ✅ projectId + canais preview/production |
| CI GitHub Release | ✅ OTA + IPA unsigned |
| `eas submit` | ⚠️ Placeholders Apple/Google |
| `EXPO_PUBLIC_SENTRY_DSN` | ⚠️ Não em eas.json — secret manual |

**Build amanhã (recomendado):**
```bash
npm run eas:build:beta:ios
npm run eas:build:beta:android
```

---

## 10. Problemas encontrados

| ID | Problema | Severidade | Corrigido neste sprint |
|----|----------|------------|------------------------|
| P1 | Runtime móvel não validado | Alta (processo) | ❌ Adiado — smoke test dispositivo |
| P2 | Sem banner offline / NetInfo | Média | ❌ Adiado |
| P3 | Race auth listener cleanup | Média | ❌ Adiado (fora âmbito) |
| P4 | home/dashboard query duplicada | Média | ❌ Adiado (não optimizar) |
| P5 | Open Banking invalidação incompleta | Média | ❌ Adiado |
| P6 | active-sessions sem invalidate | Baixa | ❌ Adiado |
| P7 | Dynamic Type desactivado em onboarding | Baixa | ❌ Adiado |
| P8 | URL política pública + revisão jurídica | Bloqueador loja | ❌ Adiado |
| P9 | Conta teste App Review | Média | ❌ Adiado |
| P10 | Tempos de ecrã não medidos | Alta (processo) | ❌ Adiado |

---

## 11. Problemas corrigidos

**Nenhum** — este sprint foi apenas validação, sem alterações de código.

---

## 12. Problemas adiados (pós-RC1 interno)

1. Matriz smoke test iPhone + Android (checklist abaixo)
2. Medição Flipper/Reactotron por tab
3. URL pública política + revisão jurídica
4. Conta demo para revisores
5. Fix race listeners (auth + realtime) se reproduzir em QA
6. Banner offline (NetInfo)
7. Consolidar home/dashboard query (performance, não RC1 blocker)

---

## 13. Checklist final

### Pode impedir TestFlight Internal?

| Bloqueador técnico? | Resposta |
|---------------------|----------|
| Código não compila | **Não** — tsc 0 erros |
| Testes falham | **Não** — 487/487 |
| Build EAS impossível | **Não** — perfis configurados |
| Apple Sign-In sem plugin | **Não** — plugin adicionado; **requer novo build** |
| Falta delete account | **Não** — implementado |

**Conclusão TestFlight Internal:** **Não há motivo técnico no código para impedir** upload a TestFlight Internal, desde que:
- Seja criado **novo build nativo** (Apple Auth + plugins)
- Smoke test manual em iPhone confirme login/OAuth/delete account
- Revisão jurídica **não bloqueia** teste interno (só submissão externa)

### Pode impedir Google Play Closed Testing?

**Não há motivo técnico no código para impedir** Closed Testing, com as mesmas ressalvas:
- Build APK/AAB via `eas:build:beta:android`
- Data Safety form a preencher no Play Console
- Smoke test em Android

### Smoke test obrigatório em dispositivo (antes de distribuir)

- [ ] Cold start → login → onboarding gate → tabs
- [ ] Google Login (SHA-1 Android se aplicável)
- [ ] Apple Login (iOS build nativo)
- [ ] Criar / editar / apagar movimento
- [ ] OCR talão (com Vision key ou nativo)
- [ ] Open Banking ligar + sync
- [ ] Logout → login outra conta
- [ ] Eliminar conta (conta de teste)
- [ ] Consentimento analytics — toggle off → verificar sem eventos
- [ ] Perda de rede → ErrorState + retry
- [ ] OTA num build preview (opcional RC1)

---

## 14. Scores

| Dimensão | Score | Notas |
|----------|-------|-------|
| Financial Core | **95** | 487 testes; motor 242ms/10k |
| Architecture | **94** | ↓1 query duplication |
| Type Safety | **100** | tsc 0 erros |
| Performance | **72** | Bundle 12MB; ecrãs não medidos |
| Security | **86** | Código sólido; device QA pendente |
| Compliance | **78** | In-app OK; URL jurídica pendente |
| Release Readiness | **80** | ↓2 sem device matrix |

---

## 15. Recomendação

| Nível | Veredicto |
|-------|-----------|
| ❌ BLOQUEAR RC | **Não** |
| 🟡 **RC1 INTERNO** | **Sim** — próximo passo correcto |
| 🟢 TestFlight Internal | **Sim, após build + smoke test dispositivo** |
| 🟢 Google Play Closed Testing | **Sim, após build + smoke test dispositivo** |
| 🟢 RC1 APROVADO | **Não** — falta matriz dispositivo + itens legais para loja pública |

---

## Documentos relacionados

- [`COMPLIANCE_RELEASE_REPORT.md`](COMPLIANCE_RELEASE_REPORT.md)
- [`RELEASE_CANDIDATE_REPORT.md`](RELEASE_CANDIDATE_REPORT.md)
- [`docs/store/app-review-checklist.md`](docs/store/app-review-checklist.md)
- [`docs/release-process.md`](docs/release-process.md)

---

*Relatório gerado por auditoria estática. Nenhum item de runtime móvel foi marcado como validado sem execução em dispositivo físico.*
