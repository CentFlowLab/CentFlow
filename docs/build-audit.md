# Build Audit — CentFlow RC2

> Auditoria estática EAS/Expo/Supabase — Julho 2026  
> **Nenhum build EAS foi criado neste sprint.**

Validação executada:
```
npm test                    → 487/487 PASS
npx tsc --noEmit            → 0 erros
expo config --type public   → OK (local + EAS_BUILD_PROFILE=beta)
```

---

## 1. eas.json

| Item | Valor | Estado |
|------|-------|--------|
| CLI version | `>= 16.0.0` | ✅ |
| appVersionSource | `remote` | ✅ (production auto-increment) |
| Project ID | `4014cf35-c2eb-4976-a1ce-5f6bb985652b` | ✅ em `app.json` |

### Perfis

| Perfil | distribution | channel | Android | Uso |
|--------|--------------|---------|---------|-----|
| `development` | internal | development | default | Dev client — **requer `expo-dev-client`** (não instalado) |
| `beta` | internal | preview | `apk` | **Build beta alvo** — sideload / EAS internal link |
| `preview` | extends beta | preview | apk | Alias beta |
| `preview-real` | extends beta | preview | apk | Alias beta |
| `preview-simulator` | internal | preview | — | Simulador iOS |
| `production` | default (store) | production | default (aab) | Lojas + TestFlight + Play |

### Env beta (verificado)

| Variável | Valor |
|----------|-------|
| `EXPO_PUBLIC_APP_VARIANT` | `beta` |
| `EXPO_PUBLIC_MOCK_AUTH` | `false` |
| `EXPO_PUBLIC_USE_MOCK` | `false` |
| `EXPO_PUBLIC_MOCK_OCR` | `false` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://oxhjfwmhcwadlltinlck.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` (presente) |

### Env ausentes no beta (warnings)

| Variável | Impacto |
|----------|---------|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry inactivo em runtime (código gated) |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Plugin Sentry **não** injectado no build |

### submit.production

| Campo | Estado |
|-------|--------|
| `appleId` | Placeholder `your-apple-id@example.com` |
| `ascAppId` | Placeholder `0000000000` |
| `appleTeamId` | Placeholder `XXXXXXXXXX` |
| `google-service-account.json` | Path referenciado — **Pendente validação externa** |

---

## 2. app.json + app.config.js

| Campo | Valor | Ficheiro | Estado |
|-------|-------|----------|--------|
| name | CentFlow / CentFlow Beta | app.config.js | ✅ |
| slug | `centflow` | app.json | ✅ |
| version | `1.0.0` | app.json + package.json | ✅ alinhado |
| scheme | `centflow` | app.json | ✅ |
| orientation | `portrait` | app.json | ✅ |
| newArchEnabled | `false` | app.json | ✅ |
| owner | `manuc98` | app.json | ✅ |

### Identificadores

| Plataforma | Valor |
|------------|-------|
| iOS bundleIdentifier | `com.everyft1me.centflow` |
| Android package | `com.everyft1me.centflow` |
| usesAppleSignIn | `true` |

### Versão de build

| Campo | Definido em app.json | EAS |
|-------|---------------------|-----|
| `ios.buildNumber` | ❌ Não | Remote (production autoIncrement) |
| `android.versionCode` | ❌ Não | EAS default no primeiro build |

**Nota:** Perfil `beta` sem `autoIncrement` — build number estável ou manual no EAS.

### runtimeVersion

```json
{ "policy": "appVersion" }
```

→ Runtime OTA = `1.0.0`. Builds e updates devem usar o mesmo `expo.version`.

### updates (expo-updates)

| Campo | Valor |
|-------|-------|
| url | `https://u.expo.dev/4014cf35-c2eb-4976-a1ce-5f6bb985652b` |
| checkAutomatically | `ON_LOAD` |
| fallbackToCacheTimeout | `0` |
| channel (beta build) | `preview` (via app.config.js + eas.json) |

`expo config` com `EAS_BUILD_PROFILE=beta` confirma:
- `name: CentFlow Beta`
- `updates.channel: preview`
- `extra.appVariant: beta`
- Supabase URL/key injectados

### Plugins (lista resolvida)

| Plugin | Origem |
|--------|--------|
| expo-router | app.json |
| expo-web-browser | app.json |
| expo-apple-authentication | app.json |
| expo-build-properties (iOS 16.4) | app.json |
| expo-splash-screen | app.json |
| expo-secure-store | app.json |
| expo-local-authentication | app.json |
| expo-image-picker | app.json |
| expo-ocr-kit | app.json |
| expo-updates | app.json |
| expo-sharing | app.json |
| **expo-video** | app.json — **sem imports no código** |
| expo-notifications | app.json |
| @react-native-community/datetimepicker | app.config.js |
| @sentry/react-native/expo | app.config.js — **só se** `SENTRY_ORG` + `SENTRY_PROJECT` |

