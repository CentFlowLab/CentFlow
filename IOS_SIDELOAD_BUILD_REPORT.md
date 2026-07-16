# iOS Sideload Build Report — CentFlow RC2

> Sprint sideload IPA unsigned — 17 Julho 2026  
> **Sem Apple Developer · sem TestFlight · sem EAS Internal · sem certificados**

---

## 1. Auditoria Git (pré-commit)

| Item | Valor |
|------|-------|
| Branch de partida | `main` |
| HEAD local | `258a73a` — chore: stabilization sprint - financial core audit |
| `origin/main` | `bd70273` — local **ahead 1** |
| Working tree | Dezenas de ficheiros modificados + untracked (RC2 / compliance / engine) |
| Suspeita confirmada | Sim — IPAs GitHub anteriores **não** incluem working tree RC2 |

### Excluídos do commit (não entram)

| Ficheiro | Motivo |
|----------|--------|
| `build-log.bin` | Log EAS temporário |
| `build-view-temp.json` | Output CLI temporário (contém metadata build) |
| `dist/` | Export local (gitignore) |
| `.env` | Ausente / gitignore |
| `*.apk` | Ausente |
| `node_modules/` | gitignore |

---

## 2. Auditoria Workflow

| Workflow | Path | Trigger | Branch compilada |
|----------|------|---------|------------------|
| **Build iOS unsigned IPA** | `.github/workflows/build-ios-unsigned.yml` | `workflow_dispatch` only | Ref do dispatch (branch seleccionada) |
| CentFlow Release | `.github/workflows/release.yml` | `push` → **main** only + dispatch | `main` em push |

### Comportamento relevante

- Checkout: `actions/checkout@v4` (commit do ref disparado)
- `npm ci` no job validate + build-ipa
- Expo prebuild iOS + `expo export:embed` + xcodebuild **unsigned**
- Artifact: `CentFlow-beta-ipa-${{ github.sha }}`
- **Correcção aplicada:** alias passou de `publish_ota: true` → **`false`** (evitar OTA preview/production neste sideload)

---

## 3–8. Build run

*(preenchido após push + workflow)*

| Campo | Valor |
|-------|-------|
| Branch | `rc2-ios-sideload` |
| Commit | — |
| Workflow | Build iOS unsigned IPA |
| Run ID | — |
| Artifact | — |
| IPA | — |
| Estado | — |

---

## 9. Próximo passo

Instalar IPA via sideload (LiveContainer) após download do artifact.
