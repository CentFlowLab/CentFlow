# CLAUDE.md — Instruções técnicas do CentFlow

Documento de referência para quem desenvolve no projeto (pessoas e agentes de IA). Ler também
[AGENTS.md](AGENTS.md) (regras Expo), [docs/architecture.md](docs/architecture.md) e
[docs/decisions.md](docs/decisions.md).

## Estado

Fase 0 concluída. **Não avançar de fase sem aprovação explícita do responsável do produto.**
Não fazer `git push` sem autorização.

## Comandos obrigatórios antes de dar uma tarefa por concluída

```bash
npm run check   # typecheck + lint + prettier --check + jest
```

Para alterações visuais, verificar também na web (`npm run web`) em largura de telemóvel
(< 768px), tablet (768–1199px) e desktop (≥ 1200px), em modo claro e escuro.

## Arquitetura em camadas

```
src/app        → rotas finas; só importam de features
src/features   → ecrãs e lógica de cada área; usam ui, core, i18n, lib
src/ui         → design system; usa core e i18n; nunca importa de features
src/core       → TypeScript puro; NÃO importa React, React Native, Expo, ui ou features
src/i18n       → traduções e formatação localizada
src/lib        → adaptadores de plataforma (storage, futuramente base de dados, Supabase)
```

O ESLint bloqueia imports proibidos em `src/core`.

## Regras de domínio

- **Dinheiro é sempre um inteiro em unidades mínimas** (`Money = { amountMinor, currency }`).
  Nunca guardar nem somar valores decimais. Converter com `toMinorUnits` / `toMajorUnits`.
- Nunca misturar moedas numa operação (`CurrencyMismatchError`).
- Transferências entre contas não são despesas nem rendimentos (regra para a Fase 1).
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

## Testes

- Jest (`jest-expo`) + `@testing-library/react-native` 14 (`render` e `fireEvent` são assíncronos:
  usar `await`).
- Ficheiros `*-test.ts(x)` em pastas `__tests__` junto ao código. **Nunca colocar testes em `src/app`**
  (tudo lá é tratado como rota).
- Componentes: `renderWithProviders` de `@/test-utils/render`.
- Navegação: `renderRouter('./src/app')` de `expo-router/testing-library`.
- O locale nos testes é sempre pt-PT (mock em `jest.setup.ts`).

## Dependências

- Instalar com `npx expo install` (no PowerShell, dev deps: `npx expo install pkg "--" --dev`).
- Justificar cada nova dependência em `docs/decisions.md`. Preferir módulos Expo.
- Correr `npx expo-doctor` após alterar dependências.

## Segurança e privacidade

- Nunca registar em logs valores, descrições de movimentos, nomes ou mensagens de erro com dados
  do utilizador. Registar apenas tipos/códigos de erro.
- `AsyncStorage` (`appStorage`) só para preferências não sensíveis. Dados financeiros vão para a
  base de dados local da Fase 1; tokens/segredos para armazenamento seguro do sistema.
- Fase 2: todas as tabelas com dados pessoais com RLS; `service_role` só em Edge Functions;
  migrations SQL versionadas em `supabase/migrations`.
- A IA nunca executa operações financeiras sem confirmação explícita do utilizador.
