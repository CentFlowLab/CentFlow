# Processo de release — CentFlow

Pipeline de desenvolvimento até release público (App Store / Play Store).

Ver também: [docs/build.md](./build.md)

> **Aviso legal:** Textos legais e metadata de loja requerem revisão jurídica antes da publicação.

---

## Visão geral

```
Desenvolvimento local (expo start)
        ↓
Commit → push main
        ↓
GitHub Actions «CentFlow Release» (OTA preview + production, IPA beta)
        ↓
Testes em dispositivo (build preview/beta instalado)
        ↓
[Se mudança nativa] → EAS Build production
        ↓
[Se só JS/assets] → EAS Update production
        ↓
eas submit → App Store / Play Store
```

---

## Ambientes e variantes

| Variante | `EXPO_PUBLIC_APP_VARIANT` | Mock auth | Canal OTA | Uso |
|----------|---------------------------|-----------|-----------|-----|
| development | `development` | `true` (default dev) | `development` | Dev client + Metro |
| beta | `beta` | `false` | `preview` | Testes internos, dados reais |
| production | `production` | `false` | `production` | Lojas |

---

## OTA vs build nativo

### Usar **EAS Update** (OTA) quando

- Alterações só em JavaScript/TypeScript, assets, estilos, copy.
- Lógica de negócio, UI, hooks, serviços sem novos módulos nativos.
- Correções rápidas para testadores com build já instalado.

```bash
# Testadores beta (canal preview)
npm run eas:update:preview -- "fix: descrição da alteração"

# Utilizadores production (canal production)
npm run eas:update:production -- "release: descrição"
```

**CI automático:** push para `main` publica OTA em `preview` + `production` (workflow `release.yml`, requer secret `EXPO_TOKEN`).

### Exigir **novo EAS Build** quando

- Adicionar/remover pacotes com código nativo (`expo-ocr-kit`, `expo-apple-authentication`, Sentry, etc.).
- Alterar `app.json` / `app.config.js` (permissões, plugins, `runtimeVersion`, bundle ID).
- Mudar `expo.version` (política `runtimeVersion: appVersion`).
- Configurar `EXPO_PUBLIC_SENTRY_DSN` ou outros secrets que exigem embed no binário.
- Alterações em ícones/splash nativos.

```bash
npm run eas:build:production:ios
npm run eas:build:production:android
```

---

## Fluxo diário (developer)

1. **Instalar build preview no telemóvel** (uma vez):
   ```bash
   npm run eas:build:preview:ios
   # ou eas:build:preview:android
   ```

2. **Desenvolver** com `npm start` / `expo start`.

3. **Publicar OTA** para testar no dispositivo sem reinstalar:
   ```bash
   npm run eas:update:preview -- "feat: nova secção análises"
   ```

4. **Novo build** apenas quando a checklist «build nativo» se aplica.

---

## Release para lojas

### 1. Pré-release

- [ ] Checklist `docs/store/app-review-checklist.md` sem bloqueadores.
- [ ] Revisão jurídica de textos legais.
- [ ] `npm test` e `npx tsc --noEmit` verdes.
- [ ] Metadata: screenshots, descrições, privacy labels.

### 2. Build production

```bash
npm run eas:build:production:ios
npm run eas:build:production:android
```

Perfil `production` em `eas.json`:
- `autoIncrement: true` (build number)
- `channel: production`
- Supabase real, mock desligado.

### 3. Submit

```bash
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```

Configurar credenciais reais em `eas.json` → `submit.production` (Apple ID, ASC App ID, service account Google).

### 4. Pós-submit

- Monitorizar revisão Apple/Google.
- Responder com `docs/store/review-notes.md`.
- Correcções JS via `eas:update:production` (se build já aprovado e runtime compatível).
- Correcções nativas → novo build + resubmit.

---

## GitHub Actions

| Workflow | Trigger | Acções |
|----------|---------|--------|
| `release.yml` (CentFlow Release) | Push `main` | Validate lockfile, OTA preview+production, IPA beta unsigned |
| `build-ios-unsigned.yml` | Manual / alias | Redirecciona para CentFlow Release |

**IPA beta:** artefacto GitHub Actions para sideload (LiveContainer) — não substitui build de loja.

---

## Canais OTA e runtime

- `runtimeVersion`: política `appVersion` — ligado a `expo.version` em `app.json`.
- OTA só entrega updates compatíveis com o `runtimeVersion` do build instalado.
- Incrementar `version` em `app.json` quando mudar código nativo ou quiser forçar novo baseline.

---

## Secrets e variáveis

| Variável | Onde | Notas |
|----------|------|-------|
| `EXPO_TOKEN` | GitHub Actions | OTA no CI |
| `EXPO_PUBLIC_SUPABASE_*` | `eas.json` perfis beta/production | Públicas (client) |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS secrets / build manual | Requer rebuild |
| GoCardless, Vision API | Supabase Edge Function secrets | Não na app |

---

## Rollback

- **OTA:** republicar update anterior ou fix forward com `eas update`.
- **Nativo:** submeter build anterior ou nova versão corrigida.

---

## Contacto

privacy@centflow.app
