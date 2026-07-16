# RC2 Native Build Report — CentFlow

> Sprint RC2 Native Build — 13 Julho 2026  
> Responsável: agent (Principal Mobile Release Engineer)  
> **Sem commit · sem push · sem OTA · sem submissão lojas**

---

## 1. Resumo executivo

| Item | Estado |
|------|--------|
| Preflight local | ✅ Verde (testes, tsc, assets, handoff, npm@10.9.4 ci) |
| expo-video removido | ✅ |
| RECORD_AUDIO bloqueado | ✅ `blockedPermissions` |
| Build Android RC2 (`607cc31c`) | ⛔ **ERRORED** — lockfile (histórico) |
| Build Android RC2 (`eb472165`) | ✅ **FINISHED** — APK disponível |
| Build Android `7dc46d04` | ⛔ **OBSOLETO** — não testar |
| Build iOS RC2 | 🔴 **Bloqueado** — credenciais internal distribution |
| Instalação device | ⏳ **PENDENTE** — APK pronto, aguarda confirmação humana |
| Smoke P0 | ⏳ **BLOCKED** (20/20) — sessão QA iniciada; aguarda instalação |

**Recomendação:** **RC2 ANDROID BUILD READY FOR DEVICE TESTING** — instalar APK `eb472165` e executar smoke P0.

---

## 2. expo-video — remoção

| Verificação | Resultado |
|-------------|-----------|
| package.json | Removido via `npm uninstall expo-video` |
| package-lock.json | Atualizado |
| Plugin app.json | Removido |
| Imports no código | **Zero** — `TabBarAnalisesIcon` usa PNG estático |
| Utilização indirecta | Nenhuma |
| ADR-006 | **Obsoleto** — decisão de manter expo-video já não aplicável |

---

## 3. RECORD_AUDIO

| Etapa | Resultado |
|-------|-----------|
| Após remover expo-video | Ainda listado em `permissions` resolvidas (origem autolink desconhecida) |
| Correcção aplicada | `android.blockedPermissions: ["android.permission.RECORD_AUDIO"]` |
| Manifest final (build) | **Sem microfone** — `blockedPermissions` remove no Gradle merge |
| Compliance docs | Actualizar `docs/store/permissions.md` no próximo sprint docs |

`expo config` (beta) mostra `blockedPermissions` presente.

---

## 4. Preflight executado

| Comando | Resultado |
|---------|-----------|
| `npm ci` | ✅ 1326 packages (npm 11 — **não valida EAS**) |
| `npx npm@10.9.4 ci` | ✅ 1328 packages (pós-fix — **validação EAS**) |
| `npm test` | ✅ **487/487** |
| `npx tsc --noEmit` | ✅ **0 erros** |
| `npm run assets:validate-icons` | ✅ splash + adaptive icon |
| `EAS_BUILD_PROFILE=beta npx expo config --type public` | ✅ CentFlow Beta, canal preview |
| `npx expo-doctor` | ⚠️ 17/21 — ver §6 |
| `npm run handoff` | ✅ |
| Lint scoped | N/A — só `app.json` + lockfile alterados |

---

## 5. Expo Doctor (4 falhas — não bloqueantes build beta)

| Check | Severidade | Notas |
|-------|------------|-------|
| Schema app.json campos extra | Info | `newArchEnabled`, `edgeToEdgeEnabled` — válidos SDK 56 |
| app.json + app.config.js | Info | Padrão intencional (variante dinâmica) |
| eas-cli em devDependencies | Info | Scripts usam `eas-run.cjs` |
| Patch version mismatches | Warning | 12 pacotes patch atrás; `@sentry` major 8 vs expected 7 |

**Não corrigido neste sprint** — sem alteração de dependências sem autorização.

---

## 6. Configuração beta (variáveis — sem valores)

| Variável | Perfil beta | EAS preview env | Classificação |
|----------|-------------|-----------------|---------------|
| EXPO_PUBLIC_APP_VARIANT | definida | definida | VALIDADO LOCALMENTE |
| EXPO_PUBLIC_MOCK_AUTH | false | — | VALIDADO LOCALMENTE |
| EXPO_PUBLIC_USE_MOCK | false | — | VALIDADO LOCALMENTE |
| EXPO_PUBLIC_MOCK_OCR | false | — | VALIDADO LOCALMENTE |
| EXPO_PUBLIC_SUPABASE_URL | definida | definida | VALIDADO LOCALMENTE |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | definida | definida | VALIDADO LOCALMENTE |
| EXPO_PUBLIC_SENTRY_DSN | ausente | ausente | Opcional — gated por consent |
| EXPO_PUBLIC_API_URL | ausente | — | Não usado em beta |
| Google OAuth client IDs | código only | — | PENDENTE DASHBOARD |
| Apple Sign-In | código + plugin | — | PENDENTE DISPOSITIVO |

Mock auth desactivado. Doctor redige dados sensíveis. Sentry respeita consentimento.

---

## 7. Supabase external checklist

