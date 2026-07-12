# CENTFLOW BREAKTHROUGH

**Data:** 2026-07-12  
**Âmbito:** Auditoria absoluta — produto, UX, lógica financeira, arquitetura, estratégia  
**Postura:** Primeiro dia. Zero ego. Zero pena do código.  
**Pergunta única:** *Se esta app fosse lançada hoje, eu teria orgulho nela?*

**Resposta honesta:** Não ainda. O motor é impressionante. A experiência não condensa esse motor num produto que uma pessoa comum ama nos primeiros 120 segundos.

---

## FASE 1 — O que é a CentFlow?

### O que é

CentFlow é uma **plataforma de finanças pessoais portuguesa** — mobile-first, Supabase, domínio financeiro profundo — que tenta responder a uma pergunta simples: **«Para onde vai o meu dinheiro?»**

Não é um banco. Não é um roboadvisor. É um **ledger pessoal holístico**: movimentos, orçamento mensal, créditos, cartões, objetivos, inventário, garantias, análises, OCR de talões PT, open banking (GoCardless), assistente IA e recomendações determinísticas.

### Missão (implícita no código, fraca na superfície)

Dar a adultos portugueses **clareza financeira acionável** — gastos, dívida, património, poupança — com automação local (OCR, sync) e coaching (regras + IA), sem folha Excel.

### Utilizador

- **Primário:** 25–45 anos, smartphone, rendimento estável, crédito habitação/consumo, subscrições, quer controlo sem ser contabilista.
- **Secundário (actual):** beta tester técnico, power user iOS (Back Tap, LiveContainer, Doctor).
- **Não é:** investidor sofisticado (ainda), freelancer com cashflow irregular (mal servido), utilizador que só quer «ver saldo».

### Problema que resolve

**Fragmentação do dinheiro mental.** O utilizador não sabe, num só sítio e com confiança:
- quanto pode gastar *este mês* (vs quanto tem no banco);
- quanto deve e quando;
- se está a poupar para o que importa;
- se um talão/recibo foi contabilizado;
- o que fazer a seguir.

### Porque existe

Porque apps genéricas (Wallet, Spendee) são rasas em crédito PT, orçamento vs património, e OCR de talões; e porque Excel não avisa, não sincroniza, não antecipa.

### Porque escolheria esta app e não outra?

**Hoje, honestamente, só escolheria se:**
- falo português e quero algo *feito para PT* (TAEG, talões, GoCardless PT);
- tenho crédito habitação + cartões e quero simular amortização;
- aceito curva de aprendizagem alta em troca de profundidade.

**Não escolheria hoje se:**
- quero ver saldo e gastos em 30 segundos (Revolut, Moey);
- quero orçamento envelope simples (YNAB);
- quero beleza minimalista sem scroll infinito (Finary);
- não confio em apps com botões «em breve» e áreas «activar».

### Veredito Fase 1

A resposta à pergunta «o que é?» **não é extremamente clara para o utilizador final**. É clara para quem lê o código. Isso, por si só, prova que o produto **não está terminado** — está numa fase **plataforma disfarçada de consumer app**.

---

## FASE 2 — Auditoria do repositório

### Estrutura (sólida na forma, pesada na substância)

```
app/           → 50 rotas (tabs, auth, settings, modais)
components/    → ~210 ficheiros .tsx (feature folders)
hooks/         → ~30 hooks + 29 query hooks
lib/
  domain/      → motor financeiro (~100+ módulos, 73 testes)
  api/         → services + mocks + REST legacy
  supabase/    → 22 módulos CRUD
supabase/      → migrations, edge functions, templates email
```

**Bom:** sem `/src`, Expo Router file-based, domínio puro em `lib/domain/financial/`, TanStack Query consistente, RLS Supabase.

**Mau:** três backends de dados (mock + Supabase + `api.centflow.app`), dois motores financeiros (v1 `financial-state` + v2 `engine`), tipos triplicados (domain / API DTO / Supabase), UI com ficheiros de 650–930 linhas.

### Arquitetura de dados

```
UI → hooks/queries → lib/api/services → {mock | supabase | REST}
                              ↓
                    lib/domain/financial (cálculo puro)
```

