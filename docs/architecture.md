# Arquitetura do Miven

## Visão geral

Uma única base de código TypeScript (Expo + React Native) gera as apps iOS e Android e a versão
Web/PWA (via `react-native-web`). A lógica de negócio vive em módulos sem dependências de interface,
para poder ser reutilizada no servidor (Supabase Edge Functions) e em futuros clientes desktop.

```mermaid
flowchart TD
  subgraph Cliente["Cliente (iOS · Android · Web/PWA)"]
    APP["src/app<br/>rotas Expo Router"] --> FEAT["src/features<br/>ecrãs + casos de uso"]
    FEAT --> UI["src/ui<br/>design system"]
    FEAT --> CORE["src/core<br/>domínio puro"]
    FEAT --> LIB["src/lib<br/>preferências"]
    FEAT -->|"@/data (interfaces + hooks)"| DATA["src/data<br/>repositórios"]
    DATA --> CORE
    UI --> CORE
    FEAT --> I18N["src/i18n"]
  end
  DATA -->|Fase 1| LOCALDB[("SQLite local<br/>expo-sqlite")]
  DATA -->|Fase 2| SUPA["Supabase<br/>Auth · Postgres + RLS · Edge Functions"]
  SUPA --> EDGE["Edge Functions<br/>(IA, OCR, Open Banking)"]
```

## Camadas

| Camada         | Responsabilidade                                                                       | Pode depender de              |
| -------------- | -------------------------------------------------------------------------------------- | ----------------------------- |
| `src/app`      | Mapa de rotas. Cada ficheiro só renderiza um ecrã de `features`.                       | features                      |
| `src/features` | Ecrãs, componentes específicos, hooks e casos de uso por área.                         | ui, core, i18n, lib, `@/data` |
| `src/ui`       | Tema, tokens, componentes genéricos e layout responsivo.                               | core, i18n                    |
| `src/core`     | Regras de domínio em TypeScript puro (dinheiro, datas, cálculos, leitura de extratos). | nada (só Intl)                |
| `src/data`     | SQLite, migrações, repositórios, hooks `useDataQuery`.                                 | core, expo-sqlite             |
| `src/i18n`     | Traduções, resolução de idioma e formatação localizada.                                | core                          |
| `src/lib`      | Preferências, sessão (SecureStore) e cliente Supabase.                                 | bibliotecas externas          |

Cada feature organiza-se, à medida que cresce, em:

```
features/<área>/
  <Área>Screen.tsx      ecrã (composição de componentes)
  components/           componentes só desta área
  hooks/                estado e ligação aos dados
  <área>.ts             tipos e regras da área (sem React quando possível)
  repository.ts         interface de acesso a dados + implementações
  __tests__/
```

O acesso a dados é sempre feito através de **repositórios com interface** (preferências:
`createPreferencesRepository(store)`; dados financeiros: `Repositories` em
`src/data/repositories/types.ts`). Isto permite acrescentar a implementação sincronizada da
Fase 2 sem tocar nos ecrãs, e testar com SQLite em memória.

## Dados locais (Fase 1)

```mermaid
flowchart LR
  SCREEN["Ecrã"] -->|"useDataQuery(repos => …)"| REPOS["Repositories<br/>(interfaces)"]
  SCREEN -->|"useRepositories().entries.create(…)"| REPOS
  REPOS --> SQLREPO["src/data/sqlite<br/>validação + SQL"]
  SQLREPO --> CORE["src/core/finance<br/>validação, saldos, resumos"]
  SQLREPO --> DB["SqlDatabase<br/>fila serializada + transações"]
  DB --> DRIVER["expo-sqlite<br/>(nativo / wa-sqlite + OPFS na web)"]
  SQLREPO -.->|"notifica após commit"| SCREEN
```

- **`SqlDatabase`** (`src/data/db/sql-database.ts`) envolve um subconjunto da API do
  `expo-sqlite` (`execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`,
  `withTransactionAsync`, `closeAsync`). Todas as operações passam por uma fila: o `expo-sqlite`
  tem uma única ligação e uma transação aberta não isola outras operações assíncronas. Erros do
  driver são classificados (`constraint`, `foreignKey`, `busy`, `unknown`).
- **Arranque** (`initializeDatabase`): `PRAGMA foreign_keys = ON` (verificado), WAL só em nativo,
  migrações por `PRAGMA user_version`, cada versão numa transação.
- **Repositórios SQLite** validam com as funções de `src/core/finance/validation.ts` dentro da
  transação de escrita (contra o estado atual das contas e categorias), gravam e notificam os
  subscritores só depois do commit. O `DashboardScreen` e as listas voltam a consultar
  automaticamente.
- **Agregações**: o SQL agrega por mês, moeda, tipo e categoria (`entries.aggregate`) e por conta
  (`accounts.getFlows`); a interpretação (saldo, taxa de poupança, tendência) é feita no `core`.
