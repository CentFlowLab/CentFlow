# CLAUDE.md — Instruções técnicas do Miven

Documento de referência para quem desenvolve no projeto (pessoas e agentes de IA). Ler também
[AGENTS.md](AGENTS.md) (regras Expo), [docs/architecture.md](docs/architecture.md) e
[docs/decisions.md](docs/decisions.md).

## Estado

Fases 0 a 4 e a parte da Fase 5 sem fornecedor externo estão no cliente. **Produção e staging
têm o mesmo histórico, `20261108000100` a `20261110001100`** (`001000` e `001100`, nome de
utilizador e ADR-038, na produção desde 2026-11-10; produção desde 2026-11-09, ver
[docs/release-producao.md](docs/release-producao.md)). Funções `delete-account` e
`suggest-entry` nos dois ambientes; falta o segredo `ANTHROPIC_API_KEY`.
**O Miven só se usa com conta (ADR-034):** sem sessão só há boas-vindas e autenticação, e não se
abre base de dados. Os links dos emails vão para `https://miven.pt/auth/...` (site estático em
`site/`, GitHub Pages), que reencaminha para `miven://`. Emails da autenticação com a marca e na
língua da app (ADR-035), enviados pelo Resend (`noreply@miven.pt`). Logótipo B (ADR-036).
A cópia de segurança fica fora do git e de pastas sincronizadas: contém o esquema `auth`.
Política de privacidade e termos da fase de testes em `site/privacidade` e `site/termos`
(ligados no site, no registo e em Definições). Falta o nome do responsável pelo tratamento (D-4);
qualquer novo fornecedor ou dado pessoal tem de entrar nessas páginas antes de ser usado.
Integrações (ADR-033): Sentry com DSN no EAS; PostHog só com chave e consentimento; Superwall
preparado atrás de `EXPO_PUBLIC_PAYWALL_ENABLED`, sem paywall.
Plataformas (ADR-037): iOS pela fonte SideStore (workflow "iOS IPA"), Android por APK assinado
(workflow "Android APK", release fixa `android-latest`) e web em `https://miven.pt/app/`
(workflow "Site miven.pt", em cada push). Todas usam o ambiente EAS `production`.
Não fazer `git push` sem autorização. Não escrever na produção (`slfgslfzolfvqavuccom`) nem
aplicar migrations remotas sem autorização explícita para esse passo. Staging:
`qlimqcgrgaqzwjmafora`.

## Comandos obrigatórios antes de dar uma tarefa por concluída

```bash
npm run check   # typecheck + lint + prettier --check + jest
```

Para alterações visuais, verificar também na web (`npm run web`) em largura de telemóvel
(< 768px), tablet (768–1199px) e desktop (≥ 1200px), em modo claro e escuro.

## Arquitetura em camadas

```
src/app        → rotas finas; só importam de features
src/features   → ecrãs e lógica de cada área; usam ui, core, i18n, lib, data (só o barrel `@/data`)
src/ui         → design system; usa core e i18n; nunca importa de features
src/core       → TypeScript puro; NÃO importa React, React Native, Expo, ui ou features
src/data       → SQLite local, repositórios, fila de sincronização, hooks de dados
src/i18n       → traduções e formatação localizada
src/lib        → adaptadores (preferências em AsyncStorage; sessão em SecureStore; cliente Supabase)
```

O ESLint bloqueia imports proibidos em `src/core` e impede `app`, `features` e `ui` de importar
`expo-sqlite`, `@/data/db/*` ou `@/data/sqlite/*`.

## Camada de dados (`src/data`)

- **SQL só existe em `src/data/sqlite` e `src/data/db`.** Os ecrãs usam as interfaces de
  `src/data/repositories/types.ts` através de `useRepositories()` (escritas) e
  `useDataQuery((repos) => …)` (leituras que se atualizam sozinhas após cada escrita confirmada).
- As interfaces de repositório não mencionam SQLite: a sincronização fala com o Postgres através
  de RPCs (`sync_push` / `sync_pull`), sem os ecrãs importarem o cliente Supabase.
- `createSqlDatabase` serializa todas as operações numa fila (o `expo-sqlite` usa uma única
  ligação e `withTransactionAsync` não isola transações concorrentes). Escritas compostas usam
  `db.transaction(async (tx) => …)`; validação e regras são verificadas **dentro** da transação.
