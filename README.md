# CentFlow

**O teu dinheiro, sob controlo.**

CentFlow é uma aplicação de gestão financeira pessoal para iOS, Android e Web (PWA instalável em
Windows, macOS e Linux). Centraliza rendimentos, despesas, orçamentos, subscrições, património,
veículos e documentos, com o objetivo de automatizar ao máximo o registo de informação.

> Estado atual: **Fase 3 — orçamentos, subscrições, objetivos e relatórios, em curso.** Os
> orçamentos já funcionam no dispositivo e entram na sincronização. As subscrições também já
> funcionam no dispositivo; a migration ainda não foi aplicada na cloud. Objetivos de poupança
> e relatórios continuam «Em breve». A app continua a funcionar sem conta (dados só
> neste dispositivo). Com conta, os mesmos dados sincronizam entre iOS, Android e Web, incluindo
> offline. Nenhum valor apresentado é fictício.

## Funcionalidades (Fase 1)

- **Movimentos:** registo rápido (valor, categoria, conta, data com atalhos Hoje/Ontem), edição,
  eliminação com confirmação, "Guardar e adicionar outro"; lista com pesquisa (ignora acentos e
  maiúsculas), filtros por tipo, período, conta e categoria, ordenação por data e paginação.
- **Contas:** criar, editar, arquivar e reativar; saldos calculados a partir do saldo inicial e
  dos movimentos; transferências movem dinheiro entre contas sem contar como rendimento nem
  despesa. Eliminar uma conta com movimentos exige escolha explícita (arquivar ou eliminar tudo,
  com dupla confirmação).
- **Categorias:** 15 categorias base traduzidas, criação de categorias próprias (nome, ícone,
  cor); eliminar uma categoria em uso obriga a escolher para onde passam os movimentos.
- **Dashboard:** saldo total, rendimentos, despesas, poupança líquida e taxa de poupança do mês,
  despesas por categoria, evolução dos últimos 6 meses, últimos movimentos e navegação entre
  meses. Atualiza-se automaticamente após cada alteração.

## Conta e sincronização (Fase 2)

- Uso sem conta: os dados ficam só neste dispositivo. Não é obrigatório criar conta para
  registar o primeiro movimento.
- Conta (email e palavra-passe; Sign in with Apple no iOS): os dados da conta sincronizam entre
  dispositivos. Recuperação de palavra-passe por email.
- Offline: as alterações ficam numa fila local e são enviadas quando a ligação volta, sem
  duplicar. Se dois dispositivos editarem o mesmo campo, a app pede para escolher a versão;
  campos diferentes são combinados automaticamente.
- Dados criados sem conta não são misturados com a conta sem uma decisão explícita. A importação
  só apaga a cópia local depois de o servidor confirmar cada registo.
- Eliminar a conta remove os dados no servidor (Edge Function, chave administrativa só no
  servidor) e a cópia desta conta neste dispositivo.

## Roadmap

| Fase | Conteúdo                                                                            | Estado       |
| ---- | ----------------------------------------------------------------------------------- | ------------ |
| 0    | Projeto, design system, navegação adaptativa, i18n, tema claro/escuro, testes       | ✅ Concluída |
| 1    | MVP local: contas, movimentos, transferências, categorias, dashboard, resumo mensal | ✅ Concluída |
| 2    | Supabase: autenticação, base de dados com RLS, sincronização, migração de dados     | ✅ Concluída |
| 3    | Orçamentos, subscrições, objetivos de poupança, relatórios                          | Em curso     |
| 4    | Património, investimentos, veículos, documentos e garantias                         | —            |
| 5    | IA, OCR, automação, Open Banking, alertas inteligentes                              | —            |

## Requisitos

- Node.js LTS recente e npm (desenvolvido e testado com Node 24)
- Para testar em telemóvel: app **Expo Go** ou uma development build
- Para builds nativas: conta Expo (EAS) — não é preciso Xcode/Android Studio local

## Comandos

```bash
npm install          # instalar dependências
npm start            # servidor de desenvolvimento (QR code para iOS/Android)
npm run web          # abrir no browser
npm run build:web    # build de produção web/PWA em dist/
npm run serve:web    # servir dist/ localmente com os cabeçalhos COOP/COEP (porta 4173)

npm test             # testes (Jest + Testing Library)
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run format       # Prettier
npm run check        # tudo o que a CI deve correr
```

Para adicionar dependências usa sempre `npx expo install <pacote>` (escolhe versões compatíveis
com o SDK). No Windows/PowerShell, dependências de desenvolvimento: `npx expo install <pacote> "--" --dev`.

## Stack

Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript 6 (strict) · Expo Router (rotas por
ficheiro) · `expo-sqlite` (dados locais) · Supabase (Auth + Postgres com RLS) · i18next · Jest 30

- React Native Testing Library 14.

## Dados locais e Web

Os dados financeiros ficam numa base de dados SQLite no dispositivo (`centflow.db`). Na web, o
`expo-sqlite` usa WebAssembly e guarda a base de dados no _Origin Private File System_ do
browser, o que exige **isolamento cross-origin**. O alojamento tem de enviar em todas as
respostas:

```
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Opener-Policy: same-origin
```

O servidor de desenvolvimento (`metro.config.js`) e o `npm run serve:web` já os enviam;
`public/_headers` cobre Netlify e Cloudflare Pages. Sem estes cabeçalhos a app mostra um aviso e
não abre os dados. Na web, só um separador de cada vez pode usar a base de dados (os outros
mostram um aviso com "Tentar novamente").

## Estrutura

```
src/
  app/          Rotas (Expo Router). Ficheiros finos que delegam nas features.
  core/         Domínio puro em TypeScript (dinheiro, datas, cálculos financeiros). Sem React.
  data/         Base de dados local: migrações, repositórios SQLite, hooks de dados.
  features/     Funcionalidades: ecrãs, componentes e lógica de cada área.
  ui/           Design system: tema, tokens, componentes reutilizáveis, layout.
  i18n/         Idiomas (pt-PT, en, es) e formatação localizada.
  lib/          Adaptadores de plataforma (armazenamento, etc.).
  test-utils/   Utilitários de teste.
public/         Ficheiros web estáticos (index.html, manifesto PWA, ícones).
scripts/        Scripts de manutenção (ícones da marca, servidor web local).
docs/           Arquitetura e decisões técnicas.
supabase/       Migrações Postgres, políticas RLS e Edge Function de eliminação de conta.
```

Detalhes em [docs/architecture.md](docs/architecture.md) e
[docs/decisions.md](docs/decisions.md). Instruções técnicas para quem desenvolve (pessoas ou
agentes de IA) em [CLAUDE.md](CLAUDE.md).

## Identidade visual

O logótipo e todos os ícones (iOS, Android adaptativo, splash, favicon, PWA) são gerados a partir
de geometria por `node scripts/generate-brand-assets.mjs`. Para mudar cores ou forma, edita o
script e volta a gerar.

## Segurança

- Nunca versionar `.env` nem credenciais (já ignorados pelo `.gitignore`).
- A chave `service_role` do Supabase nunca pode existir no código da app.
- Não usar dados financeiros reais em desenvolvimento ou testes.

## Licença

Proprietária — todos os direitos reservados (`UNLICENSED`).
