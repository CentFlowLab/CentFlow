# Miven

**O teu dinheiro, sob controlo.**

Miven é uma aplicação de gestão financeira pessoal para iOS, Android e Web. Centraliza contas,
movimentos, orçamentos, subscrições, objetivos, património, veículos e documentos, com o
objetivo de automatizar ao máximo o registo de informação.

> **Estado (2026-11-13, versão 0.1.20):** Fases 0 a 4 concluídas e Fase 5 em curso, em fase de
> testes, com os veículos (Fase 1 do plano de veículos). Produção e staging do Supabase têm o
> mesmo histórico de migrations (`20261108000100` a `20261112000100`). Testes em aparelhos reais ainda por fazer
> ([docs/audit-2026-11.md](docs/audit-2026-11.md)). O Miven só se usa com conta. Plataformas:
>
> - **Web:** <https://miven.pt/app/> (site de apresentação em <https://miven.pt>).
> - **iPhone:** fonte SideStore
>   `https://raw.githubusercontent.com/CentFlowLab/CentFlow/master/sideload/source.json`.
> - **Android:** APK assinado (workflow "Android APK"), publicado em
>   `releases/download/android-latest/miven.apk` depois da primeira compilação.
>
> Nenhum valor apresentado na app é fictício. O estado detalhado está em
> [CLAUDE.md](CLAUDE.md) e as decisões em [docs/decisions.md](docs/decisions.md).

## Funcionalidades

- **Movimentos:** registo rápido (valor, categoria, conta, data com atalhos Hoje/Ontem), edição,
  eliminação com confirmação, "Guardar e adicionar outro"; lista agrupada por dia, com pesquisa
  (ignora acentos e maiúsculas) e filtros de tipo, período, conta e categoria num painel.
- **Importação de extratos CSV:** escolhe o ficheiro ou cola o texto, revê a lista, os possíveis
  duplicados ficam de fora por omissão e nada é gravado antes de confirmares.
- **Registo por texto com IA:** "ontem Pingo Doce 23,50" preenche o formulário; nunca grava
  sozinho (precisa do segredo `ANTHROPIC_API_KEY` no servidor).
- **Contas e categorias:** saldos calculados a partir do saldo inicial e dos movimentos;
  transferências não contam como rendimento nem despesa; 15 categorias base traduzidas.
- **Planeamento:** orçamentos por categoria, subscrições (custo mensal e anual das ativas),
  objetivos de poupança com contribuições, relatórios por período com comparação.
- **Património, veículos e documentos:** bens e dívidas com património líquido, prazos de
  inspeção, seguro e validade.
- **Painel:** saldo total, rendimentos, despesas, taxa de poupança, orçamentos, despesas por
  categoria, evolução de 6 meses e últimos movimentos.

## Conta e sincronização

- Conta obrigatória (email e palavra-passe; Sign in with Apple no iOS). Sem sessão só há as
  boas-vindas e a autenticação, e não se abre nenhuma base de dados.
- Os emails de confirmação e recuperação têm a marca Miven, saem de `noreply@miven.pt` (Resend)
  e seguem a língua da app. Os links abrem `https://miven.pt/auth/...`, que reencaminha para a
  app.
- Offline: as alterações ficam numa fila local e são enviadas quando a ligação volta, sem
  duplicar. Se dois dispositivos editarem o mesmo campo, a app pede para escolher a versão;
  campos diferentes são combinados automaticamente.
- Dados que tenham ficado sem conta num dispositivo antigo são importados ou apagados no
  primeiro login, sempre com decisão explícita.
- Eliminar a conta remove os dados no servidor (Edge Function, chave administrativa só no
  servidor) e a cópia desta conta neste dispositivo.

## Roadmap

| Fase | Conteúdo                                                                            | Estado       |
| ---- | ----------------------------------------------------------------------------------- | ------------ |
| 0    | Projeto, design system, navegação adaptativa, i18n, tema claro/escuro, testes       | ✅ Concluída |
| 1    | MVP local: contas, movimentos, transferências, categorias, dashboard, resumo mensal | ✅ Concluída |
| 2    | Supabase: autenticação, base de dados com RLS, sincronização, migração de dados     | ✅ Concluída |
| 3    | Orçamentos, subscrições, objetivos de poupança, relatórios                          | ✅ Concluída |
| 4    | Património, veículos e documentos                                                   | ✅ Concluída |
| 5    | Extratos CSV, previsão do mês, alertas de gastos, subidas de preço, prazos, registo | Em curso     |
|      | rápido no iPhone. IA (registo por texto) pronta mas sem `ANTHROPIC_API_KEY` na      |              |
|      | produção. Falta OCR e Open Banking (precisam de fornecedor, D-5 e D-6)              |              |

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

O logótipo oficial está em `assets/brand/miven-logo.webp`. Todos os ícones (iOS, Android
adaptativo, splash, favicon, PWA, site e emails) são gerados a partir dele por
`scripts/build-brand-assets.py` (precisa de Pillow e numpy num ambiente virtual; ver o
cabeçalho do script).

## Segurança

- Nunca versionar `.env` nem credenciais (já ignorados pelo `.gitignore`).
- A chave `service_role` do Supabase nunca pode existir no código da app.
- Não usar dados financeiros reais em desenvolvimento ou testes.

## Licença

Proprietária — todos os direitos reservados (`UNLICENSED`).