**Sem plugins duplicados** na lista resolvida.

---

## 3. expo-router / expo-dev-client

| Item | Estado |
|------|--------|
| expo-router | ✅ `main: expo-router/entry`, plugin activo |
| typedRoutes | ✅ `experiments.typedRoutes: true` |
| expo-dev-client | ⚠️ Perfil `development` usa `developmentClient: true` mas pacote **não** está em `package.json` — build dev falharia |
| beta / production | ✅ Não usam dev client |

---

## 4. Assets

| Asset | Path | Estado |
|-------|------|--------|
| Ícone | `assets/images/icon.png` | ✅ existe |
| Splash | `assets/images/splash-icon.png` | ✅ existe |
| Android adaptive | `assets/images/android-icon-foreground.png` | ✅ existe |
| Favicon | `assets/images/favicon.png` | ✅ existe |
| Tab Análises | `assets/navigation/analysis-symbol.png` | ✅ PNG estático (não vídeo) |

Script: `npm run assets:validate-icons` disponível.

---

## 5. Auditoria plugins nativos

| Módulo | Instalado | Config plugin | Permissões | Código usa | Estado |
|--------|-----------|---------------|------------|------------|--------|
| expo-apple-authentication | ✅ | ✅ app.json | iOS Sign In | ✅ `lib/supabase/auth.ts` | ✅ |
| expo-secure-store | ✅ | ✅ | Keychain/Keystore | ✅ múltiplos | ✅ |
| expo-image-picker | ✅ | ✅ + copy PT | Câmara + Fotos | ✅ OCR/movimentos | ✅ |
| expo-file-system | ✅ | autolink | — | ✅ `/legacy` API | ✅ |
| expo-notifications | ✅ | ✅ | Push local | ✅ `local-notifications.ts` | ✅ |
| expo-updates | ✅ | ✅ | — | ✅ `checkForUpdates.ts` | ✅ |
| expo-linking | ✅ | autolink | — | ✅ deep links | ✅ |
| expo-web-browser | ✅ | ✅ | — | ✅ OAuth | ✅ |
| expo-auth-session | ✅ | — | — | ✅ Google OAuth | ✅ |
| expo-local-authentication | ✅ | ✅ faceID copy | Biometria | ✅ `biometricLock.ts` | ✅ |
| expo-ocr-kit | ✅ | ✅ | — | ✅ dynamic import fallback | ✅ |
| @sentry/react-native | ✅ | ⚠️ condicional | — | ✅ gated DSN | ⚠️ ver env EAS |
| expo-video | ✅ | ✅ | **RECORD_AUDIO** | ❌ **zero imports** | ⚠️ ver §6 |

### Android permissions resolvidas (`expo config`)

```
CAMERA
USE_BIOMETRIC
USE_FINGERPRINT
RECORD_AUDIO   ← injectado por expo-video, não por app.json
```

`app.json` declara apenas `CAMERA` — compliance docs que dizem «RECORD_AUDIO removido» estão **desactualizados** face ao config resolvido.

---

## 6. Riscos de build (Release-only)

| ID | Risco | Severidade | Build falha? |
|----|-------|------------|--------------|
| B1 | `expo-video` plugin sem uso → `RECORD_AUDIO` no manifest | Médio | Não — warning Play/revisão |
| B2 | Perfil `beta` = `distribution: internal` ≠ TestFlight | Alto | Não — wrong distribution path |
| B3 | Perfil `beta` Android = `apk` ≠ Play Closed (AAB) | Alto | Não — formato errado para Console |
| B4 | `expo-dev-client` ausente no perfil `development` | Médio | Sim — só perfil dev |
| B5 | Sentry plugin condicional — native sem source maps | Baixo | Não |
| B6 | `expo-file-system/legacy` — API legacy SDK 56 | Baixo | Não — ainda suportada |
| B7 | Google OAuth SHA-1 Android | Alto runtime | Não build — Pendente Dashboard |
| B8 | Apple Sign-In capability | Médio | Pendente Apple Developer |
| B9 | `GOOGLE_VISION_API_KEY` Edge Function | Alto runtime | Não build — Pendente Dashboard |
| B10 | Migrations remotas não confirmadas | Alto runtime | Não build — Pendente Dashboard |

**Nenhum bloqueador que impeça `eas build --profile beta`.**

