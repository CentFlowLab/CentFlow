# AUDIT_REPORT — CentFlow

**Data da auditoria:** 2026-07-12  
**Última actualização:** 2026-07-12 — Ronda 1 de correcções  
**Âmbito:** `/app`, `/components`, `/lib` (referência), `/hooks` (estados de UI)

### Estado Ronda 1 (2026-07-12)

| Bloco | Itens | Corrigidos |
|-------|-------|------------|
| A — 7 CRÍTICOS | A1–A7 | **7/7** |
| B — Perfil ↔ Definições | B1–B5 | **5/5** |
| C — Componentes mortos | C1–C2 | **39 ficheiros removidos**; testes `calendar.test.ts` OK; `npm test` global com falhas pré-existentes em outros módulos |

---

## Resumo executivo

| Categoria | CRÍTICA | MÉDIA | BAIXA | Total |
|-----------|---------|-------|-------|-------|
| Funcionalidade / UX enganadora | 4 | 6 | — | 10 |
| Estados de UI (loading/erro/vazio) | 2 | 9 | 2 | 13 |
| Código morto | — | 2 | — | 2 |
| Consistência visual / tema | — | 8 | 6 | 14 |
| Idioma (PT-PT vs inglês) | — | 5 | 3 | 8 |
| Navegação / IA | 1 | 5 | 2 | 8 |
| Stack técnico | — | — | 1 | 1 |
| TODO / FIXME / placeholders | — | 2 | 1 | 3 |
| **Total de itens acionáveis** | **7** | **39** | **15** | **61** |

**Inventário adicional (sem severidade própria):**
- **38 componentes** candidatos a remoção (nunca montados)
- **0 ecrãs órfãos funcionais** (4 ecrãs só via deep link; `+not-found` é fallback do router)
- **Stack limpo:** sem `@react-navigation` directo, sem Zustand, sem `expo-sqlite`, sem pasta `/src`

---

## Severidade CRÍTICA (quebra funcionalidade ou é claramente enganador ao utilizador)

1. **`components/calendar/FinancialCalendarScreen.tsx:121-127`** + **`hooks/useFinancialCalendar.ts:51-53`**  
   ~~Se `buildFinancialCalendar` falhar...~~  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** hook expõe `isError`, `error`, `refetch`; ecrã mostra `ErrorState` com retry em vez de spinner infinito.

2. **`app/settings/export-data.tsx:17-57`**  
   ~~Exportação JSON não espera...~~  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** botão bloqueado até `useTransactions`, `useAssets` e `useLiabilities` terminarem (`dataLoading`).

3. **`app/settings/shortcuts.tsx:26-31,54-56`**  
   ~~Botão «Copiar URL»...~~  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** renomeado para «Partilhar URL» com ícone de partilha; copy alinhado ao `Share.share()`.

4. **`components/profile/ProfileHubSections.tsx:306-309`** + **`app/(tabs)/movimentos.tsx:156-159`**  
   ~~Estatística «Créditos»...~~  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** stat navega directamente para `/(tabs)/creditos` (tab renomeada de `precos`).

5. **`app/settings/privacy.tsx:40,78`**  
   ~~Botões «Ver política» e «Pedir eliminação»...~~  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** botões removidos; apenas texto «Disponível em breve» sem acção falsa.

6. **`app/settings/bank-connections.tsx`** (ecrã completo)  
   ~~Queries não tratam `isError`...~~  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** `ErrorState` + retry quando `useBankConnections` ou `useSupportedBanks` falham.

7. **`lib/analytics/analytics.service.ts:74`**  
   ~~TODO post-beta...~~  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** persistência em Supabase `analytics_events` (migration `20240716100000_analytics_events.sql`); ignora mock auth.

---

## Severidade MÉDIA (clutter, inconsistência visual, código morto sem impacto funcional imediato)

### Estados de UI em falta

8. **`app/settings/appearance.tsx:36-41`** — só loading; sem `isError` / retry se `useUserPreferences` falhar.

