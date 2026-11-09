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
e isolamento). Na produção desde 2026-11-09 (ADR-032).

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
Na produção desde 2026-11-09 (ADR-032).

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
Sentry é Miven. O slug Expo continua `centflow`, porque o projeto EAS já está registado com ele.
A origem da PWA é `https://miven.pt`, também aceite em `https://www.miven.pt`.
A proposta em `supabase/config.toml` usa estes endereços. Não foi aplicada no painel.
**Consequências:** o identificador nativo continua `app.centflow.mobile` e a fonte SideStore
continua `app.centflow.source`, porque as compilações já publicadas e a base de dados local
dependem deles. Os ficheiros `centflow.db` e `centflow-u-<userId>.db` também ficam. O
repositório GitHub e os projetos Supabase não foram renomeados. O alojamento de miven.pt
continua por escolher.

## ADR-027 — Património: bens e dívidas numa só entidade

**Decisão:** o Património guarda cada bem ou dívida em `wealth_items` (nome, tipo, valor em
unidades mínimas, moeda e data do valor). O valor é sempre positivo; o sinal vem do tipo (bens:
imóvel, investimentos, reforma, bens de valor, outro; dívidas: crédito habitação, empréstimo,
cartão, outra). O património líquido é bens menos dívidas por moeda, calculado em
`src/core/finance/wealth.ts`. Os itens entram na fila de sincronização como as outras
entidades e não criam movimentos nem mudam saldos de contas.
**Consequências:** não há histórico de valorizações: editar o valor substitui o anterior, por
isso ainda não há gráfico de evolução. Se for preciso, acrescenta-se uma tabela de valorizações
numa migration nova. A migration `20261108000800` foi aplicada no staging a 2026-11-09 e
ensaiada com duas sessões reais (criar, editar, eliminar). Na produção desde 2026-11-09 (ADR-032); a app sincroniza
`wealth_items` só depois de ela existir no servidor.

## ADR-028 — Veículos e Documentos são registos com prazos, sem ficheiros

**Decisão:** `vehicles` guarda nome, tipo, matrícula e quilómetros (opcionais) e as datas da
próxima inspeção e da renovação do seguro. `documents` guarda título, categoria, validade e
notas (até 500 caracteres). Os prazos são interpretados em `src/core/finance/deadlines.ts`
(expirado, em breve nos próximos 30 dias, em dia) com datas de calendário, sem fusos.
Ambos entram na fila de sincronização como as restantes entidades.
**Consequências:** os documentos não guardam o ficheiro: isso exigiria Supabase Storage,
regras de acesso e um fluxo de eliminação (RGPD), por isso fica para uma decisão própria. Ainda
não há notificações de prazos nem custos por veículo. A migration `20261108000900` depende da
`20261108000800`. Foi aplicada no staging a 2026-11-09 e ensaiada com duas sessões reais. Na
produção desde 2026-11-09 (ADR-032).

## ADR-029 — Registo por linguagem natural com IA (Fase 5, primeiro passo)

**Decisão:** a Edge Function `suggest-entry` recebe uma frase curta (até 300 caracteres) e as
categorias do utilizador, chama a API de mensagens da Anthropic (modelo por omissão
`claude-haiku-5-5`, configurável em `SUGGEST_ENTRY_MODEL`) e devolve **uma proposta**. A chave é o
segredo `ANTHROPIC_API_KEY` e existe só no servidor. A função verifica o JWT do utilizador, trata o
texto como dados (vai só na mensagem de utilizador), valida a resposta em `src/core/ai` (valor
decimal positivo, data real a menos de um ano, categoria só se existir e for do tipo certo) e não
grava nada nem regista o texto. O formulário só pré-preenche; o utilizador confirma com "Guardar".
A IA nunca executa operações financeiras.
**Consequências:** só aparece com sessão iniciada. Sem o segredo, a função responde 503 e a app
diz que a IA ainda não está ativa. Não há limite diário por utilizador (a decidir antes de abrir ao
público: custo e abuso). A função está publicada no staging desde 2026-11-09 e responde 401 sem
sessão e 503 sem o segredo; o segredo `ANTHROPIC_API_KEY` ainda não foi definido. O Haiku 5.5
recusa `temperature` e raciocina por omissão, por isso o pedido usa `thinking: disabled` e
`max_tokens` 1024; uma recusa ou corte dá `not_understood`. Publicada na produção a 2026-11-09, também sem o segredo. O texto sai do dispositivo para o
fornecedor de IA, o que tem de constar da política de privacidade (D-4). Resolve D-6 para este
caso; OCR de recibos, importação de extratos e Open Banking (D-5) continuam por fazer.

