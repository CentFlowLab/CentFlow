# Compliance Release Report — CentFlow

> Sprint Compliance Release Candidate — Julho 2026  
> **Sem commit · sem push · sem OTA · sem build EAS**

---

## Resumo executivo

Foram resolvidos os **bloqueadores P0 de compliance** identificados na auditoria anterior: política de privacidade, termos, eliminação de conta, Sign in with Apple (código), e consentimento de telemetria opcional. A app está significativamente mais próxima de **Release Candidate**, com ressalva explícita de **revisão jurídica** e **novo build nativo** para Apple Sign-In e Sentry.

**Recomendação: 🟢 RELEASE CANDIDATE** (técnico) · **🟡 TestFlight/Play Closed Testing** até revisão jurídica + URL pública da política.

---

## 1. Política criada

| Artefacto | Estado |
|-----------|--------|
| `docs/legal/privacy-policy.md` | ✅ v1.0.0 · 2026-07-13 |
| `lib/legal/privacy-policy.content.ts` | ✅ Secções completas (RGPD, OCR, OB, analytics, etc.) |
| `app/legal/privacy.tsx` | ✅ Leitura in-app com `LegalDocumentScreen` |
| `app/settings/privacy.tsx` | ✅ Links + toggles + eliminar conta |

⚠️ **Revisão jurídica obrigatória** antes de publicação. Texto neutro, sem garantia de conformidade.

---

## 2. Termos criados

| Artefacto | Estado |
|-----------|--------|
| `docs/legal/terms.md` | ✅ v1.0.0 |
| `lib/legal/terms.content.ts` | ✅ |
| `app/legal/terms.tsx` | ✅ |

---

## 3. Delete Account implementado

| Item | Estado |
|------|--------|
| RPC `delete_own_account()` | ✅ Já existia em Supabase |
| `lib/account/delete-account.service.ts` | ✅ Re-auth password ou frase `ELIMINAR` (OAuth) |
| `app/settings/delete-account.tsx` | ✅ Fluxo completo com loading/erro/confirmação |
| Limpeza local | ✅ `clearSession`, SecureStore (biometria, PIN, migração, consentimento), `queryClient.clear()` |
| Logout pós-delete | ✅ `signOut` + redirect login |
| Testes | ✅ `lib/account/delete-account.test.ts` |

---

## 4. Apple Login implementado

| Item | Estado |
|------|--------|
| `expo-apple-authentication` | ✅ Instalado ~56.0.4 |
| `app.json` | ✅ Plugin + `usesAppleSignIn: true` |
| `lib/supabase/auth.ts` | ✅ `signInWithIdToken` provider apple |
| Botão iOS | ✅ `AppleSignInButton` em login + registo |
| Android | ✅ Botão **não** mostrado (`Platform.OS !== 'ios'`) |
| Mock dev | ✅ `createMockAppleSession` |
| Testes | ✅ `lib/auth/apple-sign-in.test.ts` (plataforma pura) |

⚠️ **Novo build EAS obrigatório** — plugin nativo não entra por OTA. Configurar Apple provider no Supabase Dashboard.

---

## 5. Consentimento implementado

| Item | Estado |
|------|--------|
| `PrivacyConsentGate` | ✅ Primeira abertura — modal bloqueante |
| Essencial vs opcional | ✅ Essencial documentado; analytics + Sentry opcionais |
| `lib/privacy/consent.memory.ts` + storage | ✅ SecureStore |
| Analytics Supabase | ✅ Só persiste com `productAnalytics: true` |
| Sentry | ✅ `initSentry` só com `crashReporting: true` |
| Alterar depois | ✅ Definições → Privacidade → toggles |
| Doctor | ✅ Continua em beta/dev (diagnóstico local) |
| Testes | ✅ `lib/privacy/consent.test.ts` (3 testes) |

---

## 6. Links legais

| Local | Estado |
|-------|--------|
| Login | ✅ `LegalLinksFooter` |
| Registo | ✅ `LegalLinksFooter` |
| Definições | ✅ `LegalLinksFooter` |
| Privacidade (settings) | ✅ Botões para `/legal/privacy` e `/legal/terms` |
| Modal consentimento | ✅ Links inline |

---

## 7. Checklist Apple

Ver `docs/store/app-review-checklist.md`.

