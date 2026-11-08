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
**Consequências:** dados financeiros não usam AsyncStorage (ver decisão pendente D-1).

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
fica para quando houver necessidade real (Fase 1/2).

## ADR-009 — Ícones da marca gerados por script

**Decisão:** `scripts/generate-brand-assets.mjs` desenha o logótipo por SDF e escreve PNG com
`zlib` nativo do Node.
**Porquê:** reprodutível, sem dependências nem ficheiros de design soltos.

## ADR-010 — Licença proprietária

O template do Expo incluía uma licença MIT com copyright da Expo; foi removida.
`package.json` usa `"license": "UNLICENSED"`.

---

## Decisões pendentes

| ID  | Decisão                                        | Opções / recomendação                                                                                                                                                                                                 | Quando            |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| D-1 | Base de dados local (Fase 1)                   | **Recomendado: `expo-sqlite`** (SQL real, transações, migrations, alinhado com PostgreSQL). Na web exige headers COOP/COEP no alojamento. Alternativa: WatermelonDB (sync pronto, mais complexo) ou IndexedDB na web. | Fase 1            |
| D-2 | Estratégia de sincronização (Fase 2)           | Sync próprio com UUID + `updated_at` + soft delete, ou PowerSync (serviço externo, custo).                                                                                                                            | Fase 2            |
| D-3 | Identificadores de app (`app.centflow.mobile`) | Confirmar domínio/organização antes da primeira submissão às lojas — não pode mudar depois.                                                                                                                           | Antes de publicar |
| D-4 | Licença e entidade legal                       | Proprietária por omissão. Definir titular dos direitos e termos/privacidade (RGPD).                                                                                                                                   | Antes de publicar |
| D-5 | Fornecedor de Open Banking                     | Agregadores licenciados PSD2 (ex.: GoCardless Bank Account Data, Tink, Salt Edge). Avaliar custos e cobertura em Portugal.                                                                                            | Fase 5            |
| D-6 | Fornecedor de IA/OCR                           | Executar sempre em Edge Functions; escolher pelo custo, privacidade (UE) e qualidade.                                                                                                                                 | Fase 5            |
| D-7 | Alojamento da PWA                              | Qualquer alojamento estático (Vercel, Netlify, Cloudflare Pages, EAS Hosting); com SQLite na web precisa de COOP/COEP.                                                                                                | Fase 1/2          |