9. **`app/settings/notifications.tsx:54-59`** — idem.

10. **`app/settings/financial-suggestions.tsx:76-81`** — idem.

11. **`app/settings/benchmark-consent.tsx:34-41`** — idem.

12. **`app/settings/currency-region.tsx:61-66`** — idem (dois hooks: profile + preferences).

13. **`app/settings/security.tsx:189-194`** — loading de preferences; sem erro se fetch falhar (ecrã pode renderizar com toggles em estado default incorrecto).

14. **`app/settings/export-pdf.tsx:39-44`** — loading parcial; sem `ErrorState` se qualquer query falhar; export pode prosseguir com dados parciais.

15. **`app/(tabs)/ativos.tsx`** — após load com sucesso, secções têm empty states; **nível de ecrã** não distingue «zero dados» de «erro já tratado» — aceitável, mas **tab `inventario`** sem dados mostra empty genérico sem CTA global se feature inactiva (coberto por `FeatureAreaGate`).

16. **`components/assistant/FinancialAssistantScreen.tsx:93-97`** — erro mostrado como `Text` caption; sem `ErrorState`, retry ou empty state estruturado.

### Código morto e clutter

17. **`components/` — 38 ficheiros `.tsx` nunca importados...**  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** 39 ficheiros removidos + barrels actualizados; `RefetchingIndicator` extraído para ficheiro próprio.

18. **`components/diagnostics/DiagnosticOverlay.tsx:6-8`**  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** ficheiro e montagem em `app/_layout.tsx` removidos.

### Navegação e duplicação de IA

19. **`components/profile/ProfileHubSections.tsx:202-221`** vs **`app/settings/index.tsx`**  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** Perfil mantém apenas links de navegação (captions «· Definições»); UI completa só em `/settings/*`.

20. **`app/settings/personal-data.tsx`** e **`app/settings/currency-region.tsx`**  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** entradas adicionadas ao menu `app/settings/index.tsx`.

21. **Terminar sessão em 3 sítios**  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** removido de `perfil.tsx`; mantido em `security.tsx` e `ProfileMenuSheet.tsx`.

22. **`app/(tabs)/perfil.tsx`** — sem atalho para `/settings` — **PENDENTE (Ronda 2 ou decisão de produto).**

23. **Ficheiro `app/(tabs)/precos.tsx`**  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** renomeado para `app/(tabs)/creditos.tsx`; referências actualizadas.

24. **`app/settings/privacy.tsx:62-69`**  
   **✅ Corrigido (Ronda 1) — 2026-07-12:** card actualizado com link para ligações bancárias activas.

### Consistência visual (cores hardcoded fora de `lib/theme`)

25. **`components/calendar/FinancialCalendarScreen.tsx:23-24`** — `rgba(245, 158, 11, …)` e `rgba(239, 68, 68, …)` fixos; não reagem aos 4 temas.

26. **`components/analysis/SpendingCalendarCard.tsx:86`** — `rgba(99, 102, 241, ${alpha})` (índigo fixo).

27. **`components/profile/FinancialProfileProgress.tsx:183`** — gradiente teal hardcoded (`rgba(45,212,191,…)`), optimizado para tema Classic.

28. **`components/layout/TabBarAnalisesIcon.tsx:42,104-106`** — múltiplos `rgba` fixos no ícone da tab Análises.

29. **`components/layout/QuickAddMenuSheet.tsx:67`** + **`components/movements/TransactionContextMenuSheet.tsx:45`** — `rgba(251, 191, 36, 0.12)` duplicado em vez de `colors.warningMuted`.

30. **`components/ui/SearchableSelect.tsx:184`** + **`components/movements/ReceiptPreview.tsx:147`** — overlay `rgba(0,0,0,0.55)` em vez de `colors.overlay`.

31. **`components/onboarding/OnboardingIllustration.tsx:68`** — `rgba(255,255,255,0.04)` fixo.

32. **`components/assets/GoalListItem.tsx:105`** — gradiente verde fixo.

