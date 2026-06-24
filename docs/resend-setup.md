# Resend — setup CentFlow

## TL;DR (só precisas de colar a API key)

1. Conta + API key em https://resend.com/api-keys
2. Copia o template de secrets:
   ```powershell
   copy supabase\secrets.env.example supabase\secrets.env
   ```
3. Edita `supabase/secrets.env` — cola `RESEND_API_KEY=re_...`
4. Corre **uma vez** (publica secrets + deploy functions):
   ```powershell
   npm run email:setup
   ```
5. Testa na app: **Perfil → CentFlow Doctor → envio real → Boas-vindas**

O script gera `EMAIL_CRON_SECRET`, escolhe remetente sandbox/produção e faz deploy.  
**Não commites** `supabase/secrets.env`.

---

**Projecto Supabase:** `oxhjfwmhcwadlltinlck`  
**URL:** https://oxhjfwmhcwadlltinlck.supabase.co  
**Remetente produção:** `CentFlow <noreply@mail.centflow.app>`

Emails de **auth** (reset password, confirmação) continuam pelo **Supabase Auth** — este guia é só para lifecycle via Resend.

---

## Visão geral

```
App (Doctor / registo)
    → Edge Function send-email
        → Resend API (RESEND_API_KEY)
            → caixa de entrada do utilizador

Cron (GitHub Actions ou externo)
    → Edge Function email-jobs
        → mesma cadeia Resend
```

Secrets **nunca** vão na app — só no Supabase (Edge Functions → Secrets).

---

## Modos em secrets.env

| `EMAIL_MODE` | `EMAIL_FROM` efectivo | Destinatários |
|--------------|----------------------|---------------|
| `sandbox` (default) | `CentFlow <onboarding@resend.dev>` | Só o email da tua conta Resend |
| `production` | valor de `EMAIL_FROM` | Qualquer utilizador (domínio verificado) |

---

## Fase 1 — Conta e API key (5 min)

1. Abre https://resend.com e cria conta (GitHub ou email).
2. **API Keys** → **Create API Key**
   - Nome: `CentFlow Supabase`
   - Permissão: **Sending access** (ou Full access se for a única key)
3. Copia a key (`re_...`) — **só aparece uma vez**. Guarda num gestor de passwords.

---

## Fase 2A — Teste rápido (sem domínio)

`EMAIL_MODE=sandbox` em `supabase/secrets.env` (default no example).

Limitação: só recebes email se a **conta da app** usar o **mesmo email** que a conta Resend.

---

## Fase 2B — Produção (domínio centflow.app)

1. Resend → **Domains** → **Add Domain** → `mail.centflow.app`
2. DNS (Cloudflare: botão automático no Resend)
3. Em `supabase/secrets.env`:
   ```
   EMAIL_MODE=production
   EMAIL_FROM=CentFlow <noreply@mail.centflow.app>
   ```
4. `npm run email:setup` outra vez

---

## Cron automático (GitHub Actions)

Workflow `.github/workflows/email-jobs-cron.yml` — corre de hora em hora.

Depois do `email:setup`, adiciona em **GitHub → Settings → Secrets → Actions**:

| Secret | Valor |
|--------|-------|
| `EMAIL_CRON_SECRET` | o mesmo que em `supabase/secrets.env` |

Sem este secret o workflow ignora silenciosamente (não falha o CI).

Alternativa manual:
```
POST https://oxhjfwmhcwadlltinlck.supabase.co/functions/v1/email-jobs
Header: x-cron-secret: <EMAIL_CRON_SECRET>
```

---

## Comandos npm

| Comando | O que faz |
|---------|-----------|
| `npm run email:setup` | Secrets Supabase + deploy send-email + email-jobs |
| `npm run email:deploy` | Só redeploy das functions (sem alterar secrets) |

---

## Checklist final

- [ ] `RESEND_API_KEY` em `supabase/secrets.env`
- [ ] `npm run email:setup` concluído sem erros
- [ ] Doctor mostra «Resend activo» ou «Modo teste Resend»
- [ ] Teste envio real OK
- [ ] (Produção) Domínio Verified no Resend
- [ ] (Produção) `EMAIL_CRON_SECRET` no GitHub Secrets

---

## Erros comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `RESEND_API_KEY não configurada` | Secret em falta / sem redeploy | `npm run email:setup` |
| 403 Resend — own email only | Sandbox + destinatário diferente | Mesmo email ou `EMAIL_MODE=production` |
| 403 domain not verified | `EMAIL_FROM` com domínio não verificado | Espera DNS / corrige domínio |
| Doctor: Resend indisponível | Function antiga | `npm run email:deploy` |

---

## Auth vs Lifecycle

| Tipo | Provider | Config |
|------|----------|--------|
| Reset password, confirmar email | Supabase Auth | Dashboard → Auth → Email Templates |
| Welcome, resumos, lembretes | Resend | Este guia |

Templates auth em `supabase/templates/` (confirmation, recovery, email_change).

---

## Referências

- [Resend — Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Resend — 403 sandbox](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
- Código: `supabase/functions/_shared/email/provider.ts`
