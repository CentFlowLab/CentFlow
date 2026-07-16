# Supabase External Checklist — CentFlow RC2

> Confirmar **manualmente** no Dashboard — não assumido neste sprint.  
> Marcar: ☐ Pendente · ☑ Confirmado · ✗ Bloqueador

---

## Apple Sign-In

| # | Item | Estado | Notas |
|---|------|--------|-------|
| A1 | Apple provider activo | ☐ Pendente Dashboard | Authentication → Providers |
| A2 | Services ID / Client ID correcto | ☐ Pendente Dashboard | Alinhar com Apple Developer |
| A3 | Secret válido (não expirado) | ☐ Pendente Dashboard | Rotação periódica |
| A4 | Redirect URL Supabase callback | ☐ Pendente Dashboard | `https://<project>.supabase.co/auth/v1/callback` |
| A5 | Bundle ID `com.everyft1me.centflow` | ☐ Pendente Apple Developer | App ID capability |
| A6 | Sign in with Apple capability no App ID | ☐ Pendente Apple Developer | |
| A7 | Email relay Apple (se aplicável) | ☐ Pendente Dashboard | |

---

## Google OAuth

| # | Item | Estado | Notas |
|---|------|--------|-------|
| G1 | Google provider activo | ☐ Pendente Dashboard | |
| G2 | Web client ID no Supabase | ☐ Pendente Dashboard | Mesmo ID no Google Cloud |
| G3 | iOS client ID (se usado) | ☐ Pendente Dashboard | |
| G4 | Android client ID | ☐ Pendente Dashboard | |
| G5 | Redirect URI no Google Cloud | ☐ Pendente Google Console | `https://oxhjfwmhcwadlltinlck.supabase.co/auth/v1/callback` |
| G6 | SHA-1 fingerprint Android (EAS keystore) | ☐ Pendente Google Console | Obter via `eas credentials -p android` |
| G7 | SHA-256 fingerprint Android | ☐ Pendente Google Console | Recomendado 2026 |
| G8 | Package name `com.everyft1me.centflow` | ☐ Pendente Google Console | |

---

## URLs e deep links

| # | Item | Estado | Valor esperado |
|---|------|--------|----------------|
| U1 | Site URL | ☐ Pendente Dashboard | `centflow://` ou HTTPS |
| U2 | `centflow://auth/callback` | ☐ Pendente Dashboard | Google OAuth return |
| U3 | `centflow://**` wildcard | ☐ Pendente Dashboard | Recomendado |
| U4 | `centflow://reset-password` | ☐ Pendente Dashboard | Password recovery |
| U5 | `centflow://open-banking/callback` | ☐ Pendente Dashboard | GoCardless |
| U6 | Confirm email desactivado (beta test) | ☐ Opcional Dashboard | Ver `docs/beta.md` |

---

## Conta e dados

| # | Item | Estado | Notas |
|---|------|--------|-------|
| D1 | RPC `delete_own_account` aplicada | ☐ Pendente Dashboard | Migration `20240626000000` |
| D2 | RLS activa em tabelas user-scoped | ☐ Pendente Dashboard | 32 migrations locais |
| D3 | Storage bucket `receipts` | ☐ Pendente Dashboard | Policies por user folder |
| D4 | Conta de teste dedicada beta | ☐ Pendente | Não usar produção pessoal |

---

## Edge Functions e secrets

| # | Function | Secret | Deploy | Estado |
|---|----------|--------|--------|--------|
| E1 | `process-receipt` | `GOOGLE_VISION_API_KEY` | ☐ | ☐ Pendente Dashboard |
| E2 | `gocardless` | `GOCARDLESS_*` | ☐ | ☐ Pendente Dashboard |
| E3 | `financial-assistant` | `ANTHROPIC_API_KEY` | ☐ | ☐ Pendente Dashboard |
| E4 | `send-email` | `RESEND_API_KEY` | ☐ | ☐ Pendente Dashboard |
| E5 | `email-jobs` | `EMAIL_CRON_SECRET` | ☐ | ☐ Pendente Dashboard |
| E6 | `spending-benchmarks` | — | ☐ | ☐ Pendente Dashboard |

---

## Referências código

- Redirect allow list: `lib/auth/google-oauth.config.ts`
- Apple Sign-In: `lib/supabase/auth.ts`, `lib/auth/apple-sign-in.ts`
- Delete account: `lib/account/delete-account.service.ts`
- Open Banking callback: `lib/open-banking/gocardless.service.ts`
