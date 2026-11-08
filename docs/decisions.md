# Decisões técnicas (ADR)

Registo curto das decisões de arquitetura. Cada nova decisão relevante ou nova dependência deve
ser acrescentada aqui.

## ADR-001 — Expo SDK 58 + Expo Router

**Decisão:** Expo (SDK 58, React Native 0.88, React 19.3) com Expo Router e TypeScript strict.
**Porquê:** uma base de código para iOS, Android e Web; builds na nuvem (EAS) sem Mac local;
rotas por ficheiro com deep links automáticos e URLs na web; SDK estável mais recente.
**Consequências:** atualizar o SDK anualmente; usar sempre `npx expo install`.

## ADR-002 — Dinheiro em unidades mínimas inteiras

**Decisão:** `Money = { amountMinor: number (inteiro seguro), currency: ISO 4217 }`.
**Porquê:** evita erros de vírgula flutuante (`0.1 + 0.2`). O número de casas decimais vem do
`Intl` (EUR 2, JPY 0). `Number.MAX_SAFE_INTEGER` cêntimos ≈ 90 biliões de euros — suficiente.
**Consequências:** na Fase 2, colunas `bigint` em PostgreSQL com o mesmo significado.

## ADR-003 — Navegação adaptativa com tabs JS e barra própria

**Decisão:** `Tabs` (JavaScript) do Expo Router com `tabBar` personalizado e
`tabBarPosition: 'left'` em ecrãs largos.
**Alternativas:** tabs nativas (sem sidebar em desktop); tabs headless `expo-router/ui`
(marcadas como experimentais na documentação do SDK 58).
**Porquê:** API estável, um único navegador para todos os tamanhos, controlo total do visual.

## ADR-004 — i18next com pt-PT como fonte tipada

**Decisão:** `i18next` + `react-i18next` + `expo-localization`. Traduções em ficheiros TS;
`en`/`es` tipados com o tipo de `pt-PT`; chaves de `t()` verificadas em compilação.
**Formatação:** `Intl` nativo (Hermes) via `useLocaleFormat`; idioma escolhido + região do
dispositivo quando coincidem (ex.: `en-US`).
**Nota:** português do Brasil usa pt-PT até existir tradução própria.

## ADR-005 — AsyncStorage apenas para preferências

**Decisão:** `@react-native-async-storage/async-storage` atrás da interface `KeyValueStore`, só
para preferências não sensíveis (tema, idioma).
**Porquê:** funciona em iOS, Android e Web (localStorage) sem configuração.
**Consequências:** dados financeiros não usam AsyncStorage (ver ADR-011).

## ADR-006 — Web como SPA + manifesto PWA, sem service worker por agora

**Decisão:** `web.output: "single"`, `public/index.html` com metadados PWA e `manifest.json`.
**Porquê:** é uma app autenticada (sem SEO); a renderização estática obrigaria todo o código a
correr em Node. Service worker adiado: a documentação do Expo alerta para caches agressivas
difíceis de invalidar; será adicionado (Workbox) quando houver estratégia de atualização.
**Consequências:** a PWA é instalável mas ainda não funciona offline na web.

## ADR-007 — Tipografia Inter, ícones Ionicons, sem bibliotecas de UI

**Decisão:** Inter (4 pesos, importados individualmente), `@expo/vector-icons` (Ionicons) e um
design system próprio em `src/ui`.
**Porquê:** controlo total da identidade visual, sem dependências pesadas de UI; Ionicons já faz
parte do ecossistema Expo.

## ADR-008 — Sem biblioteca de estado global na Fase 0

**Decisão:** React Context apenas para tema e preferências.
**Porquê:** ainda não há dados de servidor. A escolha (ex.: TanStack Query para dados remotos)
fica para quando houver necessidade real (Fase 2).
**Fase 1:** dados locais lidos com `useDataQuery` (ver ADR-013); continua sem biblioteca de estado.

## ADR-009 — Ícones da marca gerados por script

