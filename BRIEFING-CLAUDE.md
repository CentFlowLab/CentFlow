# CentFlow — Briefing para análise (Claude / agent externo)

> **Gerado:** 2026-06-24 · **Git:** `8ef03dc` · **Repo:** CentFlowLab/CentFlow  
> **Instrução:** Lê este documento como contexto completo do estado actual do projecto mobile + backend Supabase.

---

## 1. O que é o CentFlow

App mobile de finanças pessoais (PT). Tagline: *Where does it go?*

- **Stack:** Expo SDK 56, Expo Router, React Native 0.85, TypeScript, TanStack Query
- **Backend:** Supabase (auth, Postgres, Edge Functions, storage)
- **Deploy app:** EAS Build + EAS Update (OTA principal para testes iOS via LiveContainer)
- **Projecto Supabase:** `oxhjfwmhcwadlltinlck` → `https://oxhjfwmhcwadlltinlck.supabase.co`

**Fase actual:** Fase 5 — Movimentos (OCR melhorado → UI confirmação)

---

## 2. Navegação (5 abas)

| Aba | Ficheiro | Estado |
|-----|----------|--------|
| Início | `app/(tabs)/index.tsx` | Dashboard completo |
| Movimentos | `app/(tabs)/movimentos.tsx` | Listar + criar + OCR talões |
| Análises | `app/(tabs)/analises.tsx` | DonutChart + Brain |
| Ativos | `app/(tabs)/ativos.tsx` | Sub-nav + empty states |
| Perfil | `app/(tabs)/perfil.tsx` | Menu + settings |

---

## 3. Emails — estado actual (RECÉM CONFIGURADO)

### Arquitectura

```
App mobile
├── lib/email/                    tipos, deep links, trigger welcome, dev tools
├── app/settings/notifications.tsx   preferências opt-in
├── app/settings/diagnostics.tsx     CentFlow Doctor — teste + histórico
└── components/app/EmailDeepLinkHandler.tsx

Supabase Edge Functions
├── send-email      envio individual / teste / status GET
├── email-jobs      cron (onboarding, inactividade, prazos, resumos)
└── _shared/email/  templates HTML, Resend, anti-spam, dispatch
```

### Provider