**Providers:** Auth, Preferences, Theme, Toast, QueryClient. **Sem** provider do motor financeiro — recálculos via `scheduleFinancialRecalculation` disperso.

### Problemas estruturais críticos

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Motor v1 + v2 em paralelo** | Números diferentes entre Home, recomendações e simulador |
| 2 | **`useFinancialState` passa `accounts: []`** | Orçamento/património ignoram contas reais e `initialBalance` |
| 3 | **`queryKeys.home` = `queryKeys.dashboard`** (mesma fn, caches separados) | Refetch duplicado, invalidação inconsistente |
| 4 | **Realtime incompleto** | `accounts`, `category_budgets`, `goal_contributions`, `loan_payments`, `preferences` fora do sync |
| 5 | **Credits/subscriptions em assets E liabilities** | Fonte de verdade ambígua |
| 6 | **REST API legacy + mocks** ainda acoplados | Custo cognitivo, mappers incompletos no caminho REST |
| 7 | **Dois simuladores** (`simulator.ts` 670 linhas + `decision-simulator.ts` 345 linhas) | Overlap, export duplicado no barrel |

### God files (responsabilidades demais)

| Ficheiro | Linhas | Problema |
|----------|--------|----------|
| `app/onboarding.tsx` | ~933 | 17 passos + persistência + copy inline |
| `components/movements/AddTransactionModal.tsx` | ~854 | Form + OCR + 5 tipos de movimento |
| `components/assets/CreditFormModal.tsx` | ~866 | Formulário monolítico |
| `app/(tabs)/movimentos.tsx` | ~653 | Lista + filtros + subscrições + modais |
| `app/(tabs)/analises.tsx` | denso | 4 sub-tabs + período + métricas |

### Código morto / redundante (pós-Ronda 1)

Ronda 1 removeu 39 componentes. **Ainda resta:**

| Item | Estado |
|------|--------|
| `hooks/queries/useNetWorth.ts` | Zero imports |
| `hooks/queries/usePricesData.ts` + `prices.service.ts` | Mortos |
| `lib/widgets/widget-data.ts` | Widgets nativos não integrados |
| `components/useColorScheme.ts` | Template Expo, não usado |
| `expo-video` | Zero imports no projecto |
| `hooks/queries/useDashboard.ts` | `@deprecated` alias |
| `app/(tabs)/precos.tsx` | Fantasma se ainda existir no disco |

### Testes

- **73 testes** — quase todos em `lib/domain/financial/` e utils.
- **Zero** testes em `hooks/`, `components/`, `app/`, `lib/supabase/`, edge functions.
- O domínio está bem testado no ledger; a **integração UI → hook → BD** não está.

### Dependências suspeitas

- `expo-video` — não usada → remover.
- `react-native-keyboard-aware-scroll-view` — só settings layout.
- `zod` — subutilizada vs tamanho do projecto.

### TODOs

Quase zero `TODO`/`FIXME` em produção (disciplina boa). A dívida está em `@deprecated` (15+ ocorrências) e código legacy não removido.

---

## FASE 3 — Auditoria UX (brutal)

### Princípio

A tua mãe abre a app. Em 2 minutos:
- Não sabe se «Ativos» são coisas boas ou más.
- Vê «Open Banking», «margem real», «benchmarks» — palavras de engenheiro.
- A Home tem 6–10 cards antes de acabar o scroll.
- Três sítios dizem «faz isto» (recomendações + acções + assistente).
- Perfil e Definições parecem a mesma coisa em dois sítios.
- Onboarding tem 17 passos antes de ver valor.

### Ecrã-a-ecrã

| Ecrã | Veredito |
|------|----------|
| **Login** | Email/Password em inglês. Primeira impressão quebrada. |
| **Onboarding (17 passos)** | Bonito, longo demais. Promete plano personalizado que não liga a orçamento real. Abandono provável. |
| **Home** | O maior problema. Scroll pesado, triple coaching, sem número hero claro (património foi para Análises). |
| **Movimentos** | Maduro (FlashList, swipe, OCR). Mas 5 tipos de movimento num modal intimidam. Recorrentes escondidos. |
| **Análises** | Tab com halo visual = expectativa máxima. 4 sub-tabs densas. Dívida e Património duplicam outras tabs. |
| **Créditos** | Ponto forte técnico. Tab permanente para todos — ruído para quem não tem dívida. |
| **Ativos** | «Ativos» é jargão. 3 sub-secções (objetivos/garantias/inventário). Feature gates pós-onboarding confusos. |
| **Perfil** | Sem link directo a Definições. «Activar área Gastos» numa app de gastos? Stats úteis, resto clutter. |
| **Definições** | 12+ entradas. Doctor exposto em beta. Benchmarks com consentimento sem UI. Privacidade WIP. |
| **Calendário** | Valor alto, descoberta fraca (só via Análises). Nome técnico. |
| **Assistente** | Overlap com Home. Chat sem histórico evidente. |