Ver [`docs/supabase-external-checklist.md`](docs/supabase-external-checklist.md) — **todos ☐ Pendente Dashboard**.

---

## 8. Credenciais Android

| Item | Estado |
|------|--------|
| EAS login | ✅ `manuc98` |
| Keystore remoto | ✅ `Build Credentials D4OElQQuiy (default)` |
| Package | ✅ `com.everyft1me.centflow` |
| SHA-1 para Google Console | ⏳ Obter via `eas credentials -p android` (interactivo) |

Build anterior Android **finished** (12 Jul): perfil preview, versionCode 2, APK disponível.

---

## 9. Credenciais iOS

| Item | Estado |
|------|--------|
| Credenciais remote | Parcial |
| Internal distribution profile | 🔴 **AUSENTE** |
| Erro EAS | «couldn't find any credentials suitable for internal distribution» |
| Último build iOS | `production` — **errored** (Jun 2026) |

### Acção humana necessária (iOS)

```bash
# Modo interactivo — NÃO usar --non-interactive
npx eas credentials -p ios
# ou
npm run eas:build:beta:ios
```

1. Configurar **Ad Hoc** / internal provisioning para `com.everyft1me.centflow`
2. Registar **UDIDs** dos iPhones de teste
3. Confirmar capability **Sign in with Apple** no App ID
4. Reexecutar build beta iOS

**Parado conforme regra de segurança** — sem contornar credenciais.

---

## 10. Build Android

### Build RC2 — **canónico** (`eb472165`) ✅

| Campo | Valor |
|-------|-------|
| Build ID | `eb472165-c9e8-4f92-99e1-f5b98f33fb9f` |
| Estado final | **FINISHED** |
| Início | 13/07/2026 17:20:33 UTC+1 |
| Fim | 13/07/2026 19:00:04 UTC+1 |
| Duração total | **~1h 40 min** |
| Fila | ~78 min (`buildQueueTime`) |
| Compilação | ~21 min (`buildDuration`) |
| Profile | `beta` |
| Platform | Android |
| Distribution | internal |
| Tipo artefacto | **APK** |
| Version | 1.0.0 |
| versionCode | 2 |
| runtimeVersion | 1.0.0 |
| Channel | preview |
| SDK | 56.0.0 |
| Upload | `EAS_NO_VCS=1` |
| APK | https://expo.dev/artifacts/eas/4YqtC3B0u4qObg4grQiIZwVKFAR3PRMWYLsu7bZmDt4.apk |
| URL instalação | https://expo.dev/accounts/manuc98/projects/centflow/builds/eb472165-c9e8-4f92-99e1-f5b98f33fb9f |
| Logs | https://expo.dev/accounts/manuc98/projects/centflow/builds/eb472165-c9e8-4f92-99e1-f5b98f33fb9f |

**Estado QA:** **READY FOR DEVICE INSTALL** — não READY FOR TESTFLIGHT.

### Build RC2 — falha histórica (`607cc31c`)

| Campo | Valor |
|-------|-------|
| Build ID | `607cc31c-1e4a-4b68-a60f-617ff828f703` |
| Estado final | **ERRORED** |
| Causa | lockfile npm 10 vs 11 — ver `docs/android-build-607cc31c-failure.md` |
| Decisão QA | **Substituído** por `eb472165` |

### Build `7dc46d04` — ⛔ OBSOLETO — NÃO TESTAR

| Campo | Valor |
|-------|-------|
| Build ID | `7dc46d04-f11b-4b3e-a4fd-1c188f3dcaa9` |
| Estado | **ERRORED** |
| Motivo obsoleto | Criado **antes** da remoção `expo-video` + `blockedPermissions` |
| Commit git | `258a73a` |
| Duração | ~60 min (15:19 → 16:19) |
| URL instalação | null |
| Decisão QA | **Descartado** — não usar para smoke nem validação RC2 |

### Outros builds Android (referência apenas)

| Build ID | Estado | Nota |
|----------|--------|------|
| `96a2f729` | finished | APK disponível mas **pré RC2** (com expo-video) — **não usar** |
| `d80b395d` | finished | Jun 2026 — obsoleto |

---

## 11. Build iOS

| Campo | Valor |
|-------|-------|
| Estado | **BLOQUEADO** |
| Motivo | Credenciais internal distribution |
| TestFlight | Não — perfil beta = internal sideload |
| App Store | Não |

---

## 12. Artefactos