| Área | Estado |
|------|--------|
| Sign in with Apple (código) | ✅ |
| Delete account in-app | ✅ |
| Privacy policy in-app | ✅ |
| Privacy policy URL pública | ⏳ Pendente |
| Revisão jurídica | ⏳ Pendente |
| App Privacy Details (Connect) | ⏳ Preencher com `privacy-labels.md` |
| Conta demo para revisão | ⏳ Criar no Supabase |
| Build com Apple entitlement | ⏳ Novo IPA |

---

## 8. Checklist Google

| Área | Estado |
|------|--------|
| Data safety form | ⏳ Preencher com `privacy-labels.md` |
| Delete account | ✅ |
| Política privacidade link | ⏳ URL pública |
| RECORD_AUDIO removido | ✅ |
| Play descrição/metadata | ✅ `docs/store/` |

---

## 9. Ficheiros criados

```
docs/legal/privacy-policy.md
docs/legal/terms.md
docs/legal/export-deletion.md
docs/store/*.md (9 ficheiros)
docs/release-process.md
docs/versioning.md
app/legal/privacy.tsx
app/legal/terms.tsx
app/legal/_layout.tsx
app/settings/delete-account.tsx
lib/legal/*
lib/account/*
lib/privacy/*
lib/auth/apple-sign-in*.ts
components/legal/*
components/privacy/*
components/auth/AppleSignInButton.tsx
COMPLIANCE_RELEASE_REPORT.md
```

---

## 10. Ficheiros alterados

```
app/settings/privacy.tsx
app/(auth)/login.tsx
app/(auth)/register.tsx
app/_layout.tsx
app/settings/index.tsx
app.json
package.json (+ expo-apple-authentication)
lib/supabase/auth.ts
lib/supabase/config.ts
lib/auth/auth.service.ts
lib/auth/auth.context.tsx
lib/auth/mock-auth.ts
lib/analytics/analytics.service.ts
lib/sentry/init.ts
lib/sentry/bootstrap.ts
lib/security/secureStorage.ts
lib/navigation/href.ts
components/auth/index.ts
scripts/handoff.config.json
```

---

## 11. Testes executados

```bash
npm test        → 487/487 pass (+6 novos)
npx tsc --noEmit → 0 erros
npm run handoff  → HANDOFF.md gerado
```

Novos testes:
- `lib/account/delete-account.test.ts` (2)
- `lib/auth/apple-sign-in.test.ts` (1)
- `lib/privacy/consent.test.ts` (3)

---

## 12. Resultado TypeScript

**0 erros** (`npx tsc --noEmit`)

---

## 13. Resultado handoff

```
npm run handoff → ✓ HANDOFF.md gerado
```

Fase actualizada: `Compliance Release Candidate`

---

## 14. Bloqueadores restantes

| ID | Bloqueador | Severidade |
|----|------------|------------|
| R1 | Revisão jurídica dos textos legais | Crítico (publicação) |
| R2 | URL pública política + termos (website) | Crítico (lojas) |
| R3 | Novo build EAS (Apple Sign-In + Sentry nativo) | Alto |
| R4 | Configurar Apple provider no Supabase | Alto |
| R5 | Conta de teste para App Review | Médio |
| R6 | Preencher App Store Connect / Play Console forms | Médio |
| R7 | `eas submit` placeholders (Apple ID fictício) | Médio |

**Resolvido neste sprint:** política placeholder, termos ausentes, delete account UI, analytics sem consentimento, Apple Sign-In código, RECORD_AUDIO.

---

## 15. Scores

| Dimensão | Antes | Depois |
|----------|-------|--------|
| Financial Core | 95 | **95** |
| UX | 82 | **84** |
| Security | 82 | **86** |
| Compliance | 55 | **78** |
| Release Readiness | 70 | **82** |

---

## 16. Recomendação

| Nível | Veredicto |
|-------|-----------|
| ❌ BLOQUEAR | Não |
| 🟡 BETA PÚBLICA CONTROLADA | Superado |
| 🟢 **RELEASE CANDIDATE** | **Sim** (técnico) |
| 🟢 TestFlight External | Parcial — após R1–R4 |
| 🟢 Google Play Closed Testing | Parcial — após R1–R2 + Data Safety |
| 🟢 Release pública | Não — requer revisão jurídica |

---

*Documentação complementar: `docs/release-process.md`, `docs/versioning.md`, `RELEASE_CANDIDATE_REPORT.md` (auditoria anterior).*
