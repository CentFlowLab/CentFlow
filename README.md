# CentFlow

App de finanças pessoais (PT) — Expo SDK 56, Supabase, TanStack Query.

## Stack

| Camada | Tecnologia |
|--------|------------|
| App | Expo SDK 56, Expo Router, TypeScript |
| UI | React Native, Reanimated 3 |
| Dados | Supabase (Postgres + Auth + RLS) |
| Cache | TanStack Query |
| Domínio | `lib/domain/financial/` (funções puras) |

Estrutura: `/app`, `/lib`, `/components` — **sem** `/src`, Zustand, React Navigation ou SQLite.

## Comandos

```bash
npm install
npm start              # Expo dev
npx tsc --noEmit       # TypeScript
npm test               # testes de domínio (node:test)
npm run handoff        # regenerar HANDOFF.md
```

### Beta / releases

```bash
npm run eas:update:preview -- "mensagem OTA"
npm run eas:update:production -- "mensagem OTA"
```

Ver [docs/beta.md](./docs/beta.md) e [docs/build.md](./docs/build.md).

## Supabase

1. Copiar `.env.example` → `.env` (local, **nunca commitar**).
2. Variáveis: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Migrations: `npx supabase db push` (Windows: usar `npx`, não `supabase` global).

Chaves anon são públicas no cliente; **service role** só em Edge Functions.

## Testes

```bash
npm test
```

Cobertura principal: ledger, orçamento mensal (`budget_enabled`), cartões, transferências, sugestões financeiras.

## OTA

Alterações JS/assets chegam via EAS Update (canais `preview` e `production`). Rebuild nativo (IPA/APK) só quando mudam plugins nativos, permissões ou `runtimeVersion`.

## Documentação

- [docs/README.md](./docs/README.md) — índice
- [docs/architecture.md](./docs/architecture.md) — mapa técnico
- [docs/financial-domain.md](./docs/financial-domain.md) — regras financeiras

## Licença

Ver repositório — beta pública em preparação.
