# Google OAuth — CentFlow

Login com Google via Supabase Auth + `expo-auth-session` + deep link `centflow://auth/callback`.

## Código (app)

| Ficheiro | Função |
|----------|--------|
| `lib/supabase/auth.ts` | `signInWithGoogleNative()`, `completeGoogleOAuthFromUrl()` |
| `lib/auth/google-oauth.config.ts` | Redirect URI (`centflow://auth/callback`) |
| `lib/auth/oauth-callback.ts` | Parse query + hash do callback |
| `app/auth/callback.tsx` | Ecrã que completa sessão após redirect |
| `components/auth/GoogleSignInButton.tsx` | Botão UI |

## Supabase Dashboard

1. **Authentication → Providers → Google** → Enable
2. Colar **Client ID** e **Client Secret** do Google Cloud Console
3. **Authentication → URL Configuration → Redirect URLs** — adicionar:
   - `centflow://auth/callback`
   - `centflow://**`
   - `exp://**` (Expo Go / dev client)
   - `https://oxhjfwmhcwadlltinlck.supabase.co/auth/v1/callback`

## Google Cloud Console

1. **APIs & Services → Credentials → OAuth 2.0 Client**
2. Tipo **Web application** (para Supabase)
3. **Authorized redirect URIs:**
   - `https://oxhjfwmhcwadlltinlck.supabase.co/auth/v1/callback`
4. (Opcional Android) Client Android com SHA-1 do keystore EAS

## Testar

1. Build beta com `EXPO_PUBLIC_MOCK_AUTH=false` e variáveis Supabase
2. Login → **Continuar com Google**
3. Browser abre → autentica → regressa à app → Dashboard

## Erros comuns

| Sintoma | Solução |
|---------|---------|
| «Provider is not enabled» | Activar Google no Supabase |
| `redirect_uri_mismatch` | Verificar URI no Google Cloud |
| Callback sem sessão | Confirmar `centflow://auth/callback` nos Redirect URLs Supabase |
| Conta email já existe | Entrar com password ou ligar identidades no Supabase |