| Plataforma | Build ID | APK/IPA | URL | QA |
|------------|----------|---------|-----|-----|
| Android RC2 | eb472165 | ✅ APK | [instalar](https://expo.dev/accounts/manuc98/projects/centflow/builds/eb472165-c9e8-4f92-99e1-f5b98f33fb9f) | **READY FOR DEVICE INSTALL** |
| Android RC2 | 607cc31c | ❌ | null | Substituído (errored) |
| Android | 7dc46d04 | ❌ | null | ⛔ OBSOLETO |
| Android | 96a2f729 | APK | expo.dev artifacts | ⛔ Pré RC2 — não usar |
| iOS RC2 | — | — | — | Bloqueado |

---

## 13. Instalação em dispositivo

| Dispositivo | SO | Build | Método | Data | Resultado |
|-------------|-----|-------|--------|------|-----------|
| — | — | eb472165 | APK via expo.dev | — | **PENDENTE instalação** |

Mínimo: 1 Android + 1 iPhone — **APK RC2 disponível; instalação não confirmada**.

---

## 14. Smoke P0 (20 testes)

**Estado global: BLOCKED (20/20)** — APK disponível; aguarda instalação confirmada em dispositivo.

| # | Teste | Android | iOS | Resultado |
|---|-------|---------|-----|-----------|
| 1 | Instalação limpa | — | — | NOT RUN |
| 2 | Primeiro arranque | — | — | NOT RUN |
| 3 | Consentimento privacidade | — | — | NOT RUN |
| 4 | Política + termos | — | — | NOT RUN |
| 5 | Onboarding | — | — | NOT RUN |
| 6 | Registo email | — | — | NOT RUN |
| 7 | Login email | — | — | NOT RUN |
| 8 | Google Sign-In | — | — | NOT RUN |
| 9 | Apple Sign-In | — | — | NOT RUN |
| 10 | Logout + login | — | — | NOT RUN |
| 11 | Criar movimento | — | — | NOT RUN |
| 12 | Editar movimento | — | — | NOT RUN |
| 13 | Eliminar movimento | — | — | NOT RUN |
| 14 | Movimento cartão | — | — | NOT RUN |
| 15 | OCR imagem real | — | — | NOT RUN |
| 16 | Offline / online | — | — | NOT RUN |
| 17 | Deep link quick-expense | — | — | NOT RUN |
| 18 | Background/kill/reopen | — | — | NOT RUN |
| 19 | Delete account | — | — | NOT RUN |
| 20 | Doctor/Sentry erro controlado | — | — | NOT RUN |

Template detalhado: [`docs/smoke-p0-execution.md`](docs/smoke-p0-execution.md)

---

## 15. Bugs encontrados

Nenhum em device (smoke não executado).

---

## 16. Bugs corrigidos neste sprint

| ID | Fix | Tipo |
|----|-----|------|
| RC2-01 | Remoção expo-video | Native cleanup |
| RC2-02 | blockedPermissions RECORD_AUDIO | Manifest |
| RC2-03 | Lockfile sync npm 10 (typescript@5.9.3) | Build deps |
| RC2-04 | Build Android eb472165 FINISHED | APK RC2 |

---

## 17. Itens que exigem NOVO BUILD

- Remoção expo-video ✅ (incluído no upload 607cc31c — build não completou)
- blockedPermissions ✅ (incluído no upload 607cc31c)
- Lockfile npm 10 sync ✅ (corrigido após 607cc31c — **requer novo build**)

---

## 18. Itens elegíveis para OTA (futuro)

Nenhuma correcção JS neste sprint. OTA **não publicado**.

---

## 19. Release gate (actualização 13 Jul 2026 — 16:25)

| Destino | Veredicto | Motivo |
|---------|-----------|--------|
| TestFlight Internal | **PENDENTE** | iOS build bloqueado + smoke NOT RUN |
| Google Play Closed | **PENDENTE** | Perfil beta = APK internal, não AAB Play |
| EAS Internal Android | **READY** | APK `eb472165` finished — instalar + smoke |
| EAS Internal iOS | **BLOQUEADO** | Credenciais |
| RC2 Device Testing | **BLOQUEADO** | Sem APK RC2 válido |

---

## 20. Scores

| Dimensão | Antes | Agora |
|----------|-------|-------|
| Build Readiness | 82 | **92** (+APK RC2 finished) |
| Native Readiness | 78 | **85** (+RECORD_AUDIO blocked) |
| Device Validation | 0 | **0** (smoke BLOCKED — aguarda instalação) |
| Release Readiness | 52 | **62** (APK pronto; smoke pendente) |

---

## 21. Recomendação final

### **RC2 ANDROID BUILD READY FOR DEVICE TESTING**

APK canónico `eb472165` **finished**. Instalar e executar smoke P0.

Próximos passos:

1. Instalar APK: https://expo.dev/accounts/manuc98/projects/centflow/builds/eb472165-c9e8-4f92-99e1-f5b98f33fb9f
2. Confirmar instalação em ≥1 Android físico
3. Executar smoke P0 (`docs/smoke-p0-execution.md`) — marcar PASS só após device
4. **Não usar** builds `7dc46d04`, `607cc31c` (errored), `96a2f729` (pré RC2)
5. iOS RC2 continua bloqueado (credenciais)

---

## 22. Confirmações

| Item | Confirmado |
|------|------------|
| Sem submissão App Store / Play | ✅ |
| Sem OTA | ✅ |
| Sem push | ✅ |
| Sem commit | ✅ (build via EAS_NO_VCS=1) |
| Sem secrets expostos | ✅ |
