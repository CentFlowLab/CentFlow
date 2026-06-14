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