### Idioma

33. **`app/(auth)/login.tsx:97,108`**, **`register.tsx:130,141`**, **`personal-data.tsx:79`** — labels **«Email»** e **«Password»** em inglês na UI.

34. **`app/settings/bank-connections.tsx:149,193`** — títulos **«Open Banking»** e botão **«Sync»** em inglês.

35. **`app/settings/security.tsx:251`** — badge **«Actual»** (mistura EN/PT); deveria ser «Actual» PT ou «Atual» conforme guia do projecto (projecto usa «activa/actual» com c).

36. **`app/(tabs)/perfil.tsx:28`** — comentário de código em inglês (`Keeps analytics user context fresh`).

37. **`app/settings/benchmark-consent.tsx:47-51`** — termo **«Benchmarks»** no subtítulo (anglicismo técnico aceitável mas inconsistente com resto PT-PT).

### Formulários

38. **`app/settings/personal-data.tsx:28-36`** — valida só `name` obrigatório; `email` aceita qualquer string sem `zod`/formato antes de `mutateAsync`.

39. **`app/(auth)/login.tsx`** — validação mínima (delegada a `authService`); coerente, mas sem feedback de campo por campo como no registo.

### Placeholders / WIP explícitos

40. **`app/settings/privacy.tsx:42`** — «Disponível em breve no site CentFlow» (política de privacidade).

41. **`app/settings/privacy.tsx:76`** — eliminação de conta «quando o backend estiver pronto».

### Outros

42. **`components/analysis/SpendingBenchmarkCard.tsx:10-10`** — UI de benchmarks montada em `AnalysisSpendingTab` mas `return null` por defeito (`SPENDING_BENCHMARKS_UI_ENABLED`). Consentimento em settings existe sem superfície visível na app — possível confusão.

43. **`app/settings/diagnostics.tsx`** — usa `AppHeader` em vez de `SettingsScreenLayout` como os restantes settings; padrão visual diferente.

44. **`components/settings/ChangePasswordModal.tsx`** — componente completo nunca usado; segurança usa fluxo por email (`security.tsx:207-219`).

45. **`app/(tabs)/index.tsx:112-126`** — `AppHeader` com `leading` + **`showAvatar` default `true`** (`AppHeader.tsx:40`) — avatar e saudação coexistem; pode ser intencional mas aumenta clutter no header da Home.

46. **`components/dashboard/DashboardGreeting.tsx`** — incluía `router.push('/(tabs)/perfil')` mas componente **morto**; acesso ao perfil depende só do avatar (`UserAvatarButton`).

---

## Severidade BAIXA (nice-to-have, polish)

47. **`app/settings/appearance.tsx:112,123,133,150,162`** — `borderRadius: 16|12|999` literais em vez de `radius.lg`, `radius.md`, `radius.full` (`lib/theme/spacing.ts:17-23`).

48. **`app/settings/bank-connections.tsx:312,373,386`** — `borderRadius: 999` vs token `radius.full` (9999).

49. **`components/icons/AnalysisIconMark.tsx`** — componente morto com paleta SVG hardcoded (`#5EEAD4`, `#9CA8B8`, etc.).

50. **`lib/export/export.service.ts:286-562`** — HTML/PDF com cores fixas tema Classic; export não reflecte tema activo do utilizador (aceitável para PDF estático).

51. **`app/+not-found.tsx`** — único ecrã sem navegação in-app deliberada; mensagem genérica OK.

52. **`app/quick-expense.tsx`**, **`app/auth/callback.tsx`**, **`app/reset-password.tsx`**, **`app/open-banking/callback.tsx`** — entry points deep link apenas; documentados em `app.json` / serviços; não são bugs.

53. **`components/movements/TransactionListItem.tsx`** — substituído por `SwipeableTransactionListItem`; item simples órfão.

54. **`components/budget/AllocateToGoalCard.tsx`** — nunca montado; funcionalidade pode estar noutro card (`FinancialActionsCard`).

