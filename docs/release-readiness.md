# Release Readiness — CentFlow

> Auditoria de release para TestFlight / Google Play Closed Testing  
> **Julho 2026** · Verificações executadas no repositório (sem build EAS, sem OTA, sem dispositivo físico)

---

## 1. Resumo

| Área | Estado | Notas |
|------|--------|-------|
| Config Expo/EAS | ✅ Funcional | `app.json`, `app.config.js`, `eas.json` coerentes |
| Builds CI | ✅ Configurado | `release.yml` — IPA unsigned + OTA |
| OTA | ✅ Configurado | Canais `preview` / `production`, `runtimeVersion: appVersion` |
| Assets nativos | ✅ Validados | Ícone 1024×1024, splash com transparência |
| Crash reporting | ⚠️ Condicional | Sentry só activo com `EXPO_PUBLIC_SENTRY_DSN` + rebuild |
| Compliance legal | ❌ Incompleto | Política/termos placeholder, eliminar conta sem UI |
| App Store metadata | ⚠️ Parcial | Screenshots existem mas dimensões podem não cumprir requisitos actuais |
| Performance mobile | ⏳ Não medida | Sem dispositivo/simulador nesta auditoria |

---

## 2. package.json

**Verificado:** `npm test` → 481/481 pass · `npx tsc --noEmit` → 0 erros · `npm ci --dry-run` → OK

| Campo | Valor |
|-------|-------|
| Nome | `centflow` |
| Versão npm | `1.0.0` |
| Entry | `expo-router/entry` |
| Expo SDK | `~56.0.11` |
| React Native | `0.85.3` |
| React | `19.2.3` |

### Scripts de release relevantes

| Script | Função |
|--------|--------|
| `eas:build:beta:ios/android` | Build interno beta |
| `eas:build:production:ios/android` | Build lojas |
| `eas:update:preview/production` | OTA manual |
| `assets:validate-icons` | Valida PNG com alpha real |
| `assets:regenerate-icons` | Regenera ícones |

### Dependências nativas críticas

`@sentry/react-native`, `expo-updates`, `expo-secure-store`, `expo-local-authentication`, `expo-image-picker`, `expo-ocr-kit`, `expo-notifications`, `expo-video`

**Ausente para App Store (social login):** `expo-apple-authentication`

---

## 3. app.json / app.config.js

### Identidade

| Campo | Valor |
|-------|-------|
| Nome produção | CentFlow |
| Nome beta | CentFlow Beta (`app.config.js`) |
| Slug | `centflow` |
| Versão | `1.0.0` |
| Scheme | `centflow` |
| Owner EAS | `manuc98` |
| Project ID | `4014cf35-c2eb-4976-a1ce-5f6bb985652b` |

### iOS

| Campo | Valor |
|-------|-------|
| Bundle ID | `com.everyft1me.centflow` |
| Deployment target | **16.4** (`expo-build-properties`) |
| Tablet | Suportado |
| ITSAppUsesNonExemptEncryption | `false` |

### Android

| Campo | Valor |
|-------|-------|
| Package | `com.everyft1me.centflow` |
| Adaptive icon | `android-icon-foreground.png` + `#0A1628` |
| Edge-to-edge | `true` |
| minSdk | **Não explícito** — default Expo SDK 56 |
| Permissões declaradas | `RECORD_AUDIO`, `CAMERA`, `USE_BIOMETRIC`, `USE_FINGERPRINT` |

⚠️ **`RECORD_AUDIO`** declarada em `app.json` mas **sem uso no código** (grep só encontra `app.json`). Risco em revisão Play Store.

### OTA (expo-updates)

```json
"runtimeVersion": { "policy": "appVersion" },
"updates": {
  "url": "https://u.expo.dev/4014cf35-c2eb-4976-a1ce-5f6bb985652b",
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
}
```

Canal resolvido em `app.config.js` por variant/perfil EAS.

### Plugins

