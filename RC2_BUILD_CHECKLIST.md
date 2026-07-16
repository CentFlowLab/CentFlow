# RC2 Build Checklist — CentFlow

> Estado por item: **PASS** · **FAIL** · **PENDENTE**  
> Auditoria estática — Julho 2026. Nenhum build EAS executado.

Legenda: itens **Pendente validação externa** dependem de Apple/Google/Supabase Dashboard.

---

## A. EAS & Expo

| # | Item | Estado | Notas |
|---|------|--------|-------|
| A1 | `eas.json` válido | PASS | Perfis beta/preview/production |
| A2 | EAS projectId configurado | PASS | `4014cf35-c2eb-4976-a1ce-5f6bb985652b` |
| A3 | `app.json` + `app.config.js` coerentes | PASS | Variante beta resolve correctamente |
| A4 | `expo.version` = `package.json` = 1.0.0 | PASS | |
| A5 | runtimeVersion policy appVersion | PASS | Runtime OTA = 1.0.0 |
| A6 | updates.url EAS correcto | PASS | |
| A7 | Canal beta = `preview` | PASS | `expo config` com EAS_BUILD_PROFILE=beta |
| A8 | bundleIdentifier iOS | PASS | `com.everyft1me.centflow` |
| A9 | package Android | PASS | `com.everyft1me.centflow` |
| A10 | iOS deploymentTarget 16.4 | PASS | expo-build-properties |
| A11 | expo-router entry + plugin | PASS | |
| A12 | Credenciais EAS iOS | **FAIL** | Sem Apple Team no EAS (`manuc98`) — ver `IOS_RC2_BUILD_REPORT.md` |
| A13 | Credenciais EAS Android | PENDENTE | Pendente validação externa |
| A14 | `eas submit` placeholders | FAIL | appleId/ascAppId fictícios |
| A15 | Perfil beta → TestFlight | FAIL | `distribution: internal` — precisa store |
| A16 | Perfil beta → Play Closed | FAIL | APK internal — precisa AAB production |

---

## B. Plugins nativos

| # | Item | Estado | Notas |
|---|------|--------|-------|
| B1 | expo-apple-authentication | PASS | Plugin + usesAppleSignIn |
| B2 | expo-secure-store | PASS | |
| B3 | expo-image-picker + permissões PT | PASS | |
| B4 | expo-file-system | PASS | Usa `/legacy` |
| B5 | expo-notifications | PASS | Plugin + ícone |
| B6 | expo-updates | PASS | |
| B7 | expo-linking / scheme centflow | PASS | |
| B8 | expo-web-browser + expo-auth-session | PASS | Google OAuth |
| B9 | expo-local-authentication | PASS | Face ID string |
| B10 | expo-ocr-kit | PASS | Plugin + dynamic import |
| B11 | @sentry/react-native | PENDENTE | Plugin só com SENTRY_ORG/PROJECT; DSN ausente no beta |
| B12 | expo-video | PASS | Removido 13 Jul 2026 — zero imports |
| B13 | expo-dev-client (perfil development) | FAIL | developmentClient:true sem pacote instalado |
| B14 | Plugins duplicados | PASS | Nenhum detectado |
| B15 | @react-native-community/datetimepicker | PASS | Injectado em app.config.js |

---

## C. Assets & UI nativa

| # | Item | Estado | Notas |
|---|------|--------|-------|
| C1 | icon.png | PASS | |
| C2 | splash-icon.png | PASS | |
| C3 | android-icon-foreground.png | PASS | |
| C4 | Nome app beta «CentFlow Beta» | PASS | app.config.js |
| C5 | Screenshots loja | PENDENTE | Pendente validação externa |
| C6 | Feature graphic Play | PENDENTE | Pendente validação externa |

---

## D. Supabase