55. **`components/ui/QueryScreenState.tsx`** — helper de estados nunca adoptado; ecrãs implementam padrões ad hoc.

56. **`components/onboarding/OnboardingPlanLoading.tsx`** etc. — 7 componentes de onboarding antigo exportados em barrel mas não usados pelo fluxo actual (`app/onboarding.tsx` usa `premium/`).

57. **`scripts/test-ocr-sanitize.ts:98`** — string de teste `XXX` (não é UI).

58. **Espaçamento `marginTop: 2` / `gap: 2`** em `DashboardHeaderLeading.tsx:51,53` e `FeatureAreaGate.tsx:96` — valores fora da escala `spacing` (`xs` = 4).

59. **`app/settings/shortcuts.tsx:105`** — `fontFamily: 'Courier'` hardcoded no URL (web-safe questionável em iOS).

60. **Assistente (`app/assistant.tsx`)** — FAQ vazio funciona como empty state implícito; sem mensagem «ainda sem conversas» além dos chips FAQ.

61. **Stack técnico** — conforme: Expo Router, TanStack Query, Supabase, estrutura plana `/app` `/lib` `/components`. `react-native-screens` presente apenas como dependência transitiva.

---

## Ecrãs órfãos / componentes não usados

### Ecrãs (`/app`)

| Caminho | Nota |
|---------|------|
| `app/+not-found.tsx` | Fallback automático Expo Router — esperado |
| `app/quick-expense.tsx` | Deep link `centflow://quick-expense` |
| `app/auth/callback.tsx` | Deep link OAuth |
| `app/reset-password.tsx` | Deep link recovery Supabase |
| `app/open-banking/callback.tsx` | Deep link GoCardless |

*Nenhum ecrã de produto está totalmente inacessível — os 4 acima são entry points externos.*

### Componentes nunca montados (38 + 2 em cadeia)

```
components/movements/ImportCsvModal.tsx
components/movements/OcrDetectionSummary.tsx
components/movements/OcrResultCard.tsx
components/movements/TransactionListItem.tsx
components/accounts/AccountFormModal.tsx
components/accounts/AccountPickerField.tsx
components/accounts/TransferAccountModal.tsx
components/accounts/AccountListItem.tsx          ← só usado por AccountsSection (morta)
components/assets/AccountsSection.tsx
components/assets/AssetsSectionShell.tsx
components/assets/AssetsTabToolbar.tsx
components/assets/RegisterCreditPaymentModal.tsx
components/budget/AllocateToGoalCard.tsx
components/budget/CategoryBudgetAlertsCard.tsx
components/analysis/PricesInsightsSection.tsx
components/simulator/DecisionSimulatorSection.tsx
components/diagnostics/DiagnosticLogPanel.tsx
components/icons/AnalysisIconMark.tsx
components/ui/QueryScreenState.tsx
components/ui/skeletons/PricesSkeleton.tsx
components/settings/ChangePasswordModal.tsx
components/settings/SettingsOptionGroup.tsx
components/dashboard/CentFlowScoreCard.tsx
components/dashboard/CentFlowScoreSheet.tsx
components/dashboard/DashboardFinancialSnapshot.tsx
components/dashboard/DashboardGreeting.tsx
components/dashboard/HomeChangesSheet.tsx
components/dashboard/HomeGoalHighlightCard.tsx
components/dashboard/HomeQuickActions.tsx
components/dashboard/NetWorthHeroCard.tsx
components/dashboard/MetricCard.tsx              ← só usado por HomeChangesSheet (morta)
components/onboarding/AnimatedAssistantMessage.tsx
components/onboarding/FeatureAreaCard.tsx
components/onboarding/OnboardingPlanLoading.tsx
components/onboarding/OnboardingStepHeader.tsx
components/onboarding/OnboardingValueCard.tsx
components/onboarding/SelectableCard.tsx
components/onboarding/ValuePromiseSection.tsx
```

**Vivos mas só em barrel:** vários exportados em `components/*/index.ts` sem consumidores — limpar re-exports ao remover.

