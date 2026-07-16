# Versionamento — CentFlow

Esquema de versões da app, runtime OTA e builds EAS.

---

## Versão da app

| Campo | Valor actual | Ficheiro |
|-------|--------------|----------|
| `expo.version` | `1.0.0` | `app.json` |
| `package.json` version | `1.0.0` | `package.json` |
| Política de Privacidade | `1.0.0` | `lib/legal/constants.ts` |
| Termos de Utilização | `1.0.0` | `lib/legal/constants.ts` |
| Consentimento privacidade | `1.0.0` | `lib/privacy/consent.types.ts` |
| Export JSON | `version: 2` | `lib/export/export.service.ts` |

### Semântica (orientação)

- **MAJOR** — mudanças incompatíveis, redesign estrutural, novo runtime nativo.
- **MINOR** — funcionalidades novas compatíveis com OTA.
- **PATCH** — correcções e melhorias via OTA.

Release actual: **1.0.0 beta RC** (primeira versão pública beta).

---

## Runtime version (Expo Updates)

```json
"runtimeVersion": {
  "policy": "appVersion"
}
```

| Conceito | Comportamento |
|----------|---------------|
| Política | `appVersion` — runtime = `expo.version` |
| Compatibilidade OTA | Updates só aplicam a builds com o mesmo runtime |
| Quando incrementar | Ao mudar `expo.version` em `app.json` |

**Exemplo:** build instalado com runtime `1.0.0` recebe OTA do canal `preview`/`production` publicados para runtime `1.0.0`. Se `version` passar a `1.1.0`, é necessário novo build nativo.

---

## Build number (iOS / versionCode Android)

| Perfil | Auto-increment | Ficheiro |
|--------|----------------|----------|
| `production` | **Sim** (`autoIncrement: true`) | `eas.json` |
| `beta` / `preview` | Não | Manual ou EAS default |
| `development` | Não | — |

`appVersionSource: remote` em `eas.json` — EAS gere versão de build remota para production.

### Comandos

```bash
# Production — incrementa build number automaticamente
npm run eas:build:production:ios
npm run eas:build:production:android

# Beta — build number estável ou manual
npm run eas:build:beta:ios
```

---

## Canais EAS Update

| Canal | Perfil build típico | Audiência |
|-------|---------------------|-----------|
| `development` | `development` | Dev client |
| `preview` | `beta` / `preview` | Testadores internos |
| `production` | `production` | App Store / Play Store |

```bash
npm run eas:update:preview -- "mensagem"
npm run eas:update:production -- "mensagem"
npm run eas:update:list
```

---

## Identificadores de pacote

| Plataforma | Identificador |
|------------|---------------|
| iOS | `com.everyft1me.centflow` |
| Android | `com.everyft1me.centflow` |
| EAS Project ID | `4014cf35-c2eb-4976-a1ce-5f6bb985652b` |
| Scheme | `centflow` |

---

## Variante vs versão

A variante (`EXPO_PUBLIC_APP_VARIANT`) **não** altera `expo.version`:

| Variante | Nome exibido (app.config.js) |
|----------|-------------------------------|
| `development` | CentFlow |
| `beta` | CentFlow Beta |
| `production` | CentFlow |

---

## Checklist ao lançar nova versão

1. Decidir se mudança exige novo build nativo (ver `docs/release-process.md`).
2. Se sim: incrementar `version` em `app.json` e `package.json`.
3. Actualizar `release-notes.md` e notas de loja.
4. Se documentos legais mudarem: incrementar `PRIVACY_POLICY_VERSION` / `TERMS_VERSION` e data.
5. `eas:build:production:*` → `eas submit`.
6. Publicar OTA production com mensagem alinhada ao runtime.

---

## Contacto

privacy@centflow.app
