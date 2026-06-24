# Email lifecycle — CentFlow

Sistema de emails transaccionais e lifecycle para activação, retenção e lembretes úteis.

## Arquitectura

```
Supabase Edge Functions (serverless)
├── send-email      → envio individual / teste dev
├── email-jobs      → cron (inatividade, onboarding, prazos, resumo)
└── _shared/email/  → templates, Resend, anti-spam, dispatch

App mobile
├── lib/email/           → tipos, deep links, dev tools
├── settings/notifications → preferências opt-in
└── CentFlow Doctor      → falhas de envio (sem dados sensíveis)
```

**Provider:** [Resend](https://resend.com) via `RESEND_API_KEY` (apenas no servidor).

## Tipos de email

| Tipo | Trigger | Opt-out |
|------|---------|---------|
| `welcome` | Conta criada (< 2h) | Nunca (conta) |
| `onboarding_incomplete` | > 24h sem concluir onboarding | `email_important` |
| `first_step_missing` | > 3 dias sem dados | `email_important` |
| `inactive_7d` | 7–14 dias inactivo | `email_important` |
| `inactive_30d` | 30–45 dias inactivo | `email_important` |
| `warranty_expiring` | Garantia ≤ 30 dias | `email_warranty_alerts` |
| `subscription_renewal` | Renova ≤ 7 dias | `email_subscription_renewals` |
| `credit_payment_due` | Prestação ≤ 7 dias | `email_credit_payments` |
| `weekly_digest` | Domingo UTC + dados | `email_weekly_digest` |
| `tips_insight` | Quarta-feira UTC + dados | `email_tips_insights` |

Emails de **segurança** (reset password, etc.) continuam via **Supabase Auth** — não são geridos aqui.

## Anti-spam

- Máximo **1 email lifecycle por dia** por utilizador
- Deduplicação por tipo (janelas de 7–30 dias consoante o tipo)
- Respeito de opt-out em `user_preferences`
- Registo em `email_events` para auditoria

## Deep links

CTAs usam `centflow://` — handler em `EmailDeepLinkHandler`.

Exemplos:
- `centflow://onboarding`
- `centflow://movimentos?action=new-movement`
- `centflow://precos`

## Configuração (produção)

Ver guia completo: **[docs/resend-setup.md](./resend-setup.md)** — `npm run email:setup` após colocar `RESEND_API_KEY` em `supabase/secrets.env`.

### Secrets Supabase (alternativa manual)

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set EMAIL_FROM="CentFlow <noreply@teudominio.com>"
supabase secrets set EMAIL_CRON_SECRET=...
```

### Deploy functions

```bash
supabase functions deploy send-email
supabase functions deploy email-jobs
```

### Cron (Supabase Dashboard ou pg_cron)

Agendar `email-jobs` de hora em hora ou diariamente:

```
POST https://<project>.supabase.co/functions/v1/email-jobs
Header: x-cron-secret: <EMAIL_CRON_SECRET>
```

### Migration

```bash
supabase db push
```

Aplica `20240621000000_email_lifecycle.sql` (`email_events`, colunas de preferências, helpers SQL).

## Dev / teste

Em dev/beta (`isDiagnosticsEnabled()`):

1. Abrir **CentFlow Doctor** no Perfil
2. Secção «Testar emails lifecycle»
3. Chama `send-email` com JWT do utilizador (preview ou envio real via toggle no Doctor)

## Privacidade

Emails **não incluem** valores financeiros detalhados, IBAN, tokens ou links mágicos completos nos logs.

## Personalização

Templates usam:
- Nome do utilizador
- `primaryObjective` do onboarding (primeiro passo sugerido)
- Preferências de email

Ver `supabase/functions/_shared/email/templates.ts`.