### Fricções transversais

1. **Duplicação:** Perfil↔Definições, Dívida (Créditos + Análises), Património (Ativos + Análises), coaching triplo, export triplo.
2. **Jargão:** Ativos, Património, Open Banking, OCR, Doctor, Back Tap, margem real, ledger.
3. **Inglês residual:** Email, Password, Sync.
4. **Features fantasma:** benchmarks sem UI, contas desligadas na UI, política/eliminação «em breve».
5. **5 tabs** — demais para consumer; pouco para power user que não encontra calendário/recorrentes.

### Páginas que deviam desaparecer (ou esconder até estarem prontas)

- CentFlow Doctor (menu default)
- Benchmark consent (sem comparação visível)
- Activar áreas no Perfil (pós-onboarding)
- Cards WIP em Privacidade

### Páginas que deviam fundir

- Recomendações + Acções + Plano hoje → **um** «Centro de acções»
- Análises/Dívida → link para tab Créditos
- Análises/Património → resumo em Ativos
- Perfil prefs → só Definições

### Páginas que deviam dividir

- Onboarding → 3 passos (conta → 1.º movimento → pronto) + resto in-app
- Home → modo «hoje» (1 número + 1 acção) vs «revisão semanal»

---

## FASE 4 — Auditoria da lógica financeira

**Premissa:** todos os cálculos podem estar errados. Alguns estão.

### CRÍTICO — bugs de confiança

| # | Bug | Ficheiros | Impacto |
|---|-----|-----------|---------|
| F1 | **Dívida de cartão em duplicado** — `outstandingBalance` da BD + replay de transações | `financial-state.ts`, `credit-ledger-sync.ts` | Utilização do cartão pode aparecer 2× |
| F2 | **Património ignora poupanças em objetivos** — contribuições reduzem PL em vez de mover para `savings` | `financial-state.ts` vs `netWorth.test.ts` | Cada alocação a objetivo «destrói» património na UI |
| F3 | **Dois modelos de saldo** — global (sem `initialBalance`) vs por conta | `useFinancialState`, `useAccountsWithBalances` | Home ≠ ecrã de contas |
| F4 | **Orçamento ignora `budget_enabled` e transferências entre âmbitos** | `monthly-available.compose.ts` | «Disponível este mês» mente |

### ALTO — propagação e consistência

| # | Bug | Impacto |
|---|-----|---------|
| F5 | `updateTransaction` não sincroniza saldo de crédito | Editar movimento deixa cartão errado |
| F6 | Update optimista omite `creditId`, `accountId`, etc. | UI errada até refetch |
| F7 | Engine v2 ignora investimentos | Motor em cache subconta património |
| F8 | Open Banking importa sem `account_id`, só income/expense | Movimentos órfãos, sem transferências/cartão |
| F9 | Filtro Supabase `type=expense` ignora `credit_card_purchase` | Listagens subcontam despesas |
| F10 | `useCreateLoanPayment` sem `scheduleFinancialRecalculation` | Pagamento de empréstimo não propaga |

### MÉDIO — edge cases

- `calculateGoalOnTrack` — fórmula com unidades misturadas.
- Reembolsos como `income`+`refund` não reduzem gastos (só `credit_card_refund`).
- `balance_adjustment` só reduz saldo, nunca aumenta.
- Obrigações sem data de vencimento sempre «devidas este mês».
- `debtToIncomeRatio` — nomenclatura incorrecta (é dívida/rendimento anual).

### O que está BEM (crédito merecido)