**Decisão:** `scripts/generate-brand-assets.mjs` desenha o logótipo por SDF e escreve PNG com
`zlib` nativo do Node.
**Porquê:** reprodutível, sem dependências nem ficheiros de design soltos.

## ADR-010 — Licença proprietária

O template do Expo incluía uma licença MIT com copyright da Expo; foi removida.
`package.json` usa `"license": "UNLICENSED"`.

## ADR-011 — `expo-sqlite` como base de dados local (resolve D-1)

**Decisão:** `expo-sqlite` (58.x) para todos os dados financeiros, em iOS, Android e Web.
**Alternativas:** WatermelonDB (sync pronto, mas modelo próprio e mais complexo), IndexedDB só na
web (duas implementações), AsyncStorage (sem transações nem consultas).
**Porquê:** SQL real com transações, chaves estrangeiras e `CHECK`; o mesmo esquema e as mesmas
consultas em todas as plataformas; modelo relacional próximo do PostgreSQL da Fase 2.
**Consequências:** na web exige isolamento cross-origin (ADR-015) e um ficheiro WebAssembly de
~630 KB. Migrações versionadas com `PRAGMA user_version`; nunca editar uma migração publicada.

## ADR-012 — Camada `src/data` com interfaces e fila serializada

**Decisão:** os ecrãs só conhecem as interfaces `Repositories` (`@/data`). A implementação SQLite
(`src/data/sqlite`) usa `SqlDatabase`, que serializa todas as operações numa fila.
**Porquê:** o `expo-sqlite` tem uma única ligação e `withTransactionAsync` não isola operações
concorrentes (a documentação recomenda `withExclusiveTransactionAsync`, indisponível na web). A
fila torna cada transação atómica e isolada em todas as plataformas. As interfaces permitem
acrescentar uma implementação Supabase/sync na Fase 2.
**Consequências:** escritas são sequenciais (suficiente para uso pessoal). O ESLint impede
`app`, `features` e `ui` de importar `expo-sqlite` ou os módulos SQL.

## ADR-013 — Atualização automática por notificação dos repositórios

**Decisão:** cada escrita confirmada notifica os subscritores com a entidade alterada;
`useDataQuery` volta a executar a consulta e mantém os dados anteriores enquanto atualiza.
**Alternativas:** TanStack Query (dependência extra, pensada para dados remotos), estado global.
**Porquê:** simples, sem dependências, e o dashboard reflete qualquer alteração de imediato.
**Consequências:** consultas recalculadas após qualquer escrita; com o volume pessoal esperado o
custo é desprezável. Rever na Fase 2.

## ADR-014 — Identificadores, eliminação lógica e metadados de sincronização

**Decisão:** `id` UUID v4 gerado no cliente (`expo-crypto`), `created_at`/`updated_at` em ISO
UTC, `deleted_at` (eliminação lógica) e `synced_at` em todas as tabelas de dados. Datas de
movimentos como datas de calendário locais `YYYY-MM-DD`.
**Porquê:** registos criados offline têm identidade estável para sincronizar; eliminações
precisam de propagar-se a outros dispositivos; um movimento "de dia 31" não pode mudar de mês por
causa do fuso horário.
**Consequências:** todas as consultas filtram `deleted_at IS NULL` (índices parciais). Os
tombstones sincronizam-se para não reaparecerem noutros dispositivos; a limpeza definitiva é
`purge_deleted` após o período de retenção.
**Dependência nova:** `expo-crypto` (UUID com gerador criptográfico em todas as plataformas).

## ADR-015 — Web: isolamento cross-origin e um separador de cada vez

