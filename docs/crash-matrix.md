# Crash Matrix — CentFlow RC1

> Mapeamento **estático** de riscos de crash por fluxo — Julho 2026  
> **Nenhum crash foi reproduzido em dispositivo** nesta documentação.  
> Validar coluna «Validado device» durante a campanha.

Legenda **Impacto**: `Crítico` (perda dados / bloqueio) · `Alto` · `Médio` · `Baixo`  
Legenda **Doctor**: visível em `settings/diagnostics` (variant beta/dev)  
Legenda **Sentry**: activo só com consentimento crash + `EXPO_PUBLIC_SENTRY_DSN` no build

---

## Legenda de recuperação

| Código | Significado |
|--------|-------------|
| R-EB | ErrorBoundary root — retry |
| R-ES | StartupErrorScreen — retry bootstrap |
| R-ERR | ErrorState ecrã + retry |
| R-TOAST | Toast erro humanizado |
| R-LOGIN | Redirect login / sessão limpa |
| R-SILENT | Falha silenciosa (fire-and-forget) |
| R-NONE | Sem recuperação explícita |

---

## 1. Arranque e bootstrap

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| Cold start | Native module missing (Sentry/OCR/Apple) | ✅ init warn | Condicional | R-ES / crash nativo | Crítico | — |
| Auth bootstrap | Supabase unreachable | ✅ | ✅ | R-ES | Alto | — |
| Privacy consent gate | SecureStore fail | ✅ | ✅ | Modal bloqueia | Médio | — |
| Version guard / force update | fetch app_config fail | ✅ security | ✅ | Defaults permissivos | Baixo | — |
| OTA check | Updates.check fail | ✅ | ✅ | R-SILENT — continua | Baixo | — |
| BiometricGate | LocalAuthentication error | ✅ | ✅ | Fallback login | Baixo | — |

---

## 2. Autenticação

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| Login email | API 401/500 | ✅ api-fetch | ✅ | R-TOAST | Médio | — |
| Google OAuth | redirect_uri_mismatch | ✅ auth | ✅ | R-TOAST | Alto | — |
| Google callback | URL parse fail | ✅ | ✅ | R-TOAST + login | Alto | — |
| Apple Sign-In | identityToken null | ✅ | ✅ | R-TOAST | Alto | — |
| Apple cancel | ERR_REQUEST_CANCELED | — | — | R-SILENT | Baixo | — |
| Registo | email rate limit | ✅ | ✅ | R-TOAST | Médio | — |
| Sessão expirada | TOKEN_REFRESHED fail | ✅ security | ✅ | R-LOGIN | Alto | — |
| Reset password | link inválido | ✅ | ✅ | R-TOAST | Médio | — |

---

## 3. Movimentos e motor financeiro

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| Lista movimentos | Query fail | ✅ RQ | ✅ | R-ERR | Alto | — |
| Criar movimento | Mutation fail | ✅ doctor:mutation | ✅ | R-TOAST | Alto | — |
| Editar movimento | Optimistic rollback fail | ✅ | ✅ | R-TOAST + rollback | Alto | — |
| Eliminar movimento | Idem | ✅ | ✅ | Idem | Alto | — |
| Motor 10k+ tx | JS thread block | ✅ perf traces | ✅ | Spinner longo | Médio | — |
| Import CSV | Parse error | ✅ | ✅ | R-TOAST | Médio | — |

---

## 4. OCR

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| Câmara permissão negada | picker error | ✅ movement-flow | ✅ | R-TOAST | Médio | — |
| Upload receipt | Edge Function 5xx | ✅ | ✅ | R-TOAST | Alto | — |
| OCR timeout | polling fail | ✅ | ✅ | R-TOAST — manual entry | Alto | — |
| Confirm modal | Image URI inválido | ✅ | ✅ | R-TOAST | Médio | — |
| expo-ocr-kit nativo | Module missing (unsigned IPA) | ✅ | ✅ | Fallback manual | Alto | — |