- Classificação canónica de movimentos (`transaction-kind.ts`).
- Ledger audit tests cobrem compra cartão, transferências, reembolsos.
- Separação orçamento mensal vs património — **conceito diferenciador** se os números forem fiáveis.
- Validação de contribuição a objetivos com saldo calculado.
- Mappers Supabase preservam campos essenciais.

### Propagação de alterações (resumo)

| Evento | Transações | Crédito sync | Motor | Contas |
|--------|------------|--------------|-------|--------|
| Create tx | ✅ | ✅ | ✅ | parcial |
| Update tx | ✅ | ❌ | ✅ | parcial |
| Delete tx | ✅ | ✅ | ✅ | parcial |
| Goal contribution | ✅ | — | ✅ | ✅ |
| Loan payment | ✅ | manual | ❌ | parcial |
| Open Banking | ✅ | ❌ | ✅ | ❌ |

**Conclusão Fase 4:** O ledger de baixo nível é sólido. As **camadas de agregação** (património, orçamento, cartões na UI) não são fiáveis o suficiente para lançamento público. Um utilizador que confia nos números e descobre erro perde a app para sempre.

---

## FASE 5 — Auditoria de arquitetura

### Se começasse hoje, organizaria igual?

**Parcialmente.** A separação `app / components / hooks / lib/domain / lib/supabase` é correcta. O que não repetia:

1. **Dois motores financeiros** — um só, desde o dia 1.
2. **REST legacy + mocks em produção** — só Supabase + mock flag para dev.
3. **Lógica de negócio em ecrãs de 800 linhas** — extrair para hooks de feature + domain.
4. **Query cache como side-channel** (`useFinancialRecommendations` com `queryFn: undefined`) — selector derivado ou store único do engine.
5. **Tipos triplicados** — gerar ou mapear numa direcção só.

### Domínio financeiro isolado?

**Sim, no `lib/domain/financial/`** — é o activo mais valioso do projecto. **Não**, na prática — UI e hooks contornam o domínio com merges ad-hoc (`liabilities?.credits ?? assets?.credits`).

### Onde uma alteração pequena quebra 10 ecrãs?

- Qualquer mudança em `financial-state.ts` → Home, Análises, simulador, sugestões, score.
- Invalidação de cache → export PDF usa `dashboard`, Home usa `home`.
- Tipo de transação novo → formulário, mapper REST, mapper Supabase, ledger, filtros, OCR.
- Renomear rota → deep links, emails, onboarding, stats do Perfil.

### Correção arquitectural (ordem)

1. **Unificar motor** → engine v2 como única fonte; v1 sunset.
2. **Unificar cache** → `home` = `dashboard`; uma query key.
3. **Fonte única credits/subscriptions** → liabilities OU assets, não ambos.
4. **Feature hooks** → `useMovementsScreen`, `useAnalysisScreen` extraem lógica dos god files.
5. **Sunset REST** → remover `apiFetch` fallback ou isolar em pacote `legacy/`.
6. **Testes de integração** → hook + service + domain para os 5 fluxos críticos.

---

## FASE 6 — CEO: lançar em 3 meses

### O que FICA (núcleo irresistível)

1. **Registar movimentos** — manual, OCR talão, sync banco (um banco, bem feito).
2. **«Quanto posso gastar este mês?»** — um número hero, explicável, fiável.
3. **Lista de movimentos** — rápida, pesquisável, categorias PT.
4. **Créditos + cartões** — visão de dívida, pagamento, utilização (diferenciador PT).
5. **Uma recomendação por dia** — não três sistemas de coaching.
6. **Conta + definições** — um sítio, não dois.

### O que DESAPARECE (v1.0)

- Onboarding 17 passos → 3 passos.
- Feature area gates pós-onboarding.
- Tab Ativos como tab permanente → merge em «Mais» ou onboarding opt-in.
- Doctor no menu utilizador.
- Benchmarks (até UI existir).
- Inventário + garantias (v1.1 — nicho).
- Assistente chat (v1.1 — quando histórico + valor claro).
- Calendário de caixa (v1.1 — quando descoberta = 1 toque).
- Export PDF (v1.1).
- Back Tap guide no fluxo principal.
- Simulador de decisões genérico (manter só amortização crédito).
- Score / perfil financeiro opaco (v1.1 com educação).
- Análises 4 sub-tabs → 1 resumo + link para detalhe.

### O que FUNDE