| # | Item | Estado | Notas |
|---|------|--------|-------|
| D1 | URL + anon key no perfil beta | PASS | eas.json |
| D2 | delete_own_account migration | PASS | SQL local |
| D3 | delete_own_account RPC remoto | PENDENTE | Pendente Dashboard |
| D4 | RLS migrations em repo | PASS | 32 ficheiros |
| D5 | RLS aplicado remoto | PENDENTE | Pendente Dashboard |
| D6 | Storage bucket receipts | PASS | Migration local |
| D7 | Google OAuth provider activo | PENDENTE | Pendente Dashboard |
| D8 | Apple OAuth provider activo | PENDENTE | Pendente Dashboard |
| D9 | Redirect URLs Supabase | PENDENTE | Pendente Dashboard — lista em código |
| D10 | Google Cloud redirect URI | PENDENTE | Pendente Dashboard |
| D11 | Android SHA-1 no Google Console | PENDENTE | Pendente Dashboard |
| D12 | Edge Function process-receipt deploy | PENDENTE | Pendente Dashboard |
| D13 | GOOGLE_VISION_API_KEY secret | PENDENTE | Pendente Dashboard |
| D14 | Edge Function gocardless deploy | PENDENTE | Pendente Dashboard |
| D15 | GOCARDLESS_* secrets | PENDENTE | Pendente Dashboard |
| D16 | Edge Function financial-assistant | PENDENTE | Pendente Dashboard |
| D17 | ANTHROPIC_API_KEY secret | PENDENTE | Pendente Dashboard |

---

## E. Compliance in-app

| # | Item | Estado | Notas |
|---|------|--------|-------|
| E1 | Política `/legal/privacy` | PASS | Código |
| E2 | Termos `/legal/terms` | PASS | Código |
| E3 | Delete Account UI + serviço | PASS | Código |
| E4 | Privacy consent gate | PASS | Código |
| E5 | Apple Sign-In botão iOS | PASS | Código |
| E6 | URL privacidade pública | PENDENTE | Pendente validação externa |
| E7 | Revisão jurídica textos | PENDENTE | Pendente validação externa |
| E8 | RECORD_AUDIO ausente manifest final | PASS | `blockedPermissions` em app.json |

---

## F. Qualidade código (pré-build)

| # | Item | Estado | Notas |
|---|------|--------|-------|
| F1 | npm test 487/487 | PASS | Executado 13 Jul 2026 |
| F2 | npx tsc --noEmit 0 erros | PASS | Executado 13 Jul 2026 |
| F3 | expo config --type public | PASS | Local + beta profile |
| F4 | Smoke device P0 | **EM CURSO** | 20/20 BLOCKED — aguarda instalação confirmada |
| F5 | npm ci com npm 10.9.4 (EAS) | PASS | Após fix lockfile — ver `docs/android-build-607cc31c-failure.md` |
| F6 | npx expo export --platform android | PASS | Executado 13 Jul 2026 |

---

## G. Checklist imediato antes do 1.º build beta

### Android

| # | Passo | Estado |
|---|-------|--------|
| G-A1 | Confirmar build beta Android RC2 | **PASS** | `eb472165` FINISHED — APK disponível |
| G-A2 | Verificar login EAS (`eas whoami`) | PENDENTE — externo |
| G-A3 | Credenciais keystore Android | PENDENTE — externo |
| G-A4 | Changelog: «CentFlow Beta 1.0.0 — RC2 primeiro build» | PENDENTE |
| G-A5 | Instalar APK + smoke P0 | **PENDENTE** | APK pronto — aguarda instalação humana |

### iOS

| # | Passo | Estado |
|---|-------|--------|
| G-I1 | Confirmar `npm run eas:build:beta:ios` | **BLOQUEADO** | Sem Apple Team no EAS — ver `IOS_RC2_BUILD_REPORT.md` |
| G-I2 | Conta Apple Developer + certificados EAS | **FAIL** | `eas device:list` → «No Apple teams found for account manuc98» |
| G-I3 | Capability Sign in with Apple no App ID | PENDENTE APPLE DEVELOPER |
| G-I4 | UDID iPhone registado | **FAIL** | Não listável sem Apple Team |
| G-I5 | Changelog alinhado | PENDENTE |
| G-I6 | Instalar IPA + smoke P0 + Apple Login | **BLOQUEADO** | Sem IPA |

---

## Resumo contagem

| Estado | Quantidade |
|--------|------------|
| PASS | 39 |
| FAIL | 4 |
| PENDENTE | 24 |

### FAIL críticos para corrigir antes de lojas (não bloqueiam 1.º build interno)

1. **B12** — expo-video sem uso + RECORD_AUDIO
2. **A15/A16** — Perfil beta não é TestFlight/Play path
3. **A14** — Submit placeholders
4. **E8** — RECORD_AUDIO no manifest resolvido
5. **B13** — dev client (só afecta perfil development)

---

## Referências

- [`docs/build-audit.md`](docs/build-audit.md)
- [`BUILD_RELEASE_AUDIT.md`](../BUILD_RELEASE_AUDIT.md)
- [`docs/smoke-test-checklist.md`](docs/smoke-test-checklist.md)