| Plugin | Propósito |
|--------|-----------|
| `expo-router` | Navegação |
| `expo-web-browser` | OAuth browser |
| `expo-build-properties` | iOS 16.4+ |
| `expo-splash-screen` | Splash `#0A1628` |
| `expo-secure-store` | Tokens sessão |
| `expo-local-authentication` | Face ID com copy PT |
| `expo-image-picker` | Câmara + fotos (copy PT) |
| `expo-ocr-kit` | OCR nativo |
| `expo-updates` | OTA |
| `expo-notifications` | Push local |
| `expo-video` | Vídeos onboarding |
| `@sentry/react-native/expo` | Condicional (`SENTRY_ORG` + `SENTRY_PROJECT`) |

### Variáveis injectadas (`extra`)

`appVariant`, `supabaseUrl`, `supabaseAnonKey`, `mockAuth`, `sentryDsn`

Supabase URL/anon key têm fallback hardcoded em `app.config.js` para beta/production.

---

## 4. eas.json

| Perfil | Distribuição | Canal OTA | Mock |
|--------|--------------|-----------|------|
| `development` | internal + dev client | `development` | auth mock `true` |
| `beta` / `preview` | internal, APK Android | `preview` | `false` |
| `preview-simulator` | simulador iOS | `preview` | dev client |
| `production` | store | `production` | `false`, `autoIncrement: true` |

### Submit (`eas submit`)

⚠️ **Placeholders** — não prontos para submissão automatizada:

```json
"appleId": "your-apple-id@example.com",
"ascAppId": "0000000000",
"appleTeamId": "XXXXXXXXXX",
"serviceAccountKeyPath": "./google-service-account.json"
```

Submissão manual ainda possível; `eas submit` automático bloqueado até configurar.

---

## 5. Ambiente (.env.example)

Documenta: Supabase, Google OAuth, mock flags, Sentry DSN, Resend/email secrets, GoCardless.

**Secrets não commitados** — correcto.

**Produção EAS:** variáveis Supabase em `eas.json` perfis beta/production. `EXPO_PUBLIC_SENTRY_DSN` **não** está em `eas.json` — requer secret EAS ou build manual.

---

## 6. Assets

### Validação executada

```bash
npm run assets:validate-icons
# ✅ splash-icon.png — transparência real (1024×1024)
# ✅ android-icon-foreground.png — transparência real (1024×1024)
```

| Ficheiro | Dimensões | Tamanho |
|----------|-----------|---------|
| `assets/images/icon.png` | 1024×1024 | 502 KB |
| `assets/images/splash-icon.png` | 1024×1024 | 53 KB |
| `assets/images/android-icon-foreground.png` | 1024×1024 | 106 KB |
| `assets/images/favicon.png` | — | 3 KB |

### Marketing (no repo)

| Ficheiro | Dimensões |
|----------|-----------|
| `assets/brand/marketing/ios-appstore-screenshot.png` | **720×1280** |
| `assets/brand/marketing/playstore-feature-graphic.png` | presente |
| `assets/brand/marketing/banner-two-phones.jpg` | presente |