- Home + recomendações + acções → **Painel Hoje**.
- Perfil + Definições → **Conta** (identidade + prefs).
- Créditos + dívida em Análises → **Dívida** (um sítio).
- Objetivos + património → **Poupança** (secção, não tab).

### O que SIMPLIFICA

- 5 tabs → **3 tabs:** Hoje · Movimentos · Dívida (+ menu Conta).
- Novo movimento → 2 tipos visíveis (Despesa / Receita); resto em «Mais».
- Definições → 6 entradas, não 12+.

### O que RECONSTRÓI

- **Motor financeiro único** com números fiáveis.
- **Onboarding** orientado a «primeiro movimento em 60 segundos».
- **Home** com 1 número + 1 acção + últimos movimentos.
- **Sync bancário** com conta ligada e categorização básica.

---

## FASE 7 — Inovação inevitável (não gimmicks)

### O que a app já tem e não vende

- Motor de orçamento vs património (único no mercado PT consumer).
- OCR de talões PT com confirmação.
- Simulador de amortização com TAEG/comissão.
- Recomendações determinísticas auditáveis (não caixa negra).

### O que deveria ter (IA útil, não marketing)

| Ideia | Porque é inevitável |
|-------|---------------------|
| **«Este mês, se continuares assim…»** | Projeção de saldo a 30 dias com base em hábitos reais, não média burra. Já existe `cashflow-projection.ts` — falta ser o hero. |
| **Detecção de subscrições esquecidas** | Já existe `detect-subscriptions.ts`. Mostrar «pagas 47€/mês em coisas que não usas» com 1 toque para cancelar lembrete. |
| **Explicador de movimento** | «Porque é que este gasto contou no orçamento e não no património?» — 2 frases em PT, não jargão. |
| **Alerta antes de falhar** | «Daqui a 5 dias ficas com 120€ se pagares o crédito e a Netflix» — calendário como push, não ecrã escondido. |
| **Comparação silenciosa** | Benchmarks agregados anonimizados: «gastas 23% mais em restauração que utilizadores com perfil similar» — só se consentimento + valor real. |
| **Simulador de 1 pergunta** | «E se pagar 200€ a mais no crédito?» — resposta em 3 linhas, não modal de 20 campos. |
| **Receipt memory** | «Este talho costuma ser 45€; hoje foi 89€ — verificar?» — OCR + histórico. |
| **Hábito de poupança** | «Transferiste para objetivo 3 meses seguidos — aumentar meta?» — já existe lógica de hábitos no engine. |

### O que NÃO fazer

- Chat genérico «como posso poupar?» sem contexto dos dados do utilizador.
- Score mágico sem explicação.
- Gamificação de badges.
- «AI-powered» no marketing sem feature concreta.

---

## FASE 8 — Produto Financeiro do Ano

### Porque ganharia (visão 18 meses)

Porque seria a **primeira app em português** onde:
1. **Sabes quanto podes gastar hoje** — número certo, explicado em português claro.
2. **O talão fotografado vira movimento em 10 segundos** — melhor que qualquer competitor PT.
3. **Vês a tua dívida como um plano**, não como um susto — amortização, TAEG, alertas.
4. **A app avisa antes do problema**, não depois do saldo negativo.

### vs competidores (honesto)

| Competidor | CentFlow hoje | CentFlow potencial |
|------------|---------------|-------------------|
| **Revolut** | Perde em UX instantânea e banking nativo | Ganha em visão holística (dívida + objetivos + orçamento) |
| **Wallet** | Perde em polish e simplicidade | Ganha em profundidade PT (crédito, OCR, TAEG) |
| **YNAB** | Perde em método claro e fiabilidade de números | Ganha se orçamento mensal for fiável e explicado |
| **Spendee** | Perde em beleza e onboarding curto | Ganha em automação (OCR, open banking) |
| **Money Manager** | Empata em features, perde em coerência | Ganha se cortar 60% das features e polir 40% |
| **Excel** | Perde em tempo e erros manuais | Ganha em tempo real + alertas + OCR |

### O que tem de diferente (activo real)

- Domínio financeiro com testes (raro em apps consumer).
- Separação orçamento/património (conceito YNAB-like mas com património).
- Stack moderna (Expo 56, Supabase, edge functions).
- Focus Portugal (OCR, crédito, copy, GoCardless).