- **Migrações:** `src/data/db/migrations.ts`, versionadas com `PRAGMA user_version`. Nunca
  alterar uma migração publicada — acrescentar uma nova versão e um teste em
  `src/data/__tests__/database-test.ts`. Uma base de dados mais recente do que a app é recusada
  (`SchemaTooNewError`), sem tocar nos dados.
- Todas as tabelas: `id` UUID gerado no cliente (`expo-crypto`), `created_at`/`updated_at` ISO
  UTC, `deleted_at` (eliminação lógica) e `synced_at` (última confirmação no servidor). Consultas
  filtram sempre `deleted_at IS NULL`.
- Datas de movimentos são datas de calendário locais `YYYY-MM-DD` (`CalendarDate` em
  `src/core/finance/dates.ts`); nunca usar `Date` UTC para decidir o dia ou o mês.
- Erros: `ValidationError` (códigos traduzíveis), `NotFoundError`, `AccountInUseError`,
  `CategoryInUseError`, `DatabaseError` (com `kind`). Nunca mostrar `error.message` ao utilizador.
- Web: precisa de isolamento cross-origin (COOP/COEP) e de exclusividade entre separadores (Web
  Locks). Ver `src/data/open-app-database.ts`, `metro.config.js` e `public/_headers`.
- Testes de dados correm em SQLite real (`node:sqlite` do Node 24, ver
  `src/test-utils/node-sqlite-driver.ts`). Nos testes de ecrãs, `jest.setup.ts` substitui
  `@/data/open-app-database` por uma base de dados nova em memória em cada montagem.

## Regras de domínio

- **Dinheiro é sempre um inteiro em unidades mínimas** (`Money = { amountMinor, currency }`).
  Nunca guardar nem somar valores decimais. Converter com `toMinorUnits` / `toMajorUnits`.
  Entrada do utilizador convertida com `parseAmountInput` (aritmética de strings, sem floats).
  Nos movimentos, `amount` é sempre positivo; o sinal vem do `type`.
- Nunca misturar moedas numa operação (`CurrencyMismatchError`). Uma conta tem uma moeda, que
  fica bloqueada assim que tiver movimentos; transferências só entre contas da mesma moeda.
- Transferências entre contas não são despesas nem rendimentos: só alteram saldos.
- Cálculos financeiros (saldos, resumos mensais, taxa de poupança, tendência) vivem em
  `src/core/finance` e têm testes. Os repositórios agregam em SQL e o `core` interpreta.
- Formatar valores, datas e percentagens apenas através de `useLocaleFormat()` (respeita idioma e
  região do dispositivo). Nunca concatenar símbolos de moeda à mão.

## Regras de UI

- Usar apenas componentes de `@/ui/components` e tokens de `@/ui/theme`
  (`spacing`, `radius`, `typography`, cores semânticas via `useTheme().colors`).
  **Não escrever cores hexadecimais em componentes.** Novas cores entram em `src/ui/theme/colors.ts`
  e têm de passar o teste de contraste WCAG AA (`src/ui/__tests__/theme-test.ts`).
- Texto sempre com `<Text variant=… tone=…>`; valores monetários com `<Amount>` (algarismos tabulares).
- Todo o elemento interativo precisa de `accessibilityRole` e rótulo; alvo mínimo de toque 44px.
- Layout responsivo com `useBreakpoint()` (`compact` / `medium` / `expanded`).
- Ecrãs usam `<Screen>` (safe area, largura máxima, cabeçalho, animação de entrada).
- Áreas não implementadas mostram "Em breve" (`ModulePlaceholderScreen`). **Nunca mostrar números,
  gráficos ou controlos fictícios como se fossem reais.**

## Internacionalização

- `src/i18n/locales/pt-PT.ts` é a fonte de verdade. `en.ts` e `es.ts` são tipados com `Translation`
  — o TypeScript falha se faltarem ou sobrarem chaves.
- Nenhum texto visível pode estar escrito diretamente nos componentes.
- Chaves de `t()` são verificadas em compilação; para chaves dinâmicas, restringir o tipo
  (ver `isPlannedModule` em `nav-items.ts`).

## Navegação

- Expo Router, rotas em `src/app`. Separadores em `src/app/(tabs)`.
- A configuração das áreas está em `src/features/navigation/nav-items.ts`; ao adicionar uma área,
  criar a rota correspondente (há um teste que abre cada rota).