- **Arranque da UI**: `DataGate` (em `AppProviders`) abre a base de dados, semeia as categorias
  base traduzidas uma única vez e só então mostra a app. Falhas mostram um ecrã explicativo com
  "Tentar novamente".

### Esquema (migração v1)

| Tabela       | Colunas principais                                                                                                                                        | Integridade                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`   | `id`, `name`, `type`, `currency`, `initial_balance` (INTEGER), `archived_at`                                                                              | `CHECK` de tipo, moeda ISO maiúscula, saldo inteiro                                                                                     |
| `categories` | `id`, `name`, `type` (`income`/`expense`), `icon`, `color` (chave da paleta)                                                                              | `CHECK` de tipo e nome                                                                                                                  |
| `entries`    | `id`, `type`, `amount` (INTEGER > 0), `description`, `search_text`, `category_id`, `account_id`, `destination_account_id`, `date` (`YYYY-MM-DD`), `notes` | FKs `ON DELETE RESTRICT`; transferência ⇔ sem categoria e com conta destino diferente; rendimento/despesa ⇔ com categoria e sem destino |
| `meta`       | `key`, `value`                                                                                                                                            | Marcadores internos (ex.: categorias base já semeadas)                                                                                  |

Todas as tabelas de dados têm `created_at`, `updated_at`, `deleted_at` e `synced_at`. Índices
parciais (`WHERE deleted_at IS NULL`) por data, conta+data, conta destino, categoria+data,
tipo+data, contas ativas e tipo de categoria.

### Regras financeiras

- Saldo de uma conta = saldo inicial + rendimentos − despesas − transferências enviadas +
  transferências recebidas. Contas arquivadas mantêm o saldo mas saem do total.
- Transferências não entram em rendimentos, despesas, poupança nem despesas por categoria.
- Taxa de poupança = (rendimentos − despesas) / rendimentos; sem rendimentos não é calculada.
- Totais nunca misturam moedas: o dashboard usa a moeda mais frequente das contas ativas e lista
  as restantes à parte.

### Web

- O SQLite da web é o **sql.js** (ADR-060): WebAssembly na própria página, sem worker nem
  `SharedArrayBuffer`, por isso **não precisa de isolamento cross-origin** e funciona em qualquer
  browser (Safari, Brave, Chrome no iPhone, browsers dentro de outras apps). O ficheiro inteiro é
  gravado no IndexedDB após cada escrita confirmada e quando o separador é escondido; sem
  IndexedDB, a sessão fica em memória e os dados vêm do servidor
  (`src/data/db/platform-database.web.ts`, `sqljs-driver.ts`). iOS e Android usam o expo-sqlite.
- Dois separadores a gravar o mesmo ficheiro apagariam as escritas um do outro. `openLocalSpace` pede um Web Lock
  (`navigator.locks`, `ifAvailable`) antes de abrir; um segundo separador recebe o motivo
  `otherTab` em vez de corromper ou bloquear os dados.

## Sincronização (Fase 2)

Cada conta autenticada tem um ficheiro SQLite próprio (`centflow-u-<userId>.db`). Não há uso
sem conta (ADR-034): `centflow.db` só existe em dispositivos com versões antigas. O servidor
(Postgres + RLS) é a cópia central; o cliente usa o SQLite de imediato.

```mermaid
flowchart LR
  WRITE["Escrita local"] --> OUTBOX["sync_outbox"]
  OUTBOX -->|"sync_push (op_id, version)"| SERVER["Postgres + RLS"]
  SERVER -->|"sync_pull (server_seq)"| INBOX["sync_inbox"]
  INBOX --> SQLITE["SQLite da conta"]
  SERVER -->|"conflito de versão"| MERGE["Fusão a 3 vias"]
  MERGE -->|automático| OUTBOX
  MERGE -->|ambíguo| USER["O utilizador escolhe"]