### O que NÃO tem (ainda)

- Confiança nos números (bugs F1–F4).
- Time-to-value < 2 minutos.
- Narrativa simples para utilizador não técnico.
- Polish visual consistente (cores hardcoded, temas).

---

# DOCUMENTO ESTRUTURADO

## 1. Problemas críticos

1. **Números possivelmente errados** — cartão 2×, património com objetivos, orçamento sem `budget_enabled` (F1–F4).
2. **Dois motores financeiros** — utilizador vê inconsistências entre ecrãs.
3. **Onboarding 17 passos** — abandono antes do valor.
4. **Home sobrecarregada** — sem «aha moment» em 120 segundos.
5. **Features fantasma** — benchmarks, privacidade, contas — destroem confiança.
6. **Propagação incompleta** — editar movimento não sincroniza crédito.
7. **Produto sem persona clara** — tenta ser tudo para todos.

## 2. Problemas importantes

1. Perfil ↔ Definições ainda duplicados (parcialmente corrigido).
2. Triple coaching (recomendações + acções + assistente).
3. Dívida e Património duplicados entre tabs e Análises.
4. `useFinancialState` ignora contas.
5. Cache `home`/`dashboard` duplicado.
6. Realtime sync incompleto.
7. REST legacy + mocks em produção.
8. God files (800+ linhas) impossíveis de manter.
9. Zero testes em hooks/components/UI.
10. Jargão e inglês residual.
11. 5 tabs — IA de navegação confusa.
12. Feature gates «activar área» pós-onboarding.
13. Login em inglês.
14. Sem link Perfil → Definições.

## 3. Problemas menores

1. `expo-video` não usada.
2. Hooks mortos (`useNetWorth`, `usePricesData`).
3. Widgets não integrados.
4. `debtToIncomeRatio` nomenclatura.
5. Cores hardcoded fora do tema (14 itens no AUDIT_REPORT).
6. `npm run handoff` falha (script gerador).
7. `npm run supabase:types` precisa `npx` no Windows.
8. Typed routes desactualizadas após renomear `creditos`.
9. Função interna `PrecosScreen` no ficheiro `creditos.tsx`.
10. Empty states com `Alert` em vez de onboarding inline.

## 4. Código morto

**Removido na Ronda 1:** 39 componentes.

**Ainda candidato a remoção:**
- `hooks/queries/useNetWorth.ts`
- `hooks/queries/usePricesData.ts`
- `lib/api/services/prices.service.ts`
- `lib/widgets/widget-data.ts`
- `components/useColorScheme.ts` (+ `.web.ts`)
- `components/useClientOnlyValue.ts` (+ `.web.ts`)
- `hooks/queries/useDashboard.ts` (deprecated)
- `expo-video` (dependência)
- REST client + mappers (após sunset)
- `app/(tabs)/precos.tsx` se ainda existir

## 5. Refatorações obrigatórias

| Prioridade | Refactor |
|------------|----------|
| P0 | Unificar motor financeiro v1 → v2 |
| P0 | Corrigir F1–F4 (cartão, património, contas, orçamento) |
| P0 | Sync crédito em `updateTransaction` |
| P1 | Unificar `queryKeys.home` / `dashboard` |
| P1 | Fonte única credits/subscriptions |
| P1 | Completar realtime + invalidação |
| P1 | Partir `AddTransactionModal`, `movimentos.tsx`, `onboarding.tsx` |
| P2 | Sunset REST API legacy |
| P2 | Consolidar simuladores |
| P2 | Mover lógica de ecrã para feature hooks |

## 6. Melhorias UX

1. Onboarding 3 passos → primeiro movimento em 60s.
2. Home: 1 número («Disponível: X€») + 1 acção + últimos 5 movimentos.
3. 3 tabs em vez de 5.
4. Novo movimento: Despesa/Receita visível; resto em «Mais».
5. Um centro de acções (não três).
6. Perfil = identidade + stats; Definições = tudo o resto; link directo.
7. Remover «activar áreas» — tudo activo ou progressive disclosure invisível.
8. Calendário renomeado «Previsão de saldo» + acesso em 1 toque.
9. Recorrentes descobríveis (segmento ou tab).
10. Explicador inline: «O que é disponível este mês?» em 2 frases.

