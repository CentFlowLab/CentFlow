# Arquitectura CentFlow

## Visão geral

App Expo (SDK 56) + Expo Router + TypeScript + TanStack Query + Supabase.

```
app/           → ecrãs e rotas (Expo Router)
components/    → UI reutilizável por domínio
hooks/         → queries, mutations, lógica de ecrã
lib/           → domínio, API, auth, persistência
supabase/      → migrations e schema remoto
```

## Onde está a verdade?

| Domínio | Fonte de verdade | Cache local |
|---------|------------------|-------------|
| Movimentos | Supabase `transactions` | React Query |
| Subscrições / créditos | Supabase `liabilities` | SecureStore + Query |
| Ativos (objetivos, garantias, inventário) | Supabase | React Query |
| Perfil / onboarding | Supabase + SecureStore | SecureStore |
| Preferências | Supabase + SecureStore | SecureStore |
| OCR / talões | Pipeline local (`lib/receipt/`) | Ficheiro + movimento criado |

**Regra:** dados financeiros remotos vivem no Supabase; SecureStore é fallback offline e preferências sensíveis. Tokens nunca em AsyncStorage.

## Módulos `lib/` (estado actual)

```
lib/
├── analytics/      eventos de produto
├── api/            fetch, queryClient, token
├── auth/           sessão Supabase + SecureStore
├── credit/         simulador de crédito
├── csv/            importação CSV
├── data/           agregações e transformações
├── diagnostics/    log global (beta/dev)
├── export/         PDF + partilha
├── home/           stories e dados do Início
├── liabilities/    créditos e subscrições
├── onboarding/     fluxo, features activas, personalização
├── preferences/    tema, moeda, região
├── receipt/        OCR, preprocessamento, parsing
├── storage/        pending subscriptions, liabilities local
├── subscriptions/  deteção automática
├── theme/          cores, spacing, tipografia
├── types/          tipos partilhados
└── utils/          helpers genéricos
```

## Evolução: `lib/domain/financial/`

Domínio financeiro consolidado (movimentos, contas, orçamento, cartões, créditos, sugestões). Ver [financial-domain.md](./financial-domain.md).

## Segurança

- Auth Supabase com adapter `expo-secure-store`
- Tokens em memória (`lib/api/token.ts`) sincronizados com SecureStore
- Diagnóstico activo só em `development` e `beta`

## Builds e entrega

Ver [build.md](./build.md) e [beta.md](./beta.md).