- Telemóvel: barra inferior (3 separadores + botão "+" + "Mais"). Tablet: sidebar compacta.
  Desktop: sidebar completa.
- O registo rápido vive em `/new-transaction` (modal) — ponto de entrada único para o botão "+",
  e futuramente atalhos, widgets e deep links.
- Formulários são modais no `Stack` raiz (`entry/[id]`, `account/new`, `account/[id]`,
  `category/new`, `category/[id]`, `import-statement`, `auth/*`, `sync/conflicts`) e usam
  `<FormScreen>`. As rotas de dados ficam dentro de `Stack.Protected guard={granted}`; uma rota
  nova de dados tem de entrar nesse grupo (ADR-034).
  `unstable_settings.anchor = '(tabs)'` garante que um modal aberto diretamente por URL tem os
  separadores por baixo. Fechar com `closeModal(fallback)`.
- Confirmações usam `<Dialog>` (o `Alert` do React Native não funciona na web).

## Testes

- Jest (`jest-expo`) + `@testing-library/react-native` 14 (`render` e `fireEvent` são assíncronos:
  usar `await`).
- Ficheiros `*-test.ts(x)` em pastas `__tests__` junto ao código. **Nunca colocar testes em `src/app`**
  (tudo lá é tratado como rota).
- Componentes: `renderWithProviders` de `@/test-utils/render`.
- Navegação: `renderRouter('./src/app')` de `expo-router/testing-library`.
- O locale nos testes é sempre pt-PT (mock em `jest.setup.ts`).
- Fluxos completos (ecrã → repositório → SQLite) em `src/features/__tests__/finance-flow-test.tsx`.
- Ensaio real contra o staging (opcional, fora do `check`):
  `src/data/sync/__tests__/live-sync-test.ts`, só com `MIVEN_LIVE_URL`,
  `MIVEN_LIVE_PUBLISHABLE_KEY` e `MIVEN_LIVE_SECRET_KEY` definidas na shell (nunca em
  ficheiros). Cria e apaga um utilizador de teste.
- Sincronização e RLS: `src/data/sync/__tests__`, `src/core/sync/__tests__`,
  `supabase/__tests__/server-test.ts` (PostgreSQL real via PGlite).
- Formatação pt-PT: valores com espaço não separável antes de `€`; percentagens sem espaço
  (`99,4%`). Usar expressões regulares tolerantes (`\s?`) nas asserções.

## Dependências

- Instalar com `npx expo install` (no PowerShell, dev deps: `npx expo install pkg "--" --dev`).
- Justificar cada nova dependência em `docs/decisions.md`. Preferir módulos Expo.
- Correr `npx expo-doctor` após alterar dependências.

## Segurança e privacidade

- Nunca registar em logs valores, descrições de movimentos, nomes ou mensagens de erro com dados
  do utilizador. Registar apenas tipos/códigos de erro.
- `AsyncStorage` (`appStorage`) só para preferências não sensíveis. Dados financeiros vão para a
  base de dados SQLite (`src/data`); a sessão vai para o armazenamento seguro
  (`expo-secure-store` no nativo, `localStorage` na web).
- Logs da camada de dados registam apenas o motivo/código (ex.: `[database] open failed: otherTab`).
- Todas as tabelas pessoais têm RLS (`auth.uid()`). A chave `service_role` só existe na Edge
  Function `delete-account`. Migrações em `supabase/migrations`.
- Cada conta tem a sua base de dados local (`centflow-u-<userId>.db`). Não há uso sem conta
  (ADR-034): `centflow.db` só existe em dispositivos antigos e é importado ou apagado no primeiro
  login, sempre com decisão explícita.
- A IA nunca executa operações financeiras sem confirmação explícita do utilizador.

## Sincronização

- Fonte de uso imediato: SQLite local. O Supabase é a cópia central.
- Fila `sync_outbox` (triggers nas escritas quando `tracking = 1`). Idempotência por `op_id`.
- O servidor decide versões (`version` + compare-and-swap) e a ordem (`server_seq`). Os relógios
  dos dispositivos não decidem conflitos.
- Fusão a três vias em `src/core/sync/merge.ts`: campos diferentes combinam-se; o mesmo campo
  divergente, ou editar vs eliminar, fica em `sync_conflicts` até o utilizador escolher.
- Importação do uso sem conta (dispositivos antigos): copiar → enviar → `sync_verify` registo a
  registo → só então limpar.