---

## Perfil e Definições — inventário item a item

### `app/(tabs)/perfil.tsx`

| Elemento | Justificação | Recomendação |
|----------|--------------|--------------|
| Header «Perfil» + back | Ecrã de detalhe acessível via avatar | **Manter** |
| `ProfileSkeleton` / `ErrorState` | Estados de carga e erro do perfil | **Manter** |
| `ProfileHubSections` (ver tabela abaixo) | Hub principal da conta | **Manter** |
| `FinancialProfileProgress` (slot) | Score financeiro compacto | **Manter** |
| `FinancialProfileDetailSheet` | Detalhe do score ao toque | **Manter** |
| Botão «Terminar sessão» | Acção essencial de conta | **Manter** — considerar remover duplicados noutros sítios |
| `useAnalytics()` sem UI | Refresca contexto analytics | **Manter** (lógica) |

### `ProfileHubSections` (`components/profile/ProfileHubSections.tsx`)

| Elemento | Justificação | Recomendação |
|----------|--------------|--------------|
| Secção **Conta** — avatar iniciais | Identidade visual | **Manter** |
| Nome + email | Dados da conta | **Manter** |
| Pill «Conta activa» / «Sessão pendente» | Estado de auth | **Manter** |
| «Desde {data}» | Membro desde onboarding | **Manter** |
| Row **Editar dados pessoais** | Navega para `/settings/personal-data` | **Manter** — adicionar também em `/settings` |
| Slot **perfil financeiro** | Progress/score | **Manter** |
| Row **Moeda e região** | Preferências regionais | **Manter** — adicionar em `/settings` |
| Row **Notificações** | Duplica menu settings | **Manter** ou **rever** — unificar num só sítio |
| Row **Segurança** | Duplica menu settings | **Manter** ou **rever** |
| Row **Aparência** | Duplica menu settings | **Manter** ou **rever** |
| Card **planLabel** (CentFlow/Beta/Dev) | Variante da app | **Manter** |
| Badge **Gratuito** | Plano actual (único) | **Manter** — até existir plano pago |
| Contador áreas activas + versão | Transparência de feature flags | **Manter** |
| Lista **ALL_FEATURE_AREAS** com emoji | Activar áreas de produto | **Manter** — útil para utilizadores pós-onboarding |
| Botões **Activar** por área | `activateFeature()` real | **Manter** |
| Secção **Estatísticas** (5 métricas clicáveis) | Atalhos para tabs | **Manter** — corrigir link Créditos (item CRÍTICO #4) |
| Stat **Créditos** → `movimentos?view=creditos` | Redirect oculto para `precos` | **Rever** — apontar directamente para `/(tabs)/precos` |

### `app/settings/index.tsx` (menu Definições)

| Elemento | Justificação | Recomendação |
|----------|--------------|--------------|
| Segurança | Biometria, password, sessões | **Manter** |
| Notificações | Push/email | **Manter** |
| Sugestões financeiras | Toggles de regras IA | **Manter** |
| Aparência | Temas | **Manter** |
| Atalhos rápidos | Back Tap iOS | **Manter** |
| Ligações bancárias | Open Banking | **Manter** |
| Privacidade | Export, benchmarks, política | **Manter** |
| Exportar PDF | Relatório | **Manter** |
| Exportar dados | JSON backup | **Manter** — corrigir race de loading |
| Repetir onboarding | Re-personalização | **Manter** |
| CentFlow Doctor (se `isDiagnosticsEnabled`) | Debug interno | **Manter** |
| *Ausente:* Dados pessoais | Só no Perfil | **Rever** — adicionar ao menu |
| *Ausente:* Moeda e região | Só no Perfil | **Rever** — adicionar ao menu |

### `app/settings/*` (ecrãs filhos)

| Ecrã | Elementos notáveis | Recomendação |
|------|-------------------|--------------|
| `security.tsx` | Password por email, biometria, sessões, logout | **Manter** — remover logout duplicado do Perfil? |
| `notifications.tsx` | Push + email toggles + slider categoria | **Manter** |
| `financial-suggestions.tsx` | Prioridade dívida + 5 regras | **Manter** |
| `appearance.tsx` | Grid 4 temas com preview | **Manter** |
| `shortcuts.tsx` | Guia Back Tap + URL | **Manter** — corrigir «Copiar URL» |
| `bank-connections.tsx` | Lista bancos PT, sync, renovar | **Manter** — PT-izar «Sync», adicionar erro |
| `privacy.tsx` | Export, política, benchmarks, eliminar conta | **Manter** — remover/atualizar cards WIP |
| `export-pdf.tsx` | Secções seleccionáveis | **Manter** |
| `export-data.tsx` | Contagem + export JSON | **Manter** — gate de loading |
| `benchmark-consent.tsx` | Opt-in benchmarks | **Manter** — alinhar com UI Análises |
| `personal-data.tsx` | Nome/email | **Manter** — validar email |
| `currency-region.tsx` | Moeda + país searchable | **Manter** |
| `diagnostics.tsx` | Doctor, logs, testes email | **Manter** (dev/beta) |

---

## TODO / FIXME / HACK / placeholders (localização exacta)

| Ficheiro | Linha | Texto |
|----------|-------|-------|
| `lib/analytics/analytics.service.ts` | 74 | `TODO (post-beta): send to real analytics backend` |
| `app/settings/privacy.tsx` | 42 | «Disponível em breve no site CentFlow.» |
| `app/settings/privacy.tsx` | 76 | «disponível quando o backend estiver pronto» |
| `scripts/test-ocr-sanitize.ts` | 98 | `merchantName: 'XXX'` (fixture de teste) |

*Nota:* Ocorrências de «em breve» em copy de produto (garantias, subscrições, emails) são mensagens legítimas, não placeholders de implementação.

---

## Árvore de navegação (resumo)

```
/ → Redirect auth
├── (auth)/login ↔ register ↔ forgot-password → password-reset-success
├── onboarding (gate + settings redo)
├── (tabs)/
│   ├── index (Início) → assistant, calendar, modais, quick-add, outras tabs
│   ├── movimentos (movimentos | subscrições; creditos → redirect precos)
│   ├── analises (4 sub-tabs internas)
│   ├── precos [label: Créditos]
│   ├── ativos (objetivos | garantias | inventário)
│   └── perfil [href:null] → settings/*
├── settings/ → 12 sub-ecrãs + diagnostics (flag)
├── calendar, assistant, quick-expense
├── auth/callback, reset-password, open-banking/callback
└── +not-found
```

**Inconsistências de profundidade:**
- Perfil (2 cliques via avatar) agrega preferências que também estão em Definições (3 cliques).
- Calendário e Assistente a 1 clique da Home — adequado.
- Dados pessoais a 2 cliques (avatar → perfil → row) mas ausente de Definições.

---

## Alinhamento stack técnico (Fase G)

| Regra | Estado |
|-------|--------|
| Só Expo Router (sem React Navigation directo) | ✅ |
| Sem Zustand | ✅ |
| Sem SQLite / expo-sqlite | ✅ |
| Sem wrapper `/src` | ✅ (`@/` → raiz) |
| TanStack Query para servidor | ✅ |
| Supabase persistência | ✅ |

---

## Itens pendentes para rondas futuras

Todos os itens numerados acima permanecem por corrigir até o Manu aprovar explicitamente uma lista para uma ronda de correcção.

**Prioridade sugerida para próxima ronda:**
1. CRÍTICOS #1–#7 (calendar erro, export race, Copiar URL, link Créditos, botões privacy, bank-connections erro, analytics)
2. Unificação Perfil ↔ Definições (#19–#22)
3. Remoção dos 38 componentes mortos (#17)
4. Cores hardcoded → tokens (#25–#31)
5. PT-PT labels (#33–#35)

---

*Relatório gerado por auditoria read-only. Nenhum ficheiro de código da aplicação foi modificado.*