---

## 5. Tabs e análises

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| Home | fetchHomeScreenData fail | ✅ RQ | ✅ | R-ERR + skeleton | Alto | — |
| Análises | fetchAnalysisData fail | ✅ | ✅ | R-ERR | Alto | — |
| Créditos | liabilities fail | ✅ | ✅ | R-ERR | Alto | — |
| Ativos | assets fail | ✅ | ✅ | R-ERR | Médio | — |
| Calendário | projection calc edge | ✅ financial | ✅ | R-ERR | Médio | — |
| Assistente | Edge Function fail | ✅ | ✅ | R-TOAST humanizado | Médio | — |

---

## 6. Open Banking

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| List institutions | gocardless EF fail | ✅ | ✅ | R-ERR | Médio | — |
| OAuth browser | user cancel | — | — | R-TOAST | Baixo | — |
| Callback finalize | requisition expired | ✅ | ✅ | R-TOAST | Alto | — |
| Sync import | duplicate / parse | ✅ | ✅ | R-TOAST parcial | Médio | — |
| Revoke | EF fail | ✅ | ✅ | R-TOAST | Médio | — |

---

## 7. Conta e compliance

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| Export JSON | Sharing unavailable | ✅ | ✅ | R-TOAST | Médio | — |
| Export PDF | Print fail | ✅ | ✅ | R-TOAST | Médio | — |
| Delete account | RPC fail | ✅ | ✅ | R-TOAST — conta mantém-se | Crítico | — |
| Delete account success | signOut fail | ✅ | ✅ | R-LOGIN forçado | Alto | — |
| Toggle consent | SecureStore fail | ✅ | ✅ | R-TOAST | Baixo | — |

---

## 8. Sistema e navegação

| Fluxo | Crash possível | Doctor | Sentry | Recuperação | Impacto | Validado device |
|-------|----------------|--------|--------|-------------|---------|-----------------|
| Deep link inválido | router 404 | — | — | +not-found | Baixo | — |
| Quick expense link | parse fail | ✅ | ✅ | R-SILENT | Baixo | — |
| OTA reload mid-action | criticalAction defer | ✅ security | ✅ | R-SILENT — reload later | Médio | — |
| Background → foreground | invalidate storm | ✅ RQ | ✅ | R-SILENT refetch | Baixo | — |
| Kill + reopen | corrupt SecureStore | ✅ | ✅ | R-LOGIN | Alto | — |
| Unhandled promise | global rejection | ✅ unhandled-rejection | ✅* | R-SILENT / crash | Crítico | — |
| JS fatal error | ErrorBoundary | ✅ error-boundary | ✅* | R-EB | Crítico | — |

\* Sentry só se consentimento crash + DSN configurado.

---

## 9. Riscos conhecidos (código — não validados em device)

| ID | Risco | Ficheiro | Impacto potencial |
|----|-------|----------|-------------------|
| C1 | Race auth listener cleanup | `auth.context.tsx` | Sessão fantasma rara |
| C2 | Race realtime subscribe | `RemoteDataSyncEffect.tsx` | Channel órfão |
| C3 | OAuth polling pós-unmount | `auth/callback.tsx` | setState warning |
| C4 | Sem NetInfo — offline tardio | global | UX confusa, não crash |

---

## Critério de saída crash matrix

| Nível | Regra |
|-------|-------|
| RC1 interno | Zero crashes **Críticos** reproduzidos sem workaround |
| TestFlight Internal | Idem + Sentry recebe pelo menos 1 test crash (staging) se DSN activo |
| Release público | Taxa crash-free sessions > 99% (métrica pós-beta) |

---

## Referências

- `lib/diagnostics/app-log.ts` — `installGlobalDiagnostics`, `logAppError`
- `app/_layout.tsx` — `ErrorBoundary`
- `lib/sentry/init.ts` — consent-gated init
