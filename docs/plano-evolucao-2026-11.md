# Plano de evolução e consolidação (2026-11-12)

Estado de partida: `master` em `b0a37a6`, versão **0.1.17** publicada (iPhone, Android, web).
Local: migração SQLite v16. Servidor (staging e produção): `20261108000100` a `20261117000100`.
`npm run check` verde (690 testes). Nada neste plano foi testado em aparelhos físicos.

Regras desta fase: tudo local. Sem push, sem builds publicados, sem migrações remotas e sem
submissões a lojas. As migrações do servidor ficam escritas e testadas em PGlite, por aplicar.

## 0. Arquitetura relevante (auditoria)

- **Dados locais:** SQLite com fila de sincronização (`sync_outbox`, triggers), fusão a três vias
  (`src/core/sync/merge.ts`) e versões decididas pelo servidor. iOS/Android: expo-sqlite. Web:
  sql.js gravado no IndexedDB (ADR-060, desde hoje): já não depende de isolamento cross-origin.
- **Servidor:** Supabase; RLS por `auth.uid()` em todas as tabelas pessoais; escrita só por
  `sync_push`/`private.sync_apply_op` (com guardas `v_data ? 'campo'` para apps antigas). Edge
  Functions `delete-account` (única com `service_role`) e `suggest-entry` (sem segredo da IA).
- **Builds:** workflows manuais "iOS IPA" (SideStore) e "Android APK"; "Site miven.pt" em cada
  push publica a web em produção. **Não há ambiente de pré-visualização**: qualquer push vai
  direto para miven.pt/app.
- **Testes:** Jest com SQLite real (`node:sqlite`), servidor em PGlite, ecrãs com Testing Library.
  Não há testes E2E nem de builds nativos.
- **Problemas já existentes que estas alterações podem agravar:**
  - o push para `master` publica a web automaticamente (risco para a Fase 6/7);
  - a web perde a cópia local antiga (OPFS) na passagem para sql.js — dados vêm do servidor;
  - `suggest-entry` não funciona sem `ANTHROPIC_API_KEY` (a IA mostra "não ativa");
  - não existe exportação de dados nem backup controlado pelo utilizador.

## 1. Tarefas, por ordem de dependências

### 1.1 Objetivos (sem migração)

|           |                                                                                                                                                                                                                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado    | Lista com Em curso/Concluídos, detalhe, contribuições ligadas a transferências (ADR-058).                                                                                                                                                                                                                                                           |
| Problema  | (a) Não grava sem descrição; (b) detalhe desarrumado no telemóvel; (c) sem deslizar.                                                                                                                                                                                                                                                                |
| Causa     | (a) `GoalForm` valida a descrição vazia `''` com `isTextBetween(1, 280)` **antes** de a converter em `null` (o repositório converte, mas nunca chega lá). (b) O detalhe é um `FormScreen` com o calendário sempre aberto, o título repetido e o formulário de contribuição misturado com o resumo. (c) A lista não usa `SwipeableRow`.              |
| Solução   | Normalizar texto vazio para `null` antes de validar. Detalhe como ecrã de leitura (resumo, evolução, histórico) com a contribuição num formulário próprio que só abre a pedido e uma data compacta (`OptionalDateField`/chips Hoje/Ontem). `SwipeableRow` com Editar/Eliminar + confirmação; ações equivalentes por acessibilidade e botões na web. |
| Ficheiros | `src/features/goals/*`, testes em `src/features/goals/__tests__`.                                                                                                                                                                                                                                                                                   |
| Modelo    | Nenhuma alteração.                                                                                                                                                                                                                                                                                                                                  |
| Testes    | Criar e editar sem descrição; deslizar e confirmar eliminação; contribuições não criam movimentos.                                                                                                                                                                                                                                                  |

### 1.2 Categorias — arrastar e largar (sem migração)

|           |                                                                                                                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado    | Ordem manual sincronizada desde a 0.1.17 (`sort_order`, ADR-059), com setas.                                                                                                                                                                                                                                                 |
| Problema  | Falta arrastar e largar.                                                                                                                                                                                                                                                                                                     |
| Causa     | Não há biblioteca de gestos (sem `react-native-gesture-handler`/`reanimated`).                                                                                                                                                                                                                                               |
| Solução   | Componente `ReorderableList` com `PanResponder` + `Animated` (como o `SwipeableRow`): toque longo (telemóvel) ou arrastar com o rato (web/Windows); grava com `categories.reorder`. As setas ficam como alternativa acessível e de teclado. Categorias predefinidas e personalizadas ordenam-se juntas, dentro de cada tipo. |
| Ficheiros | `src/ui/components/ReorderableList.tsx`, `CategoriesScreen.tsx`.                                                                                                                                                                                                                                                             |
| Modelo    | Nenhuma (`sort_order` já existe; conflito de ordem: fica a do servidor, testado).                                                                                                                                                                                                                                            |
| Testes    | Reordenar por gesto (lógica de destino), persistência e sincronização (já existentes).                                                                                                                                                                                                                                       |