**Decisão:** servir a web com `Cross-Origin-Embedder-Policy: credentialless` e
`Cross-Origin-Opener-Policy: same-origin`; obter um Web Lock antes de abrir a base de dados.
**Porquê:** o worker do `expo-sqlite` precisa de `SharedArrayBuffer`; o VFS OPFS usado é
exclusivo por origem, e dois separadores em simultâneo falhariam de forma confusa.
`credentialless` (em vez de `require-corp`) não obriga recursos de terceiros a enviar CORP.
**Consequências:** o alojamento tem de enviar os cabeçalhos (`public/_headers`, `metro.config.js`,
`scripts/serve-web.mjs`); sem eles a app explica o problema em vez de abrir. Um segundo separador
mostra um aviso com "Tentar novamente". Safari não suporta `credentialless` em todas as versões —
verificar antes de publicar (D-7).

## ADR-016 — Valores sempre positivos com tipo; moedas nunca misturadas

**Decisão:** `amount` é um inteiro > 0 em unidades mínimas; o sinal resulta do tipo
(`income`, `expense`, `transfer`). A moeda pertence à conta e fica bloqueada quando há movimentos;
transferências só entre contas da mesma moeda. Entrada do utilizador convertida por aritmética de
strings (`parseAmountInput`), nunca por `parseFloat`.
**Porquê:** elimina estados ambíguos (despesa negativa?) e conversões cambiais implícitas.
**Consequências:** transferências entre moedas diferentes ficam para uma fase futura (exigem
taxa de câmbio e dois valores).

---

## ADR-017 — Sincronização própria com compare-and-swap (resolve D-2)

**Decisão:** protocolo próprio (`sync_push` / `sync_pull`) em vez de PowerSync. Cada linha tem
`version` (só avança no servidor) e `server_seq` (contador por utilizador, atribuído sob bloqueio).
Uma alteração indica a versão que leu; se não coincidir, o servidor recusa. `op_id` torna o envio
idempotente.
**Porquê:** os relógios dos dispositivos não são fonte de verdade. Last-write-wins por
`updated_at` perderia dados com relógios desfasados. PowerSync acrescenta custo e um modelo
alheio ao nosso.
**Consequências:** o cliente guarda uma fila ordenada e não avança a versão local até o servidor
confirmar. Grupos com o mesmo `tx_id` (ex.: eliminar conta e movimentos) são atómicos.

## ADR-018 — Fusão a três vias; conflitos preservados

**Decisão:** quando o compare-and-swap falha, fundir base / local / servidor
(`src/core/sync/merge.ts`). Campos alterados só de um lado combinam-se; o mesmo campo divergente,
ou editar vs eliminar, fica em `sync_conflicts` até o utilizador escolher.
**Porquê:** a especificação pede para não substituir silenciosamente uma alteração mais recente
e para preservar a versão em conflito quando não é seguro decidir.
**Consequências:** a app mostra um ecrã de conflitos. Nada é apagado só porque o outro dispositivo
ganhou a corrida.

## ADR-019 — Um espaço local por conta, importação explícita

**Decisão:** `centflow.db` é o uso sem conta; `centflow-u-<userId>.db` é cada conta. Entrar muda
de espaço sem apagar. Importar dados sem conta é uma pergunta explícita; só se apaga a origem
depois de `sync_verify` confirmar cada registo no servidor.
**Porquê:** misturar automaticamente dados de duas contas (ou de um dispositivo partilhado)
corromperia histórico financeiro.
**Consequências:** sair da conta mostra os dados sem conta deste dispositivo, não os da conta.

## ADR-020 — Sessão no armazenamento seguro; Apple nativo no iOS

**Decisão:** `expo-secure-store` (Keychain/Keystore) no nativo; `localStorage` na web. Sign in
with Apple via `expo-apple-authentication` + `signInWithIdToken` no iOS; OAuth na web só com
`EXPO_PUBLIC_AUTH_APPLE_ENABLED`. Eliminação de conta numa Edge Function com
`auth.admin.deleteUser`.
**Porquê:** a sessão não cabe no AsyncStorage em segurança; a Apple exige o fluxo nativo no iOS;
a chave administrativa nunca pode ir para o cliente.
**Dependências novas:** `@supabase/supabase-js`, `expo-secure-store`, `expo-network`,
`expo-apple-authentication`; nos testes, `@electric-sql/pglite`.

