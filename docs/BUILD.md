# CentFlow — Builds e OTA (EAS)

> **Fluxo principal desde Jun 2026:** [EAS Build](https://docs.expo.dev/build/introduction/) + [EAS Update](https://docs.expo.dev/eas-update/introduction/)  
> **Alternativa legacy:** GitHub Actions → IPA unsigned para LiveContainer (sem conta Apple)

---

## Pré-requisitos (uma vez)

```bash
cd centflow
npm install

# Conta Expo (grátis para começar)
npx eas login

# Liga o repo ao projecto EAS (cria projectId em app.json)
npx eas init

# Configura credenciais iOS/Android (EAS gere certificados)
npx eas credentials
```

O `eas init` preenche `app.json` → `expo.extra.eas.projectId` e o URL de updates.

---

## Perfis de build (`eas.json`)

| Perfil | Uso | Canal OTA | Mock |
|--------|-----|-----------|------|
| `development` | Dev client + Metro | `development` | `true` |
| `beta` | **Testes Beta (dados reais)** | `preview` | `false` |
| `preview` | Alias de `beta` | `preview` | `false` |
| `preview-simulator` | Simulador iOS (dev) | `preview` | `true` |
| `production` | App Store / Play Store | `production` | `false` |

Ver também: [docs/BETA.md](./BETA.md)

### Variáveis de ambiente nos builds

Definidas por perfil em `eas.json` → `env`:

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_APP_VARIANT` | `development` \| `beta` \| `production` |
| `EXPO_PUBLIC_API_URL` | URL da API legacy |
| `EXPO_PUBLIC_MOCK_AUTH` | `true` = login/movimentos sem backend |
| `EXPO_PUBLIC_USE_MOCK` | `true` = dados demo no Início (só dev) |
| `EXPO_PUBLIC_MOCK_OCR` | `true` = OCR fictício (só demos) |
| `EXPO_PUBLIC_SUPABASE_URL` | Backend principal (beta/production) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave anon Supabase |

### Build Beta para testadores

```bash
npm run eas:build:beta:android
npm run eas:build:beta:ios
```

---

## Comandos do developer

### Builds nativos (EAS Build)

```bash
# iOS — testes internos (recomendado para telemóvel)
npm run eas:build:preview:ios

# Android — APK interno
npm run eas:build:preview:android

# iOS simulador (sem instalar no iPhone físico)
npm run eas:build:preview-simulator:ios

# Dev client (ligar ao Metro local)
npm run eas:build:dev:ios

# Produção (lojas)
npm run eas:build:production:ios
npm run eas:build:production:android
```

Descarregar o artefacto:

```bash
npx eas build:list
# ou abrir o link que o CLI mostra após o build
```

### OTA updates (EAS Update)

**Regra:** OTA só actualiza JS/assets. Mudanças nativas (novos plugins, `app.json`, etc.) exigem **novo build**.

```bash
# Publicar update no canal preview (testadores com build preview instalado)
npm.cmd run eas:update:preview -- "fix: melhorias OCR confirmação"

# Publicar no canal production
npm.cmd run eas:update:production -- "release: 1.0.1"

# Ver updates publicados
npx eas update:list
```

> **Windows PowerShell:** se `npm` der erro de Execution Policy, usa sempre `npm.cmd` (ou `npx.cmd`).

A app verifica updates ao abrir (expo-updates). `runtimeVersion` segue `appVersion` — incrementa `version` em `app.json` quando mudares código nativo.

---

## Fluxo recomendado no dia-a-dia

```
1. Instalar build preview no telemóvel (uma vez)
   npm run eas:build:preview:ios

2. Desenvolver no PC (expo start)

3. Publicar OTA quando quiseres testar no telemóvel
   npm run eas:update:preview -- "descrição da alteração"

4. Novo build nativo só quando:
   - adicionas/removes pacotes nativos (expo-ocr-kit, etc.)
   - alteras app.json / plugins / permissões
   - mudas runtimeVersion / version major
```

---

## Alternativa: GitHub Actions (IPA unsigned / LiveContainer)

Mantido em `.github/workflows/build-ios-unsigned.yml` para quem **não tem conta Apple Developer** e usa **LiveContainer**.

```text
GitHub → Actions → "Build iOS unsigned IPA" → Run workflow
```

Inputs: `mock_auth`, `api_url` (equivalente ao `env` do EAS).

**Quando usar cada um:**

| Cenário | Ferramenta |
|---------|------------|
| Iteração rápida + OTA | **EAS Build + EAS Update** |
| Sem conta Apple, sideload LiveContainer | **GitHub Actions** (unsigned IPA) |
| App Store / TestFlight | **EAS production** + `eas submit` |

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `projectId` em falta | `npx eas init` |
| OTA não chega ao telemóvel | Verifica que o build foi feito no **mesmo canal** (`preview` vs `production`) |
| Build iOS pede credenciais | `npx eas credentials` ou conta Apple no EAS |
| Mock OCR Continente 42,50€ | `EXPO_PUBLIC_MOCK_OCR=true` — desactiva em preview/production |
| API não responde | `EXPO_PUBLIC_MOCK_AUTH=true` no perfil preview |
| `npm` bloqueado no PowerShell | Usa `npm.cmd` ou `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `git command not found` / `git --help` falha | Os scripts `eas:*` usam `scripts/eas-run.cjs` (corrige PATH no Windows). Se persistir: `$env:Path = "C:\Program Files\Git\cmd;" + $env:Path` antes do comando, ou reinstala [Git for Windows](https://git-scm.com/download/win) |

---

## Ficheiros relevantes

- `eas.json` — perfis, env, canais
- `app.json` — `runtimeVersion`, `updates.url`, `version`
- `.easignore` — ficheiros excluídos do upload EAS
- `package.json` — scripts `eas:*`