```

- **Push:** operações pela ordem da fila, em grupos atómicos (`tx_id`). Resposta perdida: repetir
  não duplica (`last_op_id`).
- **Pull:** alterações com `server_seq` maior que o cursor; se o servidor tiver purgado
  tombstones antigos, o cliente reconstrói a partir de zero.
- **Conflitos:** ver ADR-018. Campos de um movimento que definem o tipo (categoria, contas) são
  tratados como um só, para não criar uma combinação que ninguém escreveu.
- **Importação (dispositivos antigos):** copiar o espaço sem conta para o da conta, sincronizar,
  confirmar com `sync_verify`, só então limpar a origem; ou apagá-lo com segunda confirmação.

## Fluxo de arranque

1. `expo-router/entry` carrega `src/app/_layout.tsx`.
2. `@/i18n` inicializa o i18next de forma síncrona com o idioma do dispositivo.
3. `AppProviders` mantém o splash nativo até as **fontes** e as **preferências** (tema, idioma)
   estarem carregadas — evita "flash" de tema ou idioma errado.
4. `ThemeProvider` resolve o esquema (sistema/claro/escuro), sincroniza o tema da navegação, a
   status bar e a cor de fundo do sistema.
5. `AuthProvider` restaura a sessão (SecureStore / localStorage). `AccountGate` decide o acesso
   (`app-access.ts`): sem sessão não abre dados; com sessão escolhe o espaço da conta.
6. `DataGate` abre a base de dados desse espaço, aplica migrações e semeia as categorias base.
   `SyncProvider` sincroniza e mantém a língua dos emails na conta.
7. O `Stack` raiz usa `Stack.Protected`: separadores e formulários só com sessão; boas-vindas e
   autenticação só sem sessão; os retornos dos links de email sempre.
8. `RootErrorBoundary` apanha erros não tratados sem depender dos providers.

## Navegação adaptativa

Usa as tabs JavaScript estáveis do Expo Router com uma barra própria (`AppTabBar`):

| Largura    | Breakpoint | Navegação                                                      |
| ---------- | ---------- | -------------------------------------------------------------- |
| < 768px    | compact    | Barra inferior: Dashboard, Movimentos, **+**, Orçamentos, Mais |
| 768–1199px | medium     | Sidebar compacta (só ícones)                                   |
| ≥ 1200px   | expanded   | Sidebar completa com grupos e botão "Novo movimento"           |

As onze áreas (incluindo Contas e Categorias) existem como rotas reais em todos os tamanhos; em
telemóvel, as secundárias estão em "Mais". Os URLs são estáveis (`/transactions`, `/vehicles`, …), o que serve deep links, atalhos e
widgets.

## Plataformas e desktop

```mermaid
flowchart LR
  REPO["master"] -->|"iOS IPA (manual)"| IPA["IPA sem assinatura<br/>Release + fonte SideStore"]
  REPO -->|"Android APK (manual)"| APK["APK assinado<br/>android-latest"]
  REPO -->|"Site miven.pt (cada push)"| PAGES["GitHub Pages<br/>miven.pt + /app"]
  IPA & APK & PAGES --> SUPA["Supabase produção"]
```

- **iOS:** workflow "iOS IPA" (macOS, Xcode, sem assinatura), Release `sideload-build-N` e
  `sideload/source.json` para o SideStore. Funcionalidades nativas entram por módulos Expo e
  config plugins.
- **Android:** workflow "Android APK" (prebuild + Gradle, assinatura PKCS#12 dos segredos
  `ANDROID_*`), Releases `android-build-N` e `android-latest` (ADR-037).
- **Web/PWA:** `web.output = "single"`, exportada com `baseUrl = /app` e publicada em
  `https://miven.pt/app/` (sem cabeçalhos especiais; o `coi-serviceworker` só é carregado para
  desinstalar o de versões anteriores). `public/index.html` e
  `public/manifest.json` tornam a app instalável em Windows, macOS e Linux.
- **Site:** `site/` (apresentação, `auth/callback`, `auth/reset-password`, 404 para links
  profundos da app). DNS de `miven.pt` no dominios.pt.
- **Desktop nativo (futuro):** o build web pode ser empacotado com Tauri ou Electron sem
  reescrever lógica. Se for preciso partilhar `core` com outros clientes, extrair para um
  workspace (`packages/core`) — a regra de lint já garante que `core` não depende de React Native.

## Evolução prevista por fase

- **Fase 1 — dados locais (concluída):** ver "Dados locais" acima.
- **Fase 2 — Supabase (concluída):** SQLite continua a ser a fonte de uso imediato. Cada conta
  tem o seu ficheiro local. O servidor aplica compare-and-swap por `version` e uma sequência
  `server_seq`; o cliente envia uma fila idempotente e funde conflitos a três vias. RLS em
  todas as tabelas; eliminação de conta numa Edge Function. Ver ADR-017 a ADR-020.
- **Fase 3 — orçamentos e planeamento (concluída):** orçamentos (ADR-021), subscrições
  (ADR-022), objetivos de poupança (ADR-023) e relatórios (ADR-024, sem tabela).
- **Fase 4 — património, veículos e documentos (concluída):** Património (ADR-027), Veículos e
  Documentos (ADR-028). Migrations `00800` e `00900` no staging e na produção desde 2026-11-09
  (ADR-031, ADR-032).
- **Fase 5 — IA e automação (em curso):** registo por texto (ADR-029, Edge Function
  `suggest-entry`) e importação de extratos CSV no dispositivo (ADR-030: `src/core/import`
  interpreta, o utilizador revê e confirma, `entries.createMany` grava numa transação). Chamadas a
  modelos e OCR apenas em Edge Functions (chaves nunca no cliente); a IA propõe, o utilizador
  confirma. Open Banking através de fornecedores autorizados (PSD2), sempre com consentimento
  explícito.
