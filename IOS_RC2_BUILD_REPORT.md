# iOS RC2 Build Report — CentFlow

> Sprint iOS RC2 — 16 Julho 2026  
> Responsável: agent (Principal iOS Release Engineer)  
> **Sem commit · sem push · sem OTA · sem alteração Android · sem IPA gerado**

---

## 1. Resumo executivo

| Item | Estado |
|------|--------|
| Bundle Identifier (código) | ✅ `com.everyft1me.centflow` |
| Apple Team no EAS | 🔴 **AUSENTE** — `No Apple teams found for account manuc98` |
| Distribution Certificate | 🔴 **Não verificável** — sem Apple Team |
| Provisioning Ad Hoc / Internal | 🔴 **Ausente** |
| UDID iPhone registado | 🔴 **Não listável** — sem Apple Team |
| Sign in with Apple (código) | ✅ Plugin + `usesAppleSignIn` + fluxo Supabase |
| Sign in with Apple (App ID) | ⏳ **PENDENTE APPLE DEVELOPER** |
| Supabase Apple Provider | ⏳ **PENDENTE DASHBOARD** |
| Preflight local | ✅ Verde |
| Build IPA beta | ⛔ **NÃO INICIADO** — credenciais bloqueiam |

**Veredicto:** **BLOQUEAR IPA RC2** até Apple Team + dispositivos + provisioning Ad Hoc estarem configurados no EAS com confirmação humana.

---

## 2. Fase 1 — Apple Developer Audit (código vs portal)

### 2.1 Validado no repositório

| Item | Valor | Fonte |
|------|-------|-------|
| Bundle Identifier | `com.everyft1me.centflow` | `app.json` → `ios.bundleIdentifier` |
| Package Android (paridade) | `com.everyft1me.centflow` | `app.json` |
| Scheme | `centflow` | `app.json` |
| `usesAppleSignIn` | `true` | `app.json` |
| Plugin | `expo-apple-authentication` | `app.json` + `package.json` ~56.0.4 |
| Deployment target | iOS **16.4** | `expo-build-properties` |
| Associated Domains | **Não definidos** no config | — |
| Push entitlements explícitos | Plugin `expo-notifications` presente; sem `associatedDomains` | — |
| `eas.json` submit `appleTeamId` | Placeholder `XXXXXXXXXX` | **não usar para build** |
| Owner EAS | `manuc98` | `app.json` / `eas whoami` |

### 2.2 Portal Apple Developer — **PENDENTE APPLE DEVELOPER**

Não auditável automaticamente a partir desta máquina. Confirmar manualmente:

| # | Item | Estado |
|---|------|--------|
| AD1 | App ID `com.everyft1me.centflow` existe | ⏳ PENDENTE APPLE DEVELOPER |
| AD2 | Capability **Sign in with Apple** activa no App ID | ⏳ PENDENTE APPLE DEVELOPER |
| AD3 | Push Notifications (se necessário para beta) | ⏳ PENDENTE APPLE DEVELOPER |
| AD4 | Associated Domains (se usados) | N/A no código actual |
| AD5 | Membership Apple Developer activa (paga) | ⏳ PENDENTE APPLE DEVELOPER |
| AD6 | Team ID real (não placeholder) | ⏳ PENDENTE APPLE DEVELOPER |

**Não alterado:** Bundle Identifier, Team, certificados, profiles.

---

## 3. Fase 2 — Credenciais EAS

### Comandos executados (só leitura)

```text
eas whoami          → manuc98 / manuc98@icloud.com
eas project:info    → @manuc98/centflow (4014cf35-…)
eas device:list --non-interactive
  → ERRO: "No Apple teams found for account manuc98."
eas credentials -p ios --json --non-interactive
  → flags não suportados nesta versão CLI (comando interactivo)
```

### Estado

| Credencial | Estado |
|------------|--------|
| Apple Team ligado ao Expo | 🔴 **Nenhum** |
| Distribution Certificate | 🔴 Desconhecido / ausente |
| Provisioning Profile (Ad Hoc / internal) | 🔴 Ausente (bloqueio histórico RC2) |
| App Store / Store distribution | Último build iOS `965b81f2` (production) **ERRORED** (21 Jun 2026) |
| Development profile | Não auditado (perfil beta = `distribution: internal`) |

### Política deste sprint

- **Não** criar certificados automaticamente  
- **Não** revogar certificados existentes  
- **Não** apagar provisioning profiles  
- **Não** substituir credenciais sem confirmação explícita  

Build histórico iOS relevante:

| Build ID | Profile | Estado | Nota |
|----------|---------|--------|------|
| `965b81f2-cfc8-4da4-8720-f6b8a85d4958` | production / STORE | ERRORED | Fase «Resolve build configuration» — **não é RC2 beta** |

---

## 4. Fase 3 — UDID