### 1.3 Menos introdução manual (sem migração, exceto recorrências)

- **Registo rápido:** sugerir a categoria e a conta mais usadas para a descrição escrita
  (histórico real; só quando há uma escolha clara, ≥ 60 % e ≥ 2 usos), descrições recentes como
  atalhos, "Duplicar" num movimento existente. Sem migração.
- **Linguagem natural:** já existe (`suggest-entry` + confirmação antes de gravar). Falta só o
  segredo `ANTHROPIC_API_KEY` no servidor (passo do responsável). Acrescentar deteção de
  duplicados (mesmo valor, dia e conta) antes de gravar.
- **Recorrências:** as subscrições já são compromissos previstos que não contam como despesa.
  Acrescentar "Registar este pagamento" (cria o movimento real só quando a pessoa confirma e
  avança a próxima data). Movimentos recorrentes gerais (salário, renda) reutilizam as
  subscrições com tipo rendimento/despesa — **precisa de migração** (`type`, `account_id`,
  `ends_on`), adiada para uma ronda própria.
- **Importação CSV:** já deteta separador, datas, valores e duplicados. Acrescentar categoria
  sugerida pelo histórico de descrições. Mapeamentos guardados por banco: preferência local.
- **Recibos por fotografia:** avaliação apenas (exige OCR/IA no servidor e um novo fornecedor na
  política de privacidade). Não implementado.

### 1.4 Backups e recuperação (sem migração)

- Sincronização ≠ backup: hoje a única cópia fora do aparelho é o Supabase (sem cópias
  automáticas no plano gratuito; cópias manuais por `pg_dump` em `Miven-backups`).
- **Exportação:** ficheiro JSON completo (todas as tabelas, versão do esquema, data, contagens e
  SHA-256 para verificar a integridade) e CSV dos movimentos. Partilhar/guardar pelo sistema.
- **Restauro:** importar um JSON verificado; registos que já existem mais recentes **nunca** são
  substituídos (compara `updated_at`); só se acrescentam os que faltam e os mais recentes no
  ficheiro, sempre depois de uma pré-visualização e confirmação. As alterações entram na fila de
  sincronização como escritas normais.
- **Encriptação opcional** com palavra-passe da pessoa (AES-GCM, PBKDF2) com aviso claro: sem a
  palavra-passe, o ficheiro é irrecuperável.
- Anexos: ficam no Storage; a exportação lista-os (nome, tamanho) sem os incluir.

### 1.5 Definições (sem migração)

Reagrupar em Conta, Aparência, Experiência, Dados e privacidade (exportar/restaurar), Sincronização
(estado real, última sincronização, conflitos), Integrações e Ajuda. Só opções que funcionam;
Notificações fica fora até existirem notificações reais.

### 1.6 Ambientes de teste (sem migração)

- Web de pré-visualização: workflow que constrói a web contra o **staging** e publica como
  artefacto descarregável (e servível com `npm run serve:web`), sem tocar em miven.pt.
- O workflow do site só publica produção a partir de `master` (já é assim); documentar.
- Android: APK de staging no mesmo workflow com `environment` de entrada. iOS: Expo Go não serve
  (módulos nativos); IPA de staging pelo workflow existente com ambiente escolhido.
- Windows: MSIX de teste local (ver 1.7).

### 1.7 Aplicação Windows

| Opção                           | Reutilização      | Toolchain nesta máquina      | MSIX/Store            | Notas                                                                          |
| ------------------------------- | ----------------- | ---------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| **Electron + electron-builder** | 100 % (build web) | Node (já existe)             | `appx` nativo         | Janela nativa, protocolo `miven://`, ficheiros e notificações; maior (~90 MB). |
| Tauri                           | 100 % (build web) | Rust + MSVC (não instalados) | MSI/NSIS; MSIX manual | Mais leve; exige toolchain.                                                    |
| WinUI/Windows App SDK           | 0 %               | .NET                         | sim                   | Reescrever a app: excluído.                                                    |
| PWA (PWABuilder)                | 100 %             | —                            | MSIX                  | Continua a ser uma página instalada: excluído como principal.                  |

**Escolha: Electron**, empacotado em MSIX (`appx`) pelo electron-builder, com a web exportada
servida por um protocolo próprio (`app://miven`), sem servidor nem browser. Dados no IndexedDB do
perfil da app (persistente entre atualizações MSIX). Assinatura: certificado de teste local para
instalar; a Store assina na submissão. Não submeter.

