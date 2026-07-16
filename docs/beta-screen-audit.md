# Beta Screen Audit — CentFlow

> Inventário de ecrãs para Beta Pública Controlada (Jul 2026).  
> **38 rotas** em `app/` + componentes full-screen em `components/`.

Legenda de estado: ✅ Completo · ⚠️ Parcial · 🔲 Placeholder · ❌ Em falta

---

## Legenda de estados UX

| Estado | Componentes típicos |
|--------|---------------------|
| Loading | `*Skeleton`, `LoadingSpinner`, `RefetchingIndicator` |
| Erro | `ErrorState` + retry |
| Vazio | `EmptyState`, `AssetsEmptyState`, `GoalsEmptyState` |
| Offline | **Não dedicado** — mensagens de rede em `ErrorState` / toasts |

---

## 1. Bootstrap

| Rota | Ficheiro | Hooks | API | Loading | Erro | Vazio | Offline |
|------|----------|-------|-----|---------|------|-------|---------|
| `/` | `app/index.tsx` | `useAuth` | — | `AuthLoadingScreen` | — | redirect | — |
| *(global)* | `app/_layout.tsx` | `useAuth`, Query | Supabase sync | bootstrap vazio | `StartupErrorScreen` | — | refetch AppState |

**Dependências:** `AuthProvider`, `QueryClientProvider`, `BiometricGate`, `RemoteDataSyncEffect`.

---

## 2. Autenticação

| Rota | Ficheiro | Hooks | Mutations | Loading | Erro | Notas |
|------|----------|-------|-----------|---------|------|-------|
| `/(auth)/login` | `login.tsx` | `useAuth` | `signIn`, Google | botão | Card API + sessão expirada | ✅ |
| `/(auth)/register` | `register.tsx` | `useAuth` | `signUp`, Google | botão | Card API | ✅ |
| `/(auth)/forgot-password` | `forgot-password.tsx` | — | `requestPasswordReset` | botão | Card | ✅ |
| `/(auth)/password-reset-success` | `password-reset-success.tsx` | — | — | — | — | estático ✅ |
| `/reset-password` | `reset-password.tsx` | `useToast` | `completePasswordRecovery` | init spinner | Card | ✅ |
| `/auth/callback` | `auth/callback.tsx` | `useAuth`, Linking | OAuth callback | `AuthLoadingScreen` | Card + login | ✅ |

**Mensagens:** `lib/auth/errors.ts` — humanizadas, inclui rede e Supabase.

---

## 3. Tabs principais

### 3.1 Home `/(tabs)/index`

| Aspeto | Detalhe |
|--------|---------|
| Hooks | `useHomeScreenData`, `useCentFlowIntelligence`, `useOnboardingAnswers`, `useProfile` |
| API | `fetchHomeScreenData` |
| Loading | `DashboardSkeleton` ✅ |
| Erro | `ErrorState` context=`dashboard` + pull-to-refresh ✅ |
| Vazio | Secções omitidas sem actividade (sem empty global) ⚠️ |
| Modais | AddTransaction, QuickAdd, Attention, Spendable, ActionCenter |

### 3.2 Movimentos `/(tabs)/movimentos`

| Aspeto | Detalhe |
|--------|---------|
| Hooks | `useTransactions`, mutations CRUD, `useLiabilities`, `useSubscriptionDetection` |
| Params | `?view=subscricoes`, `?action=receipt|new-movement|new-subscription` ✅ |
| Loading | `TransactionsSkeleton` ✅ |
| Erro | `ErrorState` context=`movements` ✅ |
| Vazio | `EmptyState` contextual + pesquisa ✅ |
| Subscrições | `AssetsEmptyState` via `SubscriptionsSection` ✅ |

### 3.3 Análises `/(tabs)/analises`

| Aspeto | Detalhe |
|--------|---------|
| Hooks | `useAnalysisData`, `useTransactions`, `useAssets` |
| Loading | `AnalysisSkeleton` ✅ |
| Erro | `ErrorState` context=`analysis` ✅ |
| Sub-tabs | Resumo, Gastos, Dívida, Património — ver componentes |

**AnalysisDebtTab:** `useFinancialEngineSnapshot` + seletores ledger; loading texto; empty inline cartões.

### 3.4 Créditos `/(tabs)/creditos`

| Aspeto | Detalhe |
|--------|---------|
| Hooks | `useLiabilities`, `useDeleteCredit` |
| Params | `?action=new-credit` ✅ **(corrigido neste sprint)** |
| Loading | `LoadingSpinner` ✅ |
| Erro | `ErrorState` context=`credits` ✅ **(corrigido)** |
| Vazio | `AssetsEmptyState` em `CreditsSection` ✅ |
| Gate | `FeatureAreaGate` feature=`credits` |