## ADR-021 — Orçamentos no mesmo protocolo de sincronização

**Decisão:** a tabela `public.budgets` entra no protocolo existente (`sync_push`,
`sync_pull_v2`, compare-and-swap por `version`, fila `sync_outbox`, fusão a três vias).
Não há uma segunda fila nem last-write-wins por `updated_at` — o carimbo de tempo é do
servidor e não decide conflitos. A eliminação é lógica. Um índice único parcial impede dois
orçamentos ativos para o mesmo `(user_id, category_id)`.
**Cliente antigo:** `sync_pull` publicado não devolve orçamentos, por isso uma app que ainda
não foi atualizada continua a sincronizar contas, categorias e movimentos. A app nova usa
`sync_pull_v2`. Se o cursor tiver saltado uma sequência, as contagens não coincidem e há uma
ressincronização completa.
**Importação sem conta:** o orçamento segue o mesmo caminho que os outros registos, com o
mesmo id. Se a conta já tem um limite ativo para essa categoria, nenhum dos dois é apagado;
o da origem fica no dispositivo.
**Consequências:** a migração `20261108000400` só pode ser aplicada depois da `20261108000300`.
A `20261108000500` fecha o orçamento ativo quando a categoria é eliminada. O esquema `private`
continua fora do PostgREST. `authenticated` só tem `SELECT` em `budgets`; as escritas passam
por `sync_push`.
**Onde está aplicado:** no staging (`qlimqcgrgaqzwjmafora`) estão aplicadas `20261108000100` a
`20261108000700`, incluindo subscrições e objetivos, ensaiadas em 2026-11-08. Na produção
(`slfgslfzolfvqavuccom`) só estão `20261108000100` e `20261108000200`. Não aplicar `00300`–`00700`
na produção sem autorização explícita, cópia de segurança e a ordem das migrations. O trigger `c_close_budgets` foi ensaiado no staging em
2026-11-08: eliminar a categoria fechou o orçamento (versão 2), o movimento noutra categoria
manteve-se, e o segundo utilizador não viu linhas. Os utilizadores de teste e os dados foram
apagados no fim. A produção não foi alterada.

## ADR-022 — Subscrições são despesas recorrentes do utilizador

**Decisão:** a tabela `subscriptions` guarda despesas que o utilizador repete (nome, valor em
unidades mínimas, moeda, periodicidade, estado, data de início e próxima data, categoria
opcional). O estado é `active`, `paused` ou `cancelled`. O custo mensal e anual soma só as
ativas: o anual é exato (semana × 52, mês × 12 ou o valor anual) e o mensal é a divisão inteira
desse anual por 12. Guardar uma subscrição não cria movimentos nem altera saldos.
**Não é a subscrição do Miven.** Esta tabela não tem relação com um paywall, um plano pago
ou a cobrança da própria aplicação.
**Consequências:** a migration `20261108000600` entra em `sync_push`, `sync_pull_v2`,
`sync_counts`, `sync_verify` e `purge_deleted`, com RLS por `auth.uid()`. Está aplicada no
staging desde 2026-11-08 e foi ensaiada (criar, editar, pausar, conflito de versão, eliminar
e isolamento). Não está na produção.

## ADR-023 — Objetivos de poupança somam contribuições

**Decisão:** `goals` guarda o alvo (nome, valor em unidades mínimas, moeda e data opcional).
`goal_contributions` guarda cada contribuição numa linha sincronizada (valor positivo, data,
objetivo e eliminação lógica). O progresso é a soma das contribuições ainda ativas; o objetivo
não tem coluna de total. Corrigir um engano é apagar a contribuição. A moeda do objetivo fica
bloqueada quando já há contribuições. Uma contribuição não cria movimentos nem altera saldos.
**Consequências:** a migration `20261108000700` entra em `sync_push`, `sync_pull_v2`,
`sync_counts`, `sync_verify` e `purge_deleted`, com RLS por `auth.uid()`. Apagar o objetivo
elimina logicamente as contribuições ainda ativas. Está aplicada no staging desde 2026-11-08
e foi ensaiada (contribuições, bloqueio da moeda, fecho ao eliminar o objetivo e isolamento).
Não está na produção.