## ADR-030 — Importação de extratos CSV no dispositivo

**Decisão:** o extrato é lido e interpretado no dispositivo, sem servidor nem fornecedor. O
utilizador escolhe um ficheiro (`expo-document-picker`; leitura com `expo-file-system` no
nativo e `File` na web) ou cola o texto. `src/core/import` deteta o separador (`;`, `,` ou
tabulação), o cabeçalho (até à 10.ª linha), as colunas de data, descrição e montante com sinal
ou débito/crédito, as datas `DD/MM/AAAA` e `AAAA-MM-DD`, e lê os valores com
`parseAmountInput` (sem floats). Bytes que não são UTF-8 válido são lidos como Windows-1252.
Linhas sem data ou valor válidos são listadas, nunca adivinhadas. Um possível duplicado é uma
linha com a mesma data, tipo e valor de um movimento da conta (transferências contam pelo lado
da conta), contado como multiconjunto; fica desmarcado por omissão. O utilizador escolhe a conta
e uma categoria para despesas e outra para rendimentos, revê a lista e confirma.
`entries.createMany` grava tudo numa transação ou nada.
**Porquê:** é útil já, não precisa de contrato nem de enviar dados financeiros para fora, e o
Open Banking (D-5) continua a ser a via automática.
**Dependências novas:** `expo-document-picker` (seletor de ficheiros nativo e web) e
`expo-file-system` (ler o ficheiro escolhido no nativo). São módulos Expo; o IPA 0.1.3 não os
tem, por isso o seletor só funciona a partir da próxima compilação. Colar o texto funciona já.
**Consequências:** o formato é heurístico; extratos em Excel (`.xlsx`) ou PDF não são lidos.
Não há regras de categorização automática nem memória de mapeamentos por banco. Máximo de 2000
linhas por ficheiro.

## ADR-031 — Ensaio do staging de 2026-11-09 e configuração por ambiente

**Decisão:** o staging recebeu `00800` e `00900` com `db push --remote=qlimqcgrgaqzwjmafora`
(sem trocar o projeto ligado, que continua a ser a produção). A sincronização foi ensaiada com
dois dispositivos da mesma conta contra o staging real (`live-sync-test.ts`). A configuração
de auth do staging vive em `[remotes.staging]` no `supabase/config.toml` (site
`http://localhost:8081`, redirects `miven://`, `localhost:8081` e `miven.pt`, palavra-passe mínima 8) e foi aplicada com `config push --remote=qlimqcgrgaqzwjmafora`; o SMTP fica desligado no
staging até a chave do Resend existir. A secção base continua a ser a proposta da produção e
não foi aplicada. `.gitattributes` fixa LF, porque com `core.autocrlf=true` o checkout no
Windows fazia falhar o `prettier --check`.
**Consequências:** o registo por email no staging só funciona para membros da organização até
haver SMTP; `example.com` é recusado pelo Supabase. O token de sessão de teste vem de um
utilizador criado e apagado pela API de administração do staging.

## ADR-032 — Produção alinhada com o staging (2026-11-09)

