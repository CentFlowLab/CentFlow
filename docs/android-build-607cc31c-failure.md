# Falha Build Android `607cc31c` — Análise de Causa-Raiz

> Build ID: `607cc31c-1e4a-4b68-a60f-617ff828f703`  
> Perfil: `beta` · Distribution: `internal` · Artefacto: APK  
> Data: 13 Julho 2026  
> Estado final: **ERRORED** — sem APK

---

## 1. Fase da falha

| Campo | Valor |
|-------|-------|
| Última fase concluída com sucesso | `READ_PACKAGE_JSON` |
| Primeira fase que falhou | **`INSTALL_DEPENDENCIES`** |
| Duração da fase falhada | ~1,37 s |
| Fases posteriores | `ON_BUILD_ERROR_HOOK` (success) → `FAIL_BUILD` — cascata |

O build **nunca chegou** a prebuild, Gradle, Metro bundling ou compilação nativa.

---

## 2. Primeira mensagem relevante

```
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
```

Seguida imediatamente por:

```
npm error Missing: typescript@5.9.3 from lock file
```

---

## 3. Última mensagem relevante

```
Error: npm ci --include=dev exited with non-zero code: 1
```

Reportada pelo worker EAS em `INSTALL_DEPENDENCIES` (level 50) e repetida em `FAIL_BUILD`.

---

## 4. Comando que falhou

```bash
npm ci --include=dev
```

Executado em `/home/expo/workingdir/build` pelo worker EAS (Node 22.22.2, **npm 10.9.4**).

---

## 5. Causa-raiz provável

**`package-lock.json` dessincronizado com `package.json` para npm 10.x (versão usada no EAS).**

O lockfile tinha sido gerado/atualizado localmente com **npm 11.16.0**, que não materializa a dependência aninhada opcional `typescript@5.9.3` exigida por `@expo/config` (peer opcional). O `npm ci` do EAS (npm 10.9.4) valida estritamente o lock e aborta com `EUSAGE` + `Missing: typescript@5.9.3`.

**Classificação: A — Dependência npm** (lockfile / compatibilidade npm 10 vs 11).

---

## 6. Evidências

| # | Evidência |
|---|-----------|
| E1 | Log EAS fase `INSTALL_DEPENDENCIES` — erro `Missing: typescript@5.9.3 from lock file` |
| E2 | Reprodução local: `npx npm@10.9.4 ci` → **mesmo erro** antes da correção |
| E3 | Preflight local com npm 11: `npm ci` → **passou** (falso positivo) |
| E4 | Após `npx npm@10.9.4 install`: lock inclui `node_modules/@expo/config/node_modules/typescript@5.9.3` |
| E5 | Após correção: `npx npm@10.9.4 ci` → **exit 0** (1328 packages) |
| E6 | Upload via `EAS_NO_VCS=1` — ficheiros locais no momento do build incluíam lock dessincronizado |
| E7 | `package.json` enviado ao EAS **sem** `expo-video` — falha não relacionada com vídeo |

---

## 7. Hipóteses descartadas

| Hipótese | Motivo descarte |
|----------|-----------------|
| expo-video / RECORD_AUDIO | Falha em `INSTALL_DEPENDENCIES`, antes de qualquer passo nativo |
| Gradle / Kotlin / Manifest | Fases nunca iniciadas |
| Metro bundling / Hermes | Fases nunca iniciadas |
| Sentry plugin | Não atingido |
| expo-notifications | Não atingido |
| expo-apple-authentication no Android | Não atingido |
| EAS secrets ausentes | Env vars presentes no log SPIN_UP_BUILDER |
| Credenciais Android | Fases de credenciais não atingidas |
| Cache EAS corrompido | Erro determinístico de sync lockfile, reproduzível localmente |
| Infraestrutura transitória | Falha em <2 s na fase install, mensagem npm explícita |
| Peer deps @sentry major 8 | Não citado nos logs; `expo install --check` é warning, não bloqueou install |

---

## 8. Correção proposta

Regenerar `package-lock.json` com a **mesma versão de npm do EAS**:

```bash
npx npm@10.9.4 install
npx npm@10.9.4 ci   # validação obrigatória antes de novo build
```

**Aplicado em 13 Jul 2026** — apenas `package-lock.json` alterado (+2 packages, incluindo `typescript@5.9.3` aninhado).

Não foi necessário alterar `package.json`, plugins Expo, Gradle, nem dependências de runtime.

---

## 9. Risco da correção

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Lockfile maior (entrada typescript aninhada) | Baixo | Só devDependency opcional de `@expo/config` |
| Regeneração npm 10 altera outras entradas do lock | Médio-baixo | `npm test` 487/487, `tsc` 0, `expo export` OK |
| Desenvolvedores com npm 11 sem re-sync | Médio | Documentar: validar sempre com `npx npm@10.9.4 ci` pré-build |
| Duas versões typescript no lock (5.9.3 + 6.0.3) | Baixo | 6.0.3 é devDependency directa; 5.9.3 é peer opcional de @expo/config |

---

## 10. Necessidade de novo build

**SIM** — a correção afecta apenas o lockfile enviado na fase `INSTALL_DEPENDENCIES`; o build `607cc31c` não produziu APK.

Comando (após autorização humana):

```bash
EAS_NO_VCS=1 npm run eas:build:beta:android
```

Smoke P0 (20/20) permanece **BLOCKED** até APK RC2 com estado `finished`.

---

## Referências

- [Logs EAS](https://expo.dev/accounts/manuc98/projects/centflow/builds/607cc31c-1e4a-4b68-a60f-617ff828f703)
- [`RC2_NATIVE_BUILD_REPORT.md`](../RC2_NATIVE_BUILD_REPORT.md)
- [`RC2_BUILD_CHECKLIST.md`](../RC2_BUILD_CHECKLIST.md)
