# CentFlow — Build Beta (dados reais)

Builds Beta usam **apenas Supabase** — sem login mock, sem dados de demonstração e sem OCR fictício.

## Gerar APK/IPA Beta (Android / iPhone)

```bash
cd centflow

# Android APK (recomendado para testadores)
npm run eas:build:beta:android

# iOS (testes internos)
npm run eas:build:beta:ios
```

Perfil EAS: **`beta`** (`EXPO_PUBLIC_APP_VARIANT=beta`, mock desligado, Supabase activo).

## Variáveis de ambiente (perfil `beta`)

| Variável | Valor Beta |
|----------|------------|
| `EXPO_PUBLIC_APP_VARIANT` | `beta` |
| `EXPO_PUBLIC_MOCK_AUTH` | `false` |
| `EXPO_PUBLIC_USE_MOCK` | `false` |
| `EXPO_PUBLIC_MOCK_OCR` | `false` |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projecto |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave anon |

## Desenvolvimento local com mock

```bash
# .env ou Expo Go (por defeito em __DEV__)
EXPO_PUBLIC_APP_VARIANT=development
EXPO_PUBLIC_MOCK_AUTH=true
```

Para testar Supabase no telemóvel em dev:

```bash
EXPO_PUBLIC_APP_VARIANT=development
EXPO_PUBLIC_MOCK_AUTH=false
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## OTA no canal preview

Updates JavaScript no canal `preview` aplicam-se a builds gerados com perfil `beta` ou `preview` (mesmo canal).

```bash
npm run eas:update:preview -- "mensagem do update"
```

**Nota:** alterações nativas (`app.json`, plugins) exigem novo build — não passam por OTA.

## O que acontece se o Supabase falhar

Em Beta/Produção a app **não** mostra dados fictícios. Os ecrãs exibem estados de erro com opção de tentar novamente.

## Autenticação (registo / Google)

### Erro «email rate limit exceeded»

O Supabase limita quantos emails de confirmação/recuperação pode enviar por hora (plano gratuito ≈ 2–4/hora).

**Solução rápida para testes Beta:**

1. [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers** → **Email**
2. Desactiva **«Confirm email»** — o registo passa a criar sessão imediata **sem enviar email**
3. Aguarda 30–60 min se o limite ainda estiver activo

**Alternativa:** cria o utilizador manualmente em **Authentication → Users → Add user** (email + password) e usa **Entrar** na app.

### Login com Google

#### Erro «Unsupported provider: provider is not enabled»

O provider Google está **desactivado** no projecto Supabase. A app está correcta; falta configuração no dashboard:

1. [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers** → **Google**
2. Activa o toggle **Enable Sign in with Google**
3. Copia o **Client ID** e **Client Secret** do tipo **Web application** (Google Cloud Console → APIs & Services → Credentials)
4. Guarda as alterações no Supabase

#### Redirect URLs (obrigatório)

**Supabase** → Authentication → URL Configuration → Redirect URLs:

- `centflow://auth/callback`
- `centflow://**`

#### Android (SHA-1)

**Google Cloud Console** → OAuth → Android client com **SHA-1** do keystore EAS (`eas credentials`).

Sem o SHA-1 Android, o Google OAuth falha no telemóvel mesmo com o provider activo.