### 3.5 Ativos `/(tabs)/ativos`

| Aspeto | Detalhe |
|--------|---------|
| Hooks | `useAssets`, delete mutations |
| Params | `?tab=`, `?action=new-goal|new-warranty|new-asset` ✅ |
| Loading | `AssetsSkeleton` ✅ |
| Erro | `ErrorState` context=`assets` ✅ |
| Vazio | `GoalsEmptyState`, `WarrantiesEmptyState`, `AssetsEmptyState` ✅ |

### 3.6 Perfil `/(tabs)/perfil` (tab oculta)

| Aspeto | Detalhe |
|--------|---------|
| Hooks | `useProfile`, `useFinancialProfile`, `useFeatureAreas` |
| Loading | `ProfileSkeleton` ✅ |
| Erro | `ErrorState` context=`profile` ✅ |
| Activar áreas | toast sucesso/erro ✅ **(corrigido)** |

---

## 4. Onboarding `/onboarding`

| Aspeto | Detalhe |
|--------|---------|
| Hooks | `useOnboarding`, `useOnboardingAnswersState`, `useProfile` |
| API | `saveOnboardingAnswersForUser` |
| Loading | `finishing` no passo final ✅ |
| Erro | sem ErrorState global ⚠️ |
| Gate | `OnboardingGateEffect` redirecciona incompletos |

---

## 5. Ecrãs stack

| Rota | Componente | Hooks | Loading | Erro | Vazio |
|------|------------|-------|---------|------|-------|
| `/calendar` | `FinancialCalendarScreen` | `useFinancialCalendar` | Spinner ✅ | ErrorState ✅ | hint dias |
| `/assistant` | `FinancialAssistantScreen` | `useFinancialAssistantChat` | Spinner ✅ | inline humanizado ✅ | FAQ inicial |
| `/quick-expense` | `QuickExpenseSheet` | `useCreateTransaction` | — | toast ✅ | fecha sem params |

---

## 6. Settings `/settings/*`

| Rota | Loading | Erro | Vazio / Notas |
|------|---------|------|---------------|
| `/settings` | — | — | menu estático |
| `/settings/personal-data` | Spinner | ErrorState | — |
| `/settings/security` | Spinner prefs | Alert/toast | sessões |
| `/settings/appearance` | Spinner | — | — |
| `/settings/notifications` | Spinner | toast | — |
| `/settings/financial-suggestions` | Spinner | — | — |
| `/settings/currency-region` | Spinner | — | — |
| `/settings/bank-connections` | Spinner ×2 | ErrorState | empty texto |
| `/settings/privacy` | — | — | política “em breve” 🔲 |
| `/settings/benchmark-consent` | Spinner | toast | — |
| `/settings/shortcuts` | — | toast | estático |
| `/settings/export-data` | disabled while loading | toast | — |
| `/settings/export-pdf` | full Spinner | toast | — |
| `/settings/diagnostics` | — | redirect se off | Doctor dev/beta |

---

## 7. Callbacks / misc

| Rota | Estados |
|------|---------|
| `/open-banking/callback` | Loading → sucesso/erro Card |
| `+not-found` | 404 + botão início ✅ |

---

## 8. Offline — conclusão

**Sem modo offline dedicado** (sem NetInfo / persistência queries).

Recuperação indirecta:
- `ErrorState` com mensagens de rede (`lib/api/errors.ts`)
- Toasts em mutações
- Cache stale React Query
- `RemoteDataSyncEffect` ao voltar à app

---

## 9. Mapa hooks → serviços

| Hook | Serviço |
|------|---------|
| `useHomeScreenData` | `home.service` |
| `useAnalysisData` | `analysis.service` |
| `useTransactions` | `transaction.service` |
| `useAssets` | `assets.service` |
| `useLiabilities` | `liabilities.service` |
| `useFinancialEngineSnapshot` | motor + `queryKeys.financialEngine` |
| `useBankConnections` | `gocardless.service` |
| `useFinancialAssistantChat` | motor local + Supabase edge |

---

## 10. Gaps identificados (pré-correcção)

| ID | Ecrã | Problema | Severidade |
|----|------|----------|------------|
| B1 | Créditos | `?action=new-credit` ignorado | Alta → **corrigido** |
| B2 | Créditos | Erro com copy de “Ativos” | Média → **corrigido** |
| B3 | FeatureAreaGate | Activar área falhava em silêncio | Média → **corrigido** |
| B4 | Assistant | Erro técnico raw na UI | Média → **corrigido** |
| B5 | Global | Sem banner offline | Média — pendente |
| B6 | Privacidade | Política/termos “em breve” | Release — pendente |
| B7 | Privacidade | Eliminar conta não implementado | Release — pendente |
| B8 | AnalysisDebtTab | Loading só texto, sem skeleton | Baixa — pendente |