**Contexto:** a app 0.1.3 do SideStore falhava sempre a sincronizar. O workflow "iOS IPA" usa
`eas env:pull production`, e o `EXPO_PUBLIC_SUPABASE_URL` desse ambiente é a produção
(`slfgslfzolfvqavuccom`), que só tinha `00100` e `00200`. A app chama `sync_pull_v2` e as
tabelas novas, que não existiam.
**Decisão:** com autorização explícita (`CONFIRMO-PRODUCAO`), aplicaram-se `00300` a `00900`
pela ordem do plano. O dry-run listou exatamente essas sete. Antes houve uma cópia de segurança.
O painel não tinha cópias (sem PITR) e o `db dump` precisa de Docker, que não existe nesta
máquina. Por isso usou-se o script do `db dump --dry-run` com o `pg_dump` 17 local
(`--quote-all-identifiers` por extenso: o `pg_dump` do Windows não aceita a abreviatura). Ficou
em `C:\Users\Emanuel\Documents\Miven-backups\` (esquema, dados e dump `-Fc` de `public` e
`auth`), fora do git. Publicaram-se `delete-account` e `suggest-entry`.
**Verificação:** histórico local e remoto iguais de `00100` a `00900`. As 12 tabelas públicas
têm RLS. `anon` não lê. `authenticated` só lê, sem `INSERT`/`UPDATE` diretos e sem políticas de
`DELETE`. As funções de sync e `private.sync_apply_op` têm `search_path` vazio. O esquema
`private` não está exposto (406). Um `POST` anónimo a `/rest/v1/goals` dá 401. O ensaio
`live-sync-test.ts` correu na produção com um utilizador temporário (conta, movimento,
Património, Veículo e Documento; criar, editar e eliminar em duas sessões) e apagou-o.
`delete-account` respondeu 401 sem confirmação e apagou o utilizador de teste com ela.
`suggest-entry` respondeu 401 sem sessão e 503 sem o segredo.
**Consequências:** o código da app 0.1.0–0.1.2 que ainda use `sync_pull` continua a receber
contas, categorias e movimentos. Ficam por fazer o segredo da IA e a auth do painel da produção.
O repositório `CentFlowLab/Miven` é público: a fonte SideStore e o IPA abrem sem sessão. O
endereço antigo `CentFlowLab/CentFlow` redireciona.

## ADR-033 — Estatísticas com consentimento, Superwall preparado e Sentry nos IPAs

**PostHog:** `posthog-react-native`, região UE (`EXPO_PUBLIC_POSTHOG_HOST`, por omissão
`https://eu.i.posthog.com`). Só arranca com `EXPO_PUBLIC_POSTHOG_KEY` e com a preferência
`analytics` ligada pelo utilizador nas Definições (desligada por omissão; sem chave a secção nem
aparece). Envia só o nome do ecrã, sem identificadores (`/entry/[id]`), sem perfis de pessoa,
sem eventos de ciclo de vida, sem valores, descrições, contas nem email. Desligar faz `optOut`
e `reset`. A política de privacidade (D-4) tem de o mencionar antes de abrir ao público.
**Superwall:** `expo-superwall` está instalado e `PaywallProvider` só monta o SDK com
`EXPO_PUBLIC_PAYWALL_ENABLED=true` e a chave pública da plataforma
(`EXPO_PUBLIC_SUPERWALL_IOS_KEY` / `_ANDROID_KEY`), nunca na web. Não há produtos, preços,
colocações nem paywall visível: isso exige decidir o que é pago e criar os produtos na App Store
Connect. Não tem relação com as "Subscrições" do utilizador (ADR-022).
**Sentry:** o EAS `production` não tinha `EXPO_PUBLIC_SENTRY_DSN`, por isso os IPAs saíam com o
Sentry desligado. A DSN pública foi acrescentada a 2026-11-09; entra a partir da compilação
seguinte à 0.1.4. O token de source maps continua fora do CI (ADR-025).
**Resend / miven.pt:** o DNS está em `host-redirect.com` (dominios.pt), região Resend
`eu-west-1`. O Resend (Forge) pede o DKIM em TXT (`resend._domainkey`) e o SPF em dois **CNAME**:
`send` → `send.forge.rmta.net` e `rsend` → `rsend-euw1.forge.rmta.net`. Não pede MX. Em
2026-11-09 os dois CNAME estavam criados como TXT (com o valor certo entre aspas) e o domínio
ficava "Pending"; foram corrigidos para CNAME no painel do dominios.pt nesse dia. O DMARC
(`p=none`) mantém-se. O domínio ficou "Verified" no Resend a 2026-11-09 e o SMTP da produção foi ligado no painel
(`smtp.resend.com`, porta 465, utilizador `resend`, remetente `Miven <noreply@miven.pt>`; a
palavra-passe é uma chave de API do Resend com permissão de envio, colada pelo responsável).
Um registo de teste com `delivered@resend.dev` enviou o email de confirmação (o utilizador foi
apagado). O primeiro envio falhou com `535 Authentication credentials invalid` porque o painel
não tinha gravado a chave; o painel mostra sempre "Stored password is hidden", por isso o
teste de envio é a única confirmação. O domínio raiz não tem registo A (alojamento por escolher, D-7).
**Zernio:** plataforma de marketing (redes sociais, anúncios, mensagens) com servidor MCP. Não
entra no código da app.
**Dependências novas:** `posthog-react-native` e `expo-superwall` (módulo nativo, só ativo com a
flag). O IPA 0.1.4 ainda não as tem.

## ADR-034 — Conta obrigatória e páginas de retorno em miven.pt