- **Lifecycle emails:** [Resend](https://resend.com) via `RESEND_API_KEY` (só servidor)
- **Auth emails** (reset password, confirmação): Supabase Auth (templates em `supabase/templates/`)

### Tipos de email lifecycle

| Tipo | Trigger | Opt-out |
|------|---------|---------|
| `welcome` | Registo + cron (< 2h) | Nunca |
| `onboarding_incomplete` | > 24h sem onboarding | `email_important` |
| `first_step_missing` | > 3 dias sem dados | `email_important` |
| `inactive_7d` / `inactive_30d` | Inactividade | `email_important` |
| `warranty_expiring` | Garantia ≤ 30 dias | `email_warranty_alerts` |
| `subscription_renewal` | Renova ≤ 7 dias | `email_subscription_renewals` |
| `credit_payment_due` | Prestação ≤ 7 dias | `email_credit_payments` |
| `weekly_digest` | Domingo UTC | `email_weekly_digest` |
| `tips_insight` | Quarta UTC | `email_tips_insights` |

### Anti-spam

- Máx. 1 email lifecycle/dia/utilizador
- Deduplicação por tipo (7–30 dias)
- Registo em `email_events` (RLS: user vê só os seus)

### Setup Resend — CONCLUÍDO (2026-06-24)

O utilizador correu com sucesso:

```powershell
npm run email:login    # supabase login
npm run email:setup    # secrets + deploy functions
```

**Estado actual:**

| Item | Valor |
|------|-------|
| Modo | **Sandbox** (`EMAIL_MODE=sandbox`) |
| Remetente | `CentFlow <onboarding@resend.dev>` |
| Secrets Supabase | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_CRON_SECRET` |
| Functions deployadas | `send-email`, `email-jobs` |
| Limitação sandbox | Só envia para o email da conta Resend |

**Comandos npm:**

| Comando | Função |
|---------|--------|
| `npm run email:login` | Autenticar Supabase CLI |
| `npm run email:setup` | Secrets + deploy (lê `supabase/secrets.env`) |
| `npm run email:deploy` | Só redeploy functions |

**Ficheiros chave:**

- `supabase/secrets.env.example` — template (secrets reais em `secrets.env`, gitignored)
- `scripts/setup-resend-email.mjs` — script setup
- `docs/resend-setup.md` — guia completo
- `docs/email-lifecycle.md` — arquitectura lifecycle
- `.github/workflows/email-jobs-cron.yml` — cron horário (precisa `EMAIL_CRON_SECRET` no GitHub)

### Testar emails

1. App → **Perfil → CentFlow Doctor**
2. Verificar linha de estado Resend
3. **Modo: envio real** → **Boas-vindas**
4. Histórico `email_events` na mesma secção

### Pendente email

- [ ] Confirmar recepção email sandbox no Doctor
- [ ] `EMAIL_CRON_SECRET` → GitHub Secrets (activar cron)
- [ ] Produção: verificar `mail.centflow.app` no Resend → `EMAIL_MODE=production` → `npm run email:setup`

---

## 4. Autenticação

- Login, registo, logout, Google OAuth (preparado)
- Sessão: expo-secure-store
- Rotas protegidas: `Stack.Protected` em `app/_layout.tsx`
- Reset password via Supabase Auth + deep link `centflow://reset-password`
- Welcome email dispara após registo (`lib/email/trigger.ts`)

---

## 5. OCR / Movimentos

- Upload talão → `POST /receipts` → OCR → `ConfirmReceiptModal`
- Pré-processamento imagem (resize, contraste, EXIF)
- Heurísticas PT pós-OCR (`lib/receipt/ocr-sanitize.ts`)
- Multi-motor: google_vision → vision → tesseract
- Pendente: melhorar UI `ConfirmReceiptModal`, edição linha a linha itens

---

## 6. Domínio financeiro

- Património líquido: `lib/domain/net-worth.service.ts`
- Dashboard + Análises com fallback composto se API 404
- Mocks em dev quando `EXPO_PUBLIC_MOCK_AUTH=true`

---

## 7. Estrutura de pastas (resumo)

```
app/                    Expo Router (tabs, auth, settings)
components/             UI, dashboard, movements, settings
lib/
  auth/                 AuthContext, service, schemas
  email/                lifecycle client-side
  domain/               net-worth, regras negócio
  receipt/              OCR pipeline client
  supabase/             client, types, mappers
hooks/                  TanStack Query
supabase/
  functions/            Edge Functions (send-email, email-jobs, process-receipt)
  migrations/           SQL schema
  templates/            HTML auth emails
scripts/                handoff, eas-run, setup-resend-email
docs/                   build, email, resend-setup, security
```

---

## 8. Concluído (highlights)

- Base Expo 56 + design system dark premium
- Auth completa + rotas protegidas
- Dashboard, Análises, Movimentos (CRUD básico + OCR)
- EAS Build + OTA (preview + production)
- Segurança: password policy, biometria, CentFlow Doctor
- **Emails lifecycle completo + Resend activo (sandbox)**

---

## 9. Pendente (prioridades)

1. Testar envio real Resend no Doctor
2. Cron GitHub (`EMAIL_CRON_SECRET`)
3. Domínio email produção (`mail.centflow.app`)
4. Melhorar UI `ConfirmReceiptModal`
5. Editar/eliminar movimentos
6. CRUD ativos (objectivos, garantias, inventário)
7. Google OAuth activar no Supabase
8. `npx eas init` se ainda não ligado

---

## 10. Comandos úteis

```bash
npm start                    # dev
npm run handoff              # regenerar HANDOFF.md
npx tsc --noEmit             # typecheck
npm run email:setup          # Resend secrets + deploy
npm run eas:update:preview -- "mensagem"
```

---

## 11. O que pedir ao Claude para analisar

Sugestões de foco:

1. **Revisão arquitectura emails** — anti-spam, templates, jobs, edge cases
2. **Próximo passo produção Resend** — DNS, deliverability, DMARC
3. **ConfirmReceiptModal** — UX pós-OCR
4. **Segurança** — RLS, secrets, Doctor em produção
5. **Roadmap Fase 5→6** — priorização features

---

## 12. Documentos relacionados no repo

| Ficheiro | Conteúdo |
|----------|----------|
| `HANDOFF.md` | Handoff auto-gerado (árvore ficheiros, mocks, fases) |
| `docs/resend-setup.md` | Setup Resend passo a passo |
| `docs/email-lifecycle.md` | Lifecycle emails |
| `docs/build.md` | EAS Build/Update |
| `docs/security.md` | Políticas segurança |
| `AGENTS.md` | Expo SDK 56 docs |

---

*Este briefing não contém secrets. `supabase/secrets.env` está no .gitignore.*