---

## 7. Supabase (validação local)

| Item | Estado local | Dashboard |
|------|--------------|-----------|
| URL + anon key em eas.json beta | ✅ | — |
| Migration `delete_own_account` | ✅ SQL em repo | Pendente Dashboard |
| RLS policies | ✅ em 32 migrations | Pendente Dashboard (aplicadas?) |
| Storage bucket `receipts` | ✅ migration | Pendente Dashboard |
| OAuth Google redirect list | ✅ código `getGoogleAuthRedirectAllowList()` | Pendente Dashboard |
| OAuth Apple | ✅ código `signInWithIdToken` | Pendente Dashboard |
| Deep links | ✅ `centflow://auth/callback`, `reset-password`, `quick-expense`, `open-banking/callback` | Pendente Dashboard |
| Edge Function `process-receipt` | ✅ código | Pendente Dashboard (deploy + `GOOGLE_VISION_API_KEY`) |
| Edge Function `gocardless` | ✅ código | Pendente Dashboard |
| Edge Function `financial-assistant` | ✅ código | Pendente Dashboard (`ANTHROPIC_API_KEY`) |
| Edge Function `send-email` | ✅ código | Pendente Dashboard |
| Google provider activo | — | Pendente Dashboard |
| Apple provider activo | — | Pendente Dashboard |

---

## 8. Checklist pré-build

### Android (perfil `beta`)

| # | Item | Verificado |
|---|------|------------|
| A1 | `version` 1.0.0 | ✅ |
| A2 | `package` com.everyft1me.centflow | ✅ |
| A3 | runtimeVersion appVersion | ✅ |
| A4 | Canal OTA `preview` | ✅ |
| A5 | Plugins nativos listados | ✅ |
| A6 | Ícone + adaptive icon | ✅ |
| A7 | Splash | ✅ |
| A8 | MOCK_AUTH false | ✅ |
| A9 | Supabase env | ✅ |
| A10 | Google Login redirect | ⚠️ Pendente Dashboard SHA-1 |
| A11 | Privacy/Terms in-app | ✅ código |
| A12 | buildType apk (sideload) | ✅ — **não AAB Play** |

### iOS (perfil `beta`)

| # | Item | Verificado |
|---|------|------------|
| I1 | `version` 1.0.0 | ✅ |
| I2 | bundleIdentifier | ✅ |
| I3 | deploymentTarget 16.4 | ✅ |
| I4 | usesAppleSignIn | ✅ |
| I5 | runtimeVersion + canal preview | ✅ |
| I6 | Face ID permission string | ✅ |
| I7 | Camera/Photos strings | ✅ |
| I8 | ITSAppUsesNonExemptEncryption false | ✅ |
| I9 | Apple Login código | ✅ |
| I10 | Credenciais Apple EAS | Pendente validação externa |
| I11 | distribution internal (não TestFlight) | ⚠️ ver nota |

---

## 9. Distribuição: beta vs TestFlight vs Play

| Destino | Perfil actual | O que falta |
|---------|---------------|-------------|
| EAS Internal (QR/link) | `beta` ✅ | Credenciais EAS |
| TestFlight Internal | `beta` ❌ | Perfil `production` ou `distribution: store` + `eas submit` + ASC |
| Google Play Closed | `beta` APK ❌ | AAB + `production` + service account + Console |

**O perfil `beta` está correcto para o primeiro build interno sideload, não para submissão directa às lojas.**

---

## 10. OTA vs Novo Build

```
Alteração só JS/TS/assets?
├── SIM → OTA (canal preview para builds beta)
│         npm run eas:update:preview -- "mensagem"
│         Requer: mesmo runtimeVersion (1.0.0)
└── NÃO → Novo Build EAS
          ├── Novo plugin nativo / permissão
          ├── Mudança app.json / app.config.js plugins
          ├── expo.version bump (runtimeVersion muda)
          ├── expo-apple-authentication / expo-ocr-kit / etc.
          └── @sentry/react-native plugin activado pela 1ª vez
```

---

## 11. Comandos de build (não executados)

```bash
npm run eas:build:beta:android   # APK internal
npm run eas:build:beta:ios       # IPA internal
```

Para TestFlight / Play (futuro):
```bash
npm run eas:build:production:ios
npm run eas:build:production:android
npx eas submit --profile production
```

---

## Referências

- `eas.json`, `app.json`, `app.config.js`, `metro.config.js`
- `docs/build.md`, `docs/versioning.md`, `docs/beta.md`
- `BUILD_RELEASE_AUDIT.md`, `RC2_BUILD_CHECKLIST.md`