**Decisão:** o Miven só se usa com conta. O layout raiz usa `Stack.Protected`: separadores,
formulários e conflitos só com sessão; boas-vindas, entrar, criar conta e recuperar só sem
sessão; `auth/callback` e `auth/reset-password` ficam sempre acessíveis. Sem sessão não se abre
nenhuma base de dados local. Sem Supabase configurado (`unavailable`), a app só funciona em
desenvolvimento e nos testes; numa compilação de produção mostra um erro de configuração. Os
dados que já existam sem conta num dispositivo são propostos no primeiro login: importar para a
conta ou apagar do dispositivo (com segunda confirmação). Substitui a parte "uso sem conta" do
ADR-019; o espaço `centflow.db` fica só para esta migração.
**Links dos emails:** os retornos passam a `https://miven.pt/auth/callback` e
`https://miven.pt/auth/reset-password`. Nas compilações nativas, `Linking.createURL` devolvia
`miven:///auth/callback` (três barras), que não estava na lista de redirects; o Supabase caía no
site por omissão (miven.pt, sem alojamento) e o link de confirmação dava "Não é possível aceder a
este site". O site estático (`site/`, GitHub Pages, workflow "Site miven.pt", domínio
`miven.pt`) mostra o resultado na língua do browser e reencaminha o mesmo código para
`miven://auth/...`; no telemóvel tenta abrir a app. Com PKCE, o código só cria sessão no
dispositivo que fez o pedido; noutro dispositivo o email fica confirmado e basta entrar.
**Consequências:** quando a PWA for alojada em miven.pt (D-7), as rotas `/auth/*` passam a ser
as da app. A política de privacidade e os termos (D-4) ainda não estão no site.

## ADR-035 — Emails da autenticação com a marca, na língua da app

**Decisão:** seis modelos (confirmação, recuperação, link mágico, mudança de email, convite e
código de reautenticação) gerados por `scripts/generate-email-templates.mjs` em
`supabase/templates/` e colados no painel da produção a 2026-11-09. Cada modelo escolhe o texto
por `user_metadata.locale` (`pt`, `en`, `es`; sem valor, português), também no assunto. A app
envia `locale` no registo e atualiza-o quando a língua muda com sessão iniciada. O cabeçalho usa
`https://miven.pt/assets/email-logo.png` e o nome em texto. A pasta fica fora do Prettier, que
estragaria as marcas `{{ }}`.
**Verificação:** registos e recuperação de teste com `delivered@resend.dev` (com e sem `locale`)
enviaram sem erro de modelo; os utilizadores de teste foram apagados.

## ADR-036 — Logótipo oficial do Miven

**Decisão:** o logótipo é a imagem enviada pelo responsável a 2026-11-09 (um "M" que se torna
uma seta a subir, com barras, num mosaico escuro com brilho verde), guardada em
`assets/brand/miven-logo.webp`. Substitui as três propostas desenhadas no mesmo dia (a "B",
moeda, chegou a entrar na 0.1.5). `scripts/build-brand-assets.py` recorta o mosaico e gera os
ícones: iOS a toda a largura, versão de cantos transparentes (arranque, PWA, site, emails),
Android adaptativo com o mosaico completo sobre o preto da imagem (`#010206`) e versão
monocromática. O script usa Pillow e numpy só no ambiente de quem mexe na marca: não são
dependências da app. O gerador por geometria (`generate-brand-assets.mjs`) foi retirado.

## Decisões pendentes

| ID  | Decisão                                        | Opções / recomendação                                                                                                                                            | Quando            |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| D-3 | Identificadores de app (`app.centflow.mobile`) | Mantidos: já há compilações SideStore. O nome público e o domínio ficaram decididos no ADR-026. Não mudar o identificador depois da primeira submissão às lojas. | Antes de publicar |
| D-4 | Licença e entidade legal                       | Proprietária por omissão. Definir titular dos direitos e termos/privacidade (RGPD).                                                                              | Antes de publicar |
| D-5 | Fornecedor de Open Banking                     | Agregadores licenciados PSD2 (ex.: GoCardless Bank Account Data, Tink, Salt Edge). Avaliar custos e cobertura em Portugal.                                       | Fase 5            |
| D-6 | Fornecedor de IA/OCR                           | Registo por texto resolvido no ADR-029 (Anthropic, em Edge Function). OCR de recibos continua por decidir: exige imagem e um fornecedor.                         | Fase 5            |
| D-7 | Alojamento da PWA                              | O domínio é miven.pt. Falta escolher o alojamento estático com COOP/COEP (ADR-015): Vercel, Netlify, Cloudflare Pages ou EAS Hosting. Confirmar suporte Safari.  | Fase 2            |
