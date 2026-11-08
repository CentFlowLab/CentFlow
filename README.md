# CentFlow

**O teu dinheiro, sob controlo.**

CentFlow é uma aplicação de gestão financeira pessoal para iOS, Android e Web (PWA instalável em
Windows, macOS e Linux). Centraliza rendimentos, despesas, orçamentos, subscrições, património,
veículos e documentos, com o objetivo de automatizar ao máximo o registo de informação.

> Estado atual: **Fase 0 — Fundação concluída.** Ainda não existem funcionalidades financeiras;
> as áreas por implementar aparecem na app marcadas como "Em breve". Nenhum valor apresentado é
> fictício.

## Roadmap

| Fase | Conteúdo                                                                            | Estado       |
| ---- | ----------------------------------------------------------------------------------- | ------------ |
| 0    | Projeto, design system, navegação adaptativa, i18n, tema claro/escuro, testes       | ✅ Concluída |
| 1    | MVP local: contas, movimentos, transferências, categorias, dashboard, resumo mensal | Próxima      |
| 2    | Supabase: autenticação, base de dados com RLS, sincronização, migração de dados     | —            |
| 3    | Orçamentos, subscrições, objetivos de poupança, relatórios                          | —            |
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
ficheiro) · i18next · Jest 30 + React Native Testing Library 14. Supabase entra na Fase 2.

## Estrutura

```
src/
  app/          Rotas (Expo Router). Ficheiros finos que delegam nas features.
  core/         Domínio puro em TypeScript (dinheiro, formatação). Sem React.
  features/     Funcionalidades: ecrãs, componentes e lógica de cada área.
  ui/           Design system: tema, tokens, componentes reutilizáveis, layout.
  i18n/         Idiomas (pt-PT, en, es) e formatação localizada.
  lib/          Adaptadores de plataforma (armazenamento, etc.).
  test-utils/   Utilitários de teste.
public/         Ficheiros web estáticos (index.html, manifesto PWA, ícones).
scripts/        Scripts de manutenção (geração de ícones da marca).
docs/           Arquitetura e decisões técnicas.
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