⚠️ Screenshot iOS 720×1280 pode **não cumprir** requisitos App Store Connect 2026 (ex.: 1290×2796 para iPhone 6.7"). Verificar antes de submeter.

Bundle externo descrito em `assets/brand/BUNDLE_README.md` — parcialmente replicado no repo.

---

## 7. Versões e versionamento

| Mecanismo | Implementação |
|-----------|---------------|
| Versão app | `app.json` → `1.0.0` |
| Runtime OTA | `policy: appVersion` — OTA só compatível com mesma `version` |
| Auto-increment build | `production` profile `autoIncrement: true` |
| Force update | `lib/security/versionGuard.ts` + tabela `app_config` Supabase |
| Maintenance mode | `app_config.maintenance_mode` |

---

## 8. OTA

| Componente | Ficheiro |
|------------|----------|
| Check ao arranque | `lib/updates/checkForUpdates.ts` |
| Reload seguro | `lib/updates/applyUpdateSafely.ts` |
| Bootstrap | `AppSecurityBootstrap.tsx` |
| CI automático | `.github/workflows/release.yml` (preview + production) |

### Rollback OTA

**Não implementado na app.** Rollback é operacional via EAS Dashboard/CLI. Falha de OTA → app continua com bundle embebido (`fallbackToCacheTimeout: 0`).

---

## 9. Permissões

| Permissão | Quando pedida | Copy | Fallback |
|-----------|---------------|------|----------|
| Face ID | Settings → Segurança | ✅ PT em `app.json` | Login normal |
| Câmara | OCR / talão | ✅ PT | Galeria |
| Fotos | Anexar talão | ✅ PT | Câmara |
| Notificações | Settings + gates locais | implícito | App funciona sem push |
| Biometria Android | Idem iOS | sistema | Password |
| Open Banking | Ligação banco | consentimento explícito | manual |
| Deep links | Email/OAuth/quick-expense | — | navegação normal |

### Problemas

- `RECORD_AUDIO` — declarada, **sem justificação no código**
- **Sem `@react-native-community/netinfo`** — sem detecção proactiva offline

---

## 10. Deep links

| URL | Handler |
|-----|---------|
| `centflow://auth/callback` | Google OAuth |
| `centflow://open-banking/callback` | GoCardless |
| `centflow://quick-expense` | Quick expense |
| `centflow://movimentos?action=...` | Email CTAs |
| `centflow://onboarding` | Email lifecycle |
| Rotas tipadas | `lib/navigation/href.ts` |

Scheme: `centflow` (`app.json`)

---

## 11. Notificações

- Plugin `expo-notifications` configurado
- Settings: `app/settings/notifications.tsx` — toggles push + emails
- Local: garantias, orçamento, sync open banking
- **Novo IPA necessário** para permissões push nativas completas (nota em handoff)

---

## 12. Splash e ícone

| Item | Estado |
|------|--------|
| Splash background | `#0A1628` |
| Splash image | `splash-icon.png`, width 200 |
| App icon | `icon.png` 1024×1024 |
| Android adaptive | foreground + `#0A1628` |
| Alpha validation | ✅ script passou |

`SplashScreen.preventAutoHideAsync()` em `_layout.tsx` — evita flash branco até auth ready.

---

## 13. Builds

### EAS profiles

Prontos para executar (não executados nesta auditoria):

```bash
npm run eas:build:beta:ios
npm run eas:build:beta:android
npm run eas:build:production:ios
npm run eas:build:production:android
```

### CI GitHub Actions

`.github/workflows/release.yml`:

1. `npm ci --dry-run` validate
2. EAS Update preview + production (requer `EXPO_TOKEN`)
3. IPA unsigned iOS beta (macOS, Xcode latest)

Job OTA: `continue-on-error: true` — push não bloqueia se OTA falhar.

---

## 14. Crash safety

| Mecanismo | Estado | Ficheiro |
|-----------|--------|----------|
| Sentry init | Condicional DSN | `lib/sentry/init.ts` |
| Privacy scrubbing | ✅ | `lib/sentry/privacy.ts` |
| Error boundary | ✅ mensagem humana | `app/_layout.tsx` |
| Startup error | ✅ retry | `StartupErrorScreen` |
| Unhandled promise | Sentry auto (se activo) | — |
| Force update | ✅ | `ForceUpdateScreen` |
| OTA failure | log + continua | `applyUpdateSafely.ts` |
| Doctor | beta/dev only | `app/settings/diagnostics.tsx` |

Testes Sentry: `lib/sentry/sentry.test.ts` (incluído em `npm test`)

---

## 15. Compliance (resumo)

Ver `RELEASE_CANDIDATE_REPORT.md` secção Compliance.

| Requisito | Estado |
|-----------|--------|
| Política privacidade | ❌ "Disponível em breve" |
| Termos utilização | ❌ ausente |
| Eliminar conta | ❌ UI placeholder; RPC `delete_own_account()` existe |
| Exportar dados | ✅ JSON v2 |
| Benchmark opt-in | ✅ default OFF |
| Analytics | ⚠️ sem opt-in UI; persiste em Supabase |
| Open Banking | ✅ consentimento + revogação |
| Google Login | ✅ |
| Apple Login | ❌ ausente |
| Emails lifecycle | ✅ backend + opt-out |
| Cookies | N/A (app nativa) |

---

## 16. Performance (medições executadas)

### Medido nesta auditoria

| Métrica | Comando | Resultado |
|---------|---------|-----------|
| Testes unitários | `npm test` | 481 pass, **1445 ms** total |
| Motor 10k tx | `engine-performance.test.ts` | **135.8 ms** (`calculateFinancialState`) |
| Motor pipeline | idem | **219.3 ms** (`recalculateFinancialState`) |
| Bundle iOS export | `npx expo export --platform ios` | **28.6 s**, HBC **12 MB** |

### Não medido (requer dispositivo)

Cold start, warm start, tempo Home/Movimentos/Análises/OCR/Dashboard/Login/Onboarding/Assistente — **sem simulador nem telemóvel ligado**.

---

## 17. Onboarding (análise estática)

| Aspeto | Valor |
|--------|-------|
| Passos | **17** (`STEPS` em `app/onboarding.tsx`) |
| Barra progresso | passos 1–13 |
| Gate pós-login | `OnboardingGateEffect` → redirect se incompleto |
| Registo | `router.replace('/(tabs)')` → gate redirecciona para onboarding |
| Primeira acção | `first_run` + `resolveFirstAction` |
| Bypass dev | `EXPO_PUBLIC_SKIP_ONBOARDING=true` |

**Fricção:** 17 ecrãs antes da app principal — elevada para utilizador novo.

---

## 18. Recuperação de erros (código)

| Cenário | Recuperação |
|---------|-------------|
| Token expirado | `sessionSecurity` + banner login |
| Sessão inválida | limpa cache + redirect auth |
| Internet perdida | `ErrorState` + retry; sem banner global |
| Supabase down | `ErrorState` por ecrã |
| Edge Function OCR | toast + mensagem humanizada |
| Open Banking falha | toast + estado erro em bank-connections |
| Google Login falha | `getAuthErrorMessage` |
| OTA falha | continua com bundle local |

---

## 19. Checklist final release

| Item | Estado |
|------|--------|
| Build Android | ⚠️ scripts prontos, não executado |
| Build iOS | ⚠️ CI + scripts prontos |
| OTA | ✅ configurado + CI |
| Sentry | ⚠️ requer DSN em build |
| Analytics | ⚠️ activo sem consentimento |
| Privacy URL | ❌ |
| Terms URL | ❌ |
| Delete Account | ❌ UI |
| Export Data | ✅ |
| Google Login | ✅ |
| Apple Login | ❌ |
| Emails | ✅ backend |
| Deep Links | ✅ |
| Versionamento | ✅ |
| Crash Recovery | ✅ boundary + Sentry |
| Splash | ✅ |
| App Icon | ✅ 1024×1024 |

---

## 20. Comandos de validação executados

```bash
npm test                                    # 481/481
npx tsc --noEmit                            # 0 erros
npm run assets:validate-icons               # OK
npx expo config --type public               # OK
npm ci --dry-run                            # OK
npx tsx --test lib/domain/financial/engine-performance.test.ts
npx expo export --platform ios              # 28.6s, 12MB HBC
```

**Não executado:** `eas build`, `eas update`, `eas submit`, profiling em dispositivo.

---

*Documento gerado por auditoria estática + comandos locais. Inventário de ecrãs: `docs/beta-screen-audit.md`.*