## ADR-024 — Relatórios calculam, não guardam

**Decisão:** o ecrã de relatórios não cria tabela nem migration. O período é o mês, o trimestre,
o ano ou um intervalo personalizado, sempre comparado com o período anterior da mesma natureza.
Os totais, a taxa de poupança, as categorias e a evolução vivem em `src/core/finance/reports.ts`.
O SQLite só agrega por dia, moeda, tipo e categoria, e soma as contribuições dos objetivos. Moedas
diferentes nunca se somam: o ecrã mostra uma moeda de cada vez. O custo das subscrições é o das
ativas neste momento e não cria movimentos. O progresso de um objetivo continua a ser a soma das
contribuições. Exportação, partilha e IA ficam para fases seguintes.
**Consequências:** não há escrita remota neste passo. Um intervalo com a data de fim antes da de
início não mostra números. Sem contas, movimentos, orçamentos, subscrições ou objetivos, o ecrã
diz que não há dados.

## ADR-025 — Erros da app vão para o Sentry

**Decisão:** a app Expo usa `@sentry/react-native` no projeto `miven` da organização `miven-la`
(região `de.sentry.io`). A DSN pública fica em `EXPO_PUBLIC_SENTRY_DSN`; o token de upload de
source maps fica só em `SENTRY_AUTH_TOKEN`, fora do git. O cliente não envia PII por omissão e o
replay mantém o mascaramento de texto e imagens, porque os ecrãs mostram valores. Em
desenvolvimento as amostras de tracing e profiling são 100%; em produção, 20%.
**Consequências:** sem DSN o SDK fica desligado, por isso os testes não enviam eventos. O plugin
tem `disableAutoUpload`, porque a compilação do IPA não tem o token. Os mapas passam a ser
enviados quando o token existir no CI e essa opção for retirada.

## ADR-026 — O nome público é Miven e a origem é miven.pt

**Decisão:** o nome visível da aplicação, do pacote npm, do esquema (`miven://`) e do projeto
Sentry é Miven. A origem da PWA é `https://miven.pt`, também aceite em `https://www.miven.pt`.
A proposta em `supabase/config.toml` usa estes endereços. Não foi aplicada no painel.
**Consequências:** o identificador nativo continua `app.centflow.mobile` e a fonte SideStore
continua `app.centflow.source`, porque as compilações já publicadas e a base de dados local
dependem deles. Os ficheiros `centflow.db` e `centflow-u-<userId>.db` também ficam. O
repositório GitHub e os projetos Supabase não foram renomeados. O alojamento de miven.pt
continua por escolher.

## Decisões pendentes

| ID  | Decisão                                        | Opções / recomendação                                                                                                                                            | Quando            |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| D-3 | Identificadores de app (`app.centflow.mobile`) | Mantidos: já há compilações SideStore. O nome público e o domínio ficaram decididos no ADR-026. Não mudar o identificador depois da primeira submissão às lojas. | Antes de publicar |
| D-4 | Licença e entidade legal                       | Proprietária por omissão. Definir titular dos direitos e termos/privacidade (RGPD).                                                                              | Antes de publicar |
| D-5 | Fornecedor de Open Banking                     | Agregadores licenciados PSD2 (ex.: GoCardless Bank Account Data, Tink, Salt Edge). Avaliar custos e cobertura em Portugal.                                       | Fase 5            |
| D-6 | Fornecedor de IA/OCR                           | Executar sempre em Edge Functions; escolher pelo custo, privacidade (UE) e qualidade.                                                                            | Fase 5            |
| D-7 | Alojamento da PWA                              | O domínio é miven.pt. Falta escolher o alojamento estático com COOP/COEP (ADR-015): Vercel, Netlify, Cloudflare Pages ou EAS Hosting. Confirmar suporte Safari.  | Fase 2            |