| Item | Estado |
|------|--------|
| Lista de devices EAS | Falhou — sem Apple Team |
| UDID do iPhone do tester | ⏳ **Não registado / não confirmado** |
| `eas device:create` | **Não executado** — requer Apple login interactivo |

### Guia (quando autorizares — correr no teu terminal)

```bash
# 1) Ligar Apple Developer ao EAS (interactivo — pede Apple ID)
npx eas credentials -p ios

# Escolher: profile beta / internal (Ad Hoc)
# Autenticar Apple Team — NÃO escolher "revoke" / "delete" se perguntado
# Preferir: usar certificado existente se existir; só criar se não houver nenhum

# 2) Registar iPhone
npx eas device:create
# Abrir URL no iPhone → instalar perfil → copiar UDID / confirmar no EAS

# 3) Confirmar devices
npx eas device:list

# 4) Se o Ad Hoc profile não incluir o novo UDID:
#    regenerar provisioning NO EAS com confirmação explícita
#    (não revogar Distribution Certificate)
```

Após UDID registado: o **Provisioning Ad Hoc** precisa tipicamente de **regeneração** para incluir o device. Pedir confirmação antes de regenerar.

---

## 5. Fase 4 — Apple Sign-In & Supabase (local)

### Código — OK

| Item | Estado |
|------|--------|
| `expo-apple-authentication` | ✅ |
| `usesAppleSignIn: true` | ✅ |
| `signInWithIdToken({ provider: 'apple' })` | ✅ `lib/supabase/auth.ts` |
| Botão só iOS | ✅ `AppleSignInButton` + platform gate |
| Scheme redirect app | `centflow` |

### Dashboard / Apple — **PENDENTE DASHBOARD** / **PENDENTE APPLE DEVELOPER**

Ver `docs/supabase-external-checklist.md` (A1–A7):

- Apple provider activo no Supabase  
- Services ID / Secret  
- Bundle ID alinhado  
- Capability no App ID  

**Não assumido neste sprint.**

---

## 6. Fase 5 — Preflight (executado 16 Jul 2026)

| Comando | Resultado |
|---------|-----------|
| `npx npm@10.9.4 ci` | ✅ 1328 packages |
| `npm test` | ✅ **487/487** |
| `npx tsc --noEmit` | ✅ **0 erros** |
| `EAS_BUILD_PROFILE=beta npx expo config --type public` | ✅ CentFlow Beta · bundle · Apple Sign-In · canal preview |
| `npx expo-doctor` | ⚠️ 17/21 (warnings conhecidos — não bloqueiam IPA) |
| `npm run assets:validate-icons` | ✅ |
| `npm run handoff` | ✅ |

---

## 7. Fase 6 — Build IPA

| Campo | Valor |
|-------|-------|
| Comando previsto | `EAS_NO_VCS=1 npm run eas:build:beta:ios` |
| Executado | **NÃO** |
| Motivo | Sem Apple Team no EAS → sem Ad Hoc credentials → build falharia como no bloqueio histórico |

### Critérios para autorizar build

1. Apple Team visível em `eas device:list`  
2. ≥1 UDID registado (teu iPhone)  
3. Distribution Certificate + Provisioning Ad Hoc para `com.everyft1me.centflow`  
4. Confirmação humana de que **não** se revogou nada  
5. (Recomendado) Capability Sign in with Apple no App ID  
6. Preflight continua verde  

---

## 8. Artefacto IPA

| Campo | Valor |
|-------|-------|
| Build ID | — |
| Status | **NÃO GERADO** |
| IPA URL | null |
| Logs URL | — |

---

## 9. Device install

**NOT RUN** — sem IPA.

`RC1_RELEASE_GATE` / TestFlight: **não** mudar para aprovado até instalação confirmada.

---

## 10. Próximo passo (humano)

1. No terminal do projecto (interactivo):

```bash
npx eas credentials -p ios
```

2. Autenticar Apple Developer (conta com membership activa).  
3. Para distribuição **internal/Ad Hoc** do perfil `beta`: garantir certificado + profile — **criar só se não existir**; nunca revogar sem confirmação.  
4. Registar iPhone:

```bash
npx eas device:create
npx eas device:list
```

5. Confirmar no Apple Developer: App ID + Sign in with Apple.  
6. Confirmar no Supabase: Apple provider (**PENDENTE DASHBOARD**).  
7. Voltar a autorizar: `EAS_NO_VCS=1 npm run eas:build:beta:ios`

---

## 11. Confirmações

| Item | Confirmado |
|------|------------|
| Sem commit / push / OTA | ✅ |
| Sem build iOS iniciado | ✅ |
| Sem alteração Android | ✅ |
| Sem revogação de certificados | ✅ |
| Sem criação automática de credenciais | ✅ |
| Bundle Identifier inalterado | ✅ |