## 7. Melhorias UI

1. Eliminar cores hardcoded (usar tokens do tema).
2. Login 100% PT-PT.
3. Tab Análises: menos halo, mais conteúdo útil por pixel.
4. Modo compacto na Home (preferência).
5. Empty states com ilustração + CTA (não Alert).
6. Consistência tipográfica (menos 3 linhas de saudação).
7. Polish em formulários de crédito (progressive disclosure já existe — replicar noutros).
8. Dark/light/skins — testar todos os ecrãs (não só Classic).

## 8. Melhorias financeiras

1. Corrigir duplicação cartão (F1).
2. `calculateConsolidatedNetWorth` em todo o pipeline (F2).
3. Ligar orçamento a `budget-accounts.ts` (F4).
4. Passar contas reais em `useFinancialState` (F3).
5. Open Banking: mapear `account_id`, transferências, cartão.
6. Filtro `expense` incluir `credit_card_purchase`.
7. Reembolsos em conta corrente reduzem gastos.
8. `balance_adjustment` bidireccional.
9. Loan payment → `scheduleFinancialRecalculation`.
10. Validar `calculateGoalOnTrack` com testes reais.

## 9. Melhorias de performance

1. FlashList já em Movimentos — expandir onde há listas longas.
2. Reduzir queries paralelas no bootstrap (prefetch coordenado).
3. Engine recálculo — debounce já existe; verificar se Doctor tracing polui hot paths.
4. Imagens OCR — já comprimidas; validar memória em talões grandes.
5. Bundle — remover `expo-video` e código morto reduz tamanho.
6. Evitar double fetch home/dashboard.

## 10. Melhorias arquitetura

1. Motor único (engine v2).
2. Feature hooks por ecrã.
3. Testes de integração: create tx → património → orçamento.
4. Supabase-only data layer (mocks só em dev).
5. Barrel exports limpos (sem duplicar `simulator`).
6. `useFinancialRecommendations` → derived state, não fake query.
7. Documentar pipeline de dados num diagrama vivo (`docs/architecture.md`).
8. Edge functions com testes smoke no CI.

## 11. Funcionalidades a remover

| Feature | Motivo |
|---------|--------|
| Doctor no menu utilizador | Ferramenta dev |
| Feature area gates | Confusão pós-onboarding |
| Benchmarks UI/consent | Sem valor visível |
| Tab Ativos (como tab) | Jargão + nicho; mover para secção |
| Onboarding 14 passos intermédios | Abandono |
| Coaching triplo | Redundância |
| Back Tap no fluxo principal | 1% dos users |
| Export PDF (v1.0) | Nicho; manter JSON |
| Score opaco | Sem educação |
| Simulador genérico | Manter só amortização |
| Contas na UI (já ocultas) | Remover código ou reintroduzir bem |

## 12. Funcionalidades a reconstruir

| Feature | Como |
|---------|------|
| **Home** | 1 número + 1 acção + feed curto |
| **Onboarding** | 3 passos + primeiro movimento |
| **Orçamento mensal** | Fiável, explicável, ligado a contas |
| **Património** | Um número, uma fórmula, testes verdes |
| **Open Banking** | 1 banco, conta ligada, sync fiável |
| **OCR** | Fluxo 3 toques: foto → confirmar → feito |
| **Créditos** | Manter profundidade, reduzir formulário inicial |
| **Recomendações** | 1 por dia, priorizada, com «porquê» |
| **Conta/Definições** | Um hub |

## 13. Funcionalidades revolucionárias

1. **«Quanto posso gastar hoje?»** — número hero fiável, explicado, push quando aperta.
2. **Talão → movimento em 10s** — OCR PT melhor que banco.
3. **Antes de falhar** — alerta 5 dias antes de saldo negativo com plano.
4. **Subscrições fantasma** — detecção + «podes poupar X€/mês».
5. **Uma pergunta, uma resposta** — «E se pagar mais 200€ no crédito?» → 3 linhas.
6. **Explicador de dinheiro** — cada número tem «porquê» em PT simples.
7. **Benchmark silencioso** — comparação anónima só com valor real.
8. **Receipt memory** — anomalia por comerciante recorrente.