### 1.8 Trading 212 (migração no servidor)

API oficial pública (v0, `docs.trading212.com`): só contas **Invest** e **Stocks ISA**; chave +
segredo gerados na app da Trading 212 (Basic auth), opcionalmente limitados a IPs. **Não há
tempo real nem streaming**: só pedidos. Limites por conta: resumo 1/5 s, posições 1/s, histórico
20/min. Valores na moeda principal da conta (sem multimoeda). Resumo: `cash.availableToTrade`,
`investments.currentValue/totalCost/unrealizedProfitLoss/realizedProfitLoss`, `totalValue`,
`currency`. Posições: `instrument`, `quantity`, `averagePricePaid`, `currentPrice`,
`walletImpact.{currentValue,totalCost,unrealizedProfitLoss,fxImpact,currency}`.

- Segredos **nunca** no cliente: Edge Function `t212` guarda chave e segredo no Supabase Vault
  (só a função os lê) e faz os pedidos; tabela `integrations` (estado, última atualização, erro)
  e `investment_snapshots` (resumo + posições), ambas com RLS de leitura do próprio.
- Atualização: ao abrir e a cada 60 s com a app aberta, com mínimo de 10 s por conta no servidor
  (bem dentro dos limites). Mostra sempre "atualizado há X" e marca como desatualizado após 15 min.
- Património: um item de investimento ligado à integração cujo valor é o `totalValue`
  (avaliação, não despesa/rendimento); nada é contado duas vezes; sem conversão de moeda.
- Precisa de migração + função publicada (por aplicar) e do segredo de encriptação no servidor.

### 1.9 Painel de administração (migração no servidor)

Tabela `admin_roles` (técnico, suporte, produto) gerida só por SQL; RPCs `security definer` que
verificam o papel e devolvem **apenas agregados** (contagens de contas, versões de app,
sincronizações recentes, integrações por estado) e registam cada consulta em `admin_audit`.
Nenhuma RPC devolve movimentos, saldos ou documentos. Acesso de suporte a dados individuais fica
como proposta (consentimento do utilizador com prazo), não implementado. Rota `/admin` visível só
para quem a RPC reconhece.

### 1.10 Dashboard (sem migração)

Reordenar: disponível (contas, sem cartões), mês (rendimentos, despesas, transferências à parte),
previsão do fim do mês marcada como estimativa, próximos compromissos, evolução do património
(líquido, investido, dívida). Sem remover secções existentes.

## 2. O que precisa de migrações

| Sem migração                                                                                                                                 | Com migração (escritas, por aplicar)                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivos, drag and drop, registo rápido, IA (só falta o segredo), importação, backups/exportação, definições, ambientes, Windows, dashboard | Trading 212 (`integrations`, `investment_snapshots`, Vault), painel de administração (`admin_roles`, `admin_audit`, RPCs), movimentos recorrentes gerais |

## 3. Resultado (2026-11-12, tudo local, sem push)

| Fase                    | Estado                                                                                                                                                                           | Onde                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Objetivos               | Feito: descrição opcional, detalhe arrumado, deslizar com confirmação                                                                                                            | `src/features/goals`       |
| Categorias              | Feito: arrastar e largar (toque e rato), setas e ações de acessibilidade                                                                                                         | ADR-059                    |
| Menos introdução manual | Feito: frequentes, categoria sugerida, duplicar, aviso de repetido, pagamento de subscrições, CSV com categorias. Por fazer: recorrências gerais (migração), recibos (avaliação) | ADR-061                    |
| Cópias de segurança     | Feito: JSON verificado, CSV, restauro seguro, cópias automáticas. Sem encriptação (justificado)                                                                                  | ADR-062                    |
| Definições              | Feito: grupos reorganizados, só opções reais                                                                                                                                     | `src/features/settings`    |
| Ambientes               | Feito: dev contra o staging, "Miven Teste", preview web, APK/IPA de teste. Falta: variáveis do ambiente EAS `preview`                                                            | `docs/ambientes.md`        |
| Windows                 | Feito: app Electron, instalador de teste, workflow MSIX. MSIX local precisa do Windows SDK                                                                                       | `docs/windows.md`, ADR-063 |
| Trading 212             | Feito no código; servidor por aplicar (migração, função, segredo); escondido por omissão                                                                                         | ADR-064                    |
| Administração           | Feito no código; migração por aplicar                                                                                                                                            | `docs/admin.md`, ADR-065   |
| Dashboard               | Feito: disponível, mês, previsão, compromissos, património                                                                                                                       | ADR-066                    |

Migrações escritas e testadas em PGlite, **não aplicadas**: `20261118000100_integrations.sql`,
`20261119000100_admin.sql`. Nada foi testado em aparelhos físicos.