## 14. Roadmap dos próximos 6 meses

### Mês 1 — Confiança (sem isto, nada mais importa)

- [ ] Corrigir F1–F4 (cartão, património, contas, orçamento).
- [ ] Unificar motor financeiro.
- [ ] Sync crédito em update.
- [ ] Testes de integração dos 5 fluxos críticos.
- [ ] Remover código morto restante.

### Mês 2 — Clareza (produto compreensível)

- [ ] Onboarding 3 passos.
- [ ] Home reconstruída (1 número + 1 acção).
- [ ] 3 tabs.
- [ ] Perfil/Definições unificados.
- [ ] PT-PT 100% no auth e labels.
- [ ] Remover Doctor do menu; esconder features WIP.

### Mês 3 — Diferenciação (beta pública)

- [ ] OCR fluxo curto polido.
- [ ] Open Banking 1 banco fiável.
- [ ] Calendário/previsão como push + widget Home.
- [ ] Centro de acções único.
- [ ] Créditos: formulário simplificado, simulador amortização hero.

### Mês 4 — Inteligência (IA útil)

- [ ] Projeção 30 dias como insight diário.
- [ ] Detecção subscrições + CTA.
- [ ] Explicador de movimentos e números.
- [ ] Assistente v2: contexto dos dados, 1 pergunta pré-definida por situação.

### Mês 5 — Escala e polish

- [ ] Benchmarks com UI real (opt-in).
- [ ] Temas/skins testados em todos os ecrãs.
- [ ] Performance (bundle, prefetch, listas).
- [ ] Testes hooks críticos.
- [ ] Sunset REST legacy.

### Mês 6 — Lançamento

- [ ] App Store / Play Store assets.
- [ ] Política privacidade + eliminação conta.
- [ ] Beta fechado 50 users → métricas (D1, D7, primeiro movimento, erro de números).
- [ ] Narrativa marketing: «Para onde vai o teu dinheiro?» com demo 60s.

---

## 15. O que faria se este projecto fosse meu

### Dia 1

1. **Parar features novas.** Congelar scope.
2. **Correr ledger audit com dados reais** de 3 utilizadores beta — comparar números app vs Excel manual.
3. **Fix F1–F4** antes de qualquer pixel de UI.

### Semana 1

4. Apagar ou esconder tudo o que mostra «em breve» ou não funciona.
5. Escrever num post-it: **«A CentFlow responde: quanto posso gastar este mês?»** — colar na parede.
6. Redesenhar Home em Figma (ou papel): um número, uma acção, cinco movimentos.

### Semana 2–4

7. Onboarding novo: registo → «quanto ganhas?» → primeiro movimento → Home.
8. Unificar motor. Um número, uma verdade.
9. Contratar ou gravar com 5 pessoas reais (não devs) a usar a app — observar onde param.

### Decisões estratégicas

10. **Não competir com Revolut em banking.** Competir em **clareza + Portugal + dívida + talões**.
11. **IA só quando determinístico falha** — regras primeiro, LLM para explicar, não para calcular.
12. **Cortar 40% da superfície** para lançar; o resto é v1.1, v1.2.
13. O domínio em `lib/domain/financial/` é ouro — **proteger, testar, unificar**; nunca mais duplicar.

### A frase que me guiaria

> «Uma avó de Albufeira abre a app depois do supermercado, fotografa o talão, e em 30 segundos sabe se ainda pode jantar fora este mês.»

Se isso funcionar, o resto é expansão. Se não funcionar, nada mais importa.

---

## Epílogo

A CentFlow não precisa de mais features.

Precisa de **menos mentiras** (números errados, botões mortos, promessas vazias).

Precisa de **menos ruído** (17 passos, 5 tabs, 3 coachings, 2 hubs de conta).

Precisa de **uma história** que um humano conta num jantar em 10 segundos:

**«É a app que me diz quanto posso gastar — e funciona em português.»**

O código para isso **já existe** em `lib/domain/financial/`.

O produto **ainda não**.

Esse gap é o breakthrough.

---

*Documento gerado em 2026-07-12. Baseado em auditoria completa do repositório, AUDIT_REPORT.md (Ronda 1), HANDOFF.md, 73 testes de domínio, e análise de ~50 rotas + ~210 componentes.*
