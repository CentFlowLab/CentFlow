<!-- ⚠️ AUTO-GENERATED — não editar manualmente -->
<!-- Gerado por: npm run handoff -->
<!-- Última geração: 2026-07-16T23:04:29.054Z -->
<!-- Git: 258a73a (2026-07-12T20:58:14+01:00) -->

# CentFlow Mobile — Handoff

> **Where does it go?** — Documento vivo para partilha com outros agents (Grok, Claude, etc.)
>
> Este ficheiro é **gerado automaticamente**. Para alterar conteúdo curado (fases, pendências),
> edita `scripts/handoff.config.json` e corre `npm run handoff`.

---

## Meta

| Campo | Valor |
|-------|-------|
| Fase atual | **RC2 Device QA — build Android 607cc31c errored; smoke bloqueado até novo APK** |
| Última geração | 2026-07-16T23:04:29.054Z |
| Path do projeto | `C:\Users\Emanuel\Documents\CentFlow` |
| Git commit | `258a73a` (2026-07-12T20:58:14+01:00) |

---

## Stack

Expo ~56.0.11 · Expo Router ~56.2.10 · React 19.2.3 · React Native 0.85.3 · TanStack Query ^5.101.0 · TypeScript

**Comandos:**
```bash
cd centflow
npm start
npm run handoff    # regenerar este ficheiro
npx tsc --noEmit   # validar TypeScript
```

---

## Património Líquido (calculado dos mocks atuais)

```
Total Ativos     = Contas + Inventário + Investimentos
Total Passivos   = Créditos em dívida
Património Líq.  = Total Ativos − Total Passivos
```

| Métrica | Valor |
|---------|-------|
| Contas | 12 631,30 € |
| Inventário | 3370,00 € |
| Investimentos | 9290,00 € |
| **Total Ativos** | **25 291,30 €** |
| Passivos (créditos) | 13 250,00 € |
| **Património Líquido** | **12 041,30 €** |
| Mês anterior | 14 820,00 € |
| Variação | -18.8% |
| Gastos esta semana | 342,50 € |
| Alertas ativos | 5 |
| Sugestões | 2 |

### Regras de investimentos recorrentes (correção vs. web)
- Usa `currentValue` (valor de mercado), não `appliedAmount`
- Inclui: regra ativa OU `appliedAmount > 0`
- Não projeta contribuições futuras
- Não duplica saldos de conta com investimentos

### Funções de domínio (`lib/domain/net-worth.service.ts`)


### Breakdown para donut (`assetsByCategory`)
- Contas: 12 631,30 €
- Inventário: 3370,00 €
- Investimentos: 9290,00 €

---

## Navegação — 5 abas

| Aba | Ficheiro | Estado |
|-----|----------|--------|
| Início | `app/(tabs)/index.tsx` | ✅ Dashboard Fase 1 |
| Movimentos | `app/(tabs)/movimentos.tsx` | 🔲 Empty state |
| Análises | `app/(tabs)/analises.tsx` | 🔲 Empty state (destaque visual na tab bar) |
| Ativos | `app/(tabs)/ativos.tsx` | 🔲 Sub-nav + empty states |
| Perfil | `app/(tabs)/perfil.tsx` | 🔲 Menu estático |

Ecrãs detetados: `analises`, `ativos`, `creditos`, `index`, `movimentos`, `perfil`

---

## Autenticação (Fase 2)

| Funcionalidade | Estado |
|----------------|--------|
| Login | ✅ `app/(auth)/login.tsx` |
| Registo | ✅ `app/(auth)/register.tsx` |
| Recuperar password | ✅ `app/(auth)/forgot-password.tsx` |
| Sessão persistente | ✅ expo-secure-store |
| Rotas protegidas | ✅ Stack.Protected em `app/_layout.tsx` |
| Logout | ✅ Botão no Perfil |

### Endpoints (ajustar em `lib/auth/constants.ts` se necessário)
- `login`: `/auth/login`
- `register`: `/auth/register`
- `me`: `/auth/me`
- `forgotPassword`: `/auth/forgot-password`

### Arquitetura auth
```
lib/auth/
├── auth.service.ts    # login, register, logout, restoreSession
├── auth.context.tsx   # AuthProvider + estado global
├── useAuth.ts         # hook de conveniência
├── storage.ts         # SecureStore (token)
├── schemas.ts         # validação Zod
├── errors.ts          # mensagens amigáveis
└── types.ts
```

Token enviado automaticamente via `Authorization: Bearer` em `apiFetch`.

---

## Estrutura de ficheiros

```
  (auth)/
    _layout.tsx
    forgot-password.tsx
    login.tsx
    password-reset-success.tsx
    register.tsx
  (tabs)/
    _layout.tsx
    analises.tsx
    ativos.tsx
    creditos.tsx
    index.tsx
    movimentos.tsx
    perfil.tsx
  +html.tsx
  +not-found.tsx
  _layout.tsx
  assistant.tsx
  auth/
    callback.tsx
  calendar.tsx
  index.tsx
  legal/
    _layout.tsx
    privacy.tsx
    terms.tsx
  onboarding.tsx
  open-banking/
    callback.tsx
  quick-expense.tsx
  reset-password.tsx
  settings/
    _layout.tsx
    appearance.tsx
    bank-connections.tsx
    benchmark-consent.tsx
    currency-region.tsx
    delete-account.tsx
    diagnostics.tsx
    export-data.tsx
    export-pdf.tsx
    financial-suggestions.tsx
    index.tsx
    notifications.tsx
    personal-data.tsx
    privacy.tsx
    security.tsx
    shortcuts.tsx
  accounts/
    PaymentMethodPickerField.tsx
    index.ts
  analysis/
    AnalysisDebtTab.tsx
    AnalysisExpandableSection.tsx
    AnalysisMetricCard.tsx
    AnalysisPatrimonyTab.tsx
    AnalysisSkeleton.tsx
    AnalysisSpendingTab.tsx
    AnalysisSummaryTab.tsx
    CashflowProjectionCard.tsx
    InsightsSection.tsx
    PatrimonyAllocationCard.tsx
    SpendingBenchmarkCard.tsx
    SpendingCalendarCard.tsx
    SpendingCategoryCard.tsx
    SpendingTrendBars.tsx
    TrendsSummaryCard.tsx
    index.ts
  app/
    AndroidNavigationBarEffect.tsx
    AppSecurityBootstrap.tsx
    BiometricGate.tsx
    EmailDeepLinkHandler.tsx
    QuickExpenseLinkHandler.tsx
    RemoteDataSyncEffect.tsx
    StartupErrorScreen.tsx
    StartupShell.tsx
    index.ts
  assistant/
    FinancialAssistantScreen.tsx
    index.ts
  auth/
    AppleSignInButton.tsx
    AuthLoadingScreen.tsx
    AuthScreenLayout.tsx
    AuthSocialDivider.tsx
    GoogleSignInButton.tsx
    index.ts
  budget/
    CategoryBudgetProgressRow.tsx
    EditCategoryBudgetSheet.tsx
    FinancialActionsCard.tsx
    MonthlySpendableCard.tsx
    MonthlySpendableSheet.tsx
    SavingsMarginBreakdownLines.tsx
    index.ts
  calendar/
    CalendarRiskNotificationGate.tsx
    FinancialCalendarScreen.tsx
    index.ts
  charts/
    DonutChart.tsx
    index.ts
  dashboard/
    ActionCenterSheet.tsx
    AttentionCard.tsx
    DashboardHeaderLeading.tsx
    DashboardSkeleton.tsx
    DemoModeBadge.tsx
    HomeAlertsSection.tsx
    HomeAssetsSummaryCard.tsx
    HomeAssistantCard.tsx
    HomeAttentionSheet.tsx
    HomePersonalizedInsightCard.tsx
    HomePostOnboardingWelcomeCard.tsx
    RecommendationCard.tsx
    RecommendationsCard.tsx
    RecommendationsSheet.tsx
    SuggestionCard.tsx
    index.ts
  diagnostics/
    DiagnosticsBootstrap.tsx
    DoctorOperationCard.tsx
    DoctorSections.tsx
    index.ts
  features/
    FeatureAreaGate.tsx
    index.ts
  icons/
    TabIcon.tsx
  layout/
    AppHeader.tsx
    BottomSheetScrollContext.tsx
    CentFlowTabBar.tsx
    DraggableBottomSheet.tsx
    ProfileMenuSheet.tsx
    QuickAddMenuSheet.tsx
    SegmentedControl.tsx
    TabBarAnalisesIcon.tsx
    UserAvatarButton.tsx
    index.ts
  legal/
    LegalDocumentScreen.tsx
    LegalLinksFooter.tsx
  movements/
    AddTransactionModal.tsx
    CategoryField.tsx
    ConfirmReceiptModal.tsx
    EditCategorySheet.tsx
    EditTransactionModal.tsx
    MovementFilterChips.tsx
    MovementMonthSummaryCard.tsx
    MovementSearchBar.tsx
    PendingSubscriptionModal.tsx
    QuickExpenseSheet.tsx
    ReceiptAttachmentField.tsx
    ReceiptDataForm.tsx
    ReceiptDigitizePreview.tsx
    ReceiptImageViewer.tsx
    ReceiptItemsEditor.tsx
    ReceiptItemsSummary.tsx
    ReceiptOcrProcessingOverlay.tsx
    ReceiptPreview.tsx
    RefundTransactionModal.tsx
    SwipeableTransactionListItem.tsx
    TransactionContextMenuSheet.tsx
    TransactionForm.tsx
    TransactionsSkeleton.tsx
    index.ts
    movements.config.ts
    ocr/
      OcrFailureCard.tsx
      OcrFieldBadge.tsx
      OcrFieldsChecklist.tsx
      index.ts
  onboarding/
    BackTapGuide.tsx
    BackTapGuideGate.tsx
    OnboardingGateEffect.tsx
    OnboardingIllustration.tsx
    OnboardingProgressBar.tsx
    OnboardingShell.tsx
    index.ts
    premium/
      BigAmountInput.tsx
      BuildSequence.tsx
      PlanResult.tsx
      WheelPicker.tsx
      index.ts
      primitives.tsx
  open-banking/
    OpenBankingSyncNotificationGate.tsx
    index.ts
  privacy/
    PrivacyConsentGate.tsx
    PrivacyConsentModal.tsx
  profile/
    FinancialProfileDetailSheet.tsx
    FinancialProfileDimensionRow.tsx
    FinancialProfileProgress.tsx
    ProfileHubSections.tsx
    financial-profile.config.ts
    index.ts
  security/
    PasswordStrengthMeter.tsx
  settings/
    SettingsScreenLayout.tsx
    SettingsThresholdSlider.tsx
    SettingsToggleRow.tsx
    index.ts
  simulator/
    DecisionImpactModal.tsx
    DecisionSimulatorHost.tsx
    DecisionSimulatorModal.tsx
    index.ts
  ui/
    BottomActionSheet.tsx
    Button.tsx
    Card.tsx
    CentFlowCalendar.tsx
    DatePickerField.tsx
    EmptyState.tsx
    ErrorState.tsx
    FormSheetFooter.tsx
    LoadingSpinner.tsx
    RefetchingIndicator.tsx
    ScreenContainer.tsx
    SearchableSelect.tsx
    SectionHeader.tsx
    Skeleton.tsx
    Text.tsx
    TextField.tsx
    Toast.tsx
    index.ts
    skeletons/
      AssetsSkeleton.tsx
      ProfileSkeleton.tsx
  version/
    ForceUpdateScreen.tsx
  mutations/
    useProfileMutations.ts
  queries/
    useAccounts.ts
    useActiveSessions.ts
    useAnalysisData.ts
    useAssets.ts
    useBankConnections.ts
    useCategoryBudgets.ts
    useDashboard.ts
    useDashboardData.ts
    useEmailEvents.ts
    useFinancialProfile.ts
    useGoalContributions.ts
    useHomeScreenData.ts
    useLiabilities.ts
    useLoanPayments.ts
    useMarkSubscriptionPaid.ts
    useMarkSubscriptionReviewed.ts
    useOnboardingAnswers.ts
    usePatrimonyAllocation.ts
    useProfile.ts
    useTransactions.ts
    useUserPreferences.ts
  useCashflowProjection.ts
  useCentFlowIntelligence.ts
  useContextualQuickAdd.ts
  useCustomCategories.ts
  useDiagnosticScreen.ts
  useFeatureAreas.ts
  useFinancialActions.ts
  useFinancialAssistantChat.ts
  useFinancialCalendar.ts
  useFinancialEngineSnapshot.ts
  useFinancialRecommendations.ts
  useFinancialState.ts
  useFinancialState.types.ts
  useFormDismiss.ts
  useImportCsv.ts
  useKeyboardVisible.ts
  useMonthlySpendable.ts
  useMovementRenderProbe.ts
  useOnboarding.ts
  useProcessReceipt.ts
  usePullToRefresh.ts
  useQuickAddActions.ts
  useReceiptImage.ts
  useResponsiveLayout.ts
  useSavingsAllocationAction.ts
  useSubscriptionDetection.ts
  useTabBarBottomInset.ts
  useTabBarMetrics.ts
  account/
    delete-account.constants.ts
    delete-account.service.ts
    delete-account.test.ts
  accounts/
    balance.test.ts
    balance.ts
  analytics/
    analytics.service.ts
    events.ts
    index.ts
    useAnalytics.ts
  api/
    client.ts
    endpoints.ts
    errors.ts
    fetch-optional.ts
    index.ts
    invalidate-queries.ts
    keys.ts
    mappers/
      analysis.mapper.ts
      dashboard.mapper.ts
      receipt.mapper.ts
      transaction.mapper.ts
    mock-assets.ts
    mock-home.ts
    mock-receipt-items.ts
    mock-transactions.ts
    queryClient.ts
    services/
      accounts.service.ts
      analysis.service.ts
      assets.service.ts
      csv-import.service.ts
      dashboard.service.ts
      financial-profile.service.ts
      home.service.ts
      liabilities-fetch.ts
      profile.service.ts
      receipt-items.service.ts
      receipt.service.ts
      transaction.service.ts
    token.ts
    transaction-cache.test.ts
    transaction-cache.ts
    transaction-invalidation.ts
    upload.ts
  app/
    intro-session.ts
  auth/
    apple-sign-in.platform.ts
    apple-sign-in.test.ts
    apple-sign-in.ts
    auth.context.tsx
    auth.service.ts
    constants.ts
    errors.ts
    google-oauth.config.ts
    google-oauth.ts
    index.ts
    mock-auth.ts
    oauth-callback.ts
    schemas.ts
    storage.ts
    supabase-oauth.config.ts
    types.ts
    useAuth.ts
  benchmarks/
    benchmarks.test.ts
    compare-spending-benchmark.ts
    config.ts
    income-buckets.ts
    resolve-user-income-bucket.ts
    spending-benchmarks.service.ts
    types.ts
    useSpendingBenchmarkComparisons.ts
  budget/
    calculateMonthlySpendable.test.ts
    calculateMonthlySpendable.ts
    monthly-spendable-month-boundary.test.ts
  categories/
    emoji-map.test.ts
    emoji-map.ts
  category-budgets/
    category-budgets.service.ts
  config/
    app-variant.ts
    data-mode.ts
    demo-mode.ts
    product-features.ts
    runtime-env.ts
  credit/
    credit-analysis.test.ts
    credit-analysis.ts
    credit-dates.ts
    credit-ledger-sync.ts
    credit-reminder-storage.ts
    credit-type.utils.test.ts
    credit-type.utils.ts
  csv/
    csv-import.types.ts
    parse-transactions-csv.ts
    read-csv-file.ts
  data/
    analysis.mocks.ts
    category-budgets-storage.ts
    custom-categories-storage.ts
    mocks.ts
    prices.mocks.ts
    transaction-categories.ts
  diagnostics/
    app-log.ts
    config.ts
    doctor-export.ts
    doctor-grouping.test.ts
    doctor-grouping.ts
    doctor-humanize.test.ts
    doctor-humanize.ts
    doctor-metrics.ts
    doctor-types.ts
    index.ts
    runtime-context.ts
  doctor/
    financial-mutation-trace.ts
    goal-contribution-trace.ts
    index.ts
    loan-payment-trace.ts
    log-mutation.ts
    movement-flow-trace.ts
    quick-expense-link-trace.ts
    quick-expense-trace.ts
    recurring-payment-trace.ts
    simulation-trace.ts
    transfer-flow-trace.ts
  domain/
    __tests__/
      analysis-period.test.ts
    account.types.ts
    analysis-period.ts
    analysis.compose.ts
    analysis.insights.ts
    analysis.types.ts
    assets.schema.ts
    assets.types.ts
    attention-items.test.ts
    attention-items.ts
    budget-month.ts
    category-budget.types.ts
    dashboard.compose.ts
    date-input.schema.ts
    financial/
      account-mutations.integration.test.ts
      accounts.test.ts
      accounts.ts
      action-engine.test.ts
      action-engine.ts
      analytics.ts
      assets.ts
      assistant-chat.client.ts
      assistant-chat.test.ts
      assistant-chat.ts
      assistant.ts
      budget-accounts.test.ts
      budget-accounts.ts
      budget.ts
      calendar.test.ts
      calendar.ts
      cashflow-projection.test.ts
      cashflow-projection.ts
      cashflow.ts
      category-budgets.test.ts
      category-budgets.ts
      category-spend-anomaly.test.ts
      category-spend-anomaly.ts
      centflow-score.ts
      credit-cards.test.ts
      credit-cards.ts
      creditCards.ts
      credits.ts
      dates.test.ts
      dates.ts
      debt-amortization-action.test.ts
      debt-amortization-action.ts
      debt-priority.test.ts
      debt-priority.ts
      decision-simulator.test.ts
      decision-simulator.ts
      domain-types.ts
      engine-mutation-flows.test.ts
      engine-parity.test.ts
      engine-performance.test.ts
      engine.contract.ts
      engine.core.ts
      engine.gather.ts
      engine.integration.test.ts
      engine.invalidation.ts
      engine.runner.ts
      engine.selectors.test.ts
      engine.selectors.ts
      engine.steps.ts
      engine.ts
      engine.types.ts
      events.ts
      explain.ts
      financial-doctor.ts
      financial-state.test.ts
      financial-state.ts
      financial-state.types.ts
      forecast.ts
      goals-contribution-validation.test.ts
      goals.test.ts
      goals.ts
      habits.test.ts
      habits.ts
      index.ts
      insights.ts
      investments.ts
      ledger-audit.test.ts
      ledger-impact.test.ts
      ledger-impact.ts
      liabilities.ts
      loan-payments.test.ts
      loan-payments.ts
      metrics.ts
      money.test.ts
      money.ts
      monthly-available.compose.test.ts
      monthly-available.compose.ts
      monthly-available.test.ts
      monthly-available.ts
      netWorth.test.ts
      netWorth.ts
      opportunities.ts
      projections.ts
      recommendations.test.ts
      recommendations.ts
      savings-allocation.test.ts
      savings-allocation.ts
      savings-margin.test.ts
      savings-margin.ts
      savings.test.ts
      savings.ts
      score-explain.ts
      score.test.ts
      score.ts
      simulator.test.ts
      simulator.ts
      simulator.types.ts
      spending-calendar.ts
      stabilization-matrix.test.ts
      subscription-payments.test.ts
      subscription-payments.ts
      subscription-review.ts
      subscriptions.ts
      suggestions.test.ts
      suggestions.ts
      test-financial-state.fixture.ts
      transaction-kind.ts
      transactions.test.ts
      transactions.ts
      transfers.test.ts
      transfers.ts
      types.ts
    financial-movement.ts
    financial-profile.service.ts
    financial-profile.types.ts
    goal-contribution.types.ts
    goal-form.utils.ts
    goal.utils.ts
    home-motivation.ts
    home.types.ts
    index.ts
    monthly-budget-movements.test.ts
    monthly-budget-movements.ts
    net-worth-monthly.ts
    net-worth-projection.test.ts
    net-worth.service.test.ts
    net-worth.service.ts
    payment-method.ts
    receipt-confirmation.schema.ts
    receipt-confirmation.ts
    receipt-items.schema.ts
    receipt.types.ts
    transaction-date.utils.ts
    transaction-display.test.ts
    transaction-display.ts
    transaction-form.ts
    transaction-grouping.ts
    transaction-search.test.ts
    transaction-search.ts
    transaction.schema.ts
    transaction.types.ts
    types.ts
    warranty.constants.ts
    warranty.utils.ts
  email/
    addresses.ts
    deep-links.ts
    dev-tools.ts
    events.service.ts
    index.ts
    provider-status.ts
    trigger.ts
    types.ts
  export/
    export.service.ts
    pdf-sections.ts
  forms/
    discard-changes.ts
    form-dirty.ts
    index.ts
  haptics/
    light-impact.ts
  home/
    smart-summary.ts
  launch-readiness.test.ts
  layout/
    device-metrics.ts
    responsive-layout.test.ts
    safe-area.test.ts
    safe-area.ts
    tab-bar-metrics.test.ts
    tab-bar-metrics.ts
  legal/
    constants.ts
    privacy-policy.content.ts
    terms.content.ts
    types.ts
  liabilities/
    liabilities.service.ts
  lists/
    flatten-transaction-sections.test.ts
    flatten-transaction-sections.ts
  merchant/
    fuzzy-match.test.ts
    fuzzy-match.ts
  migrations/
    index.ts
    migrationRunner.ts
    onboardingMigrations.ts
    profileMigrations.ts
    settingsMigrations.ts
  navigation/
    dashboard-routes.ts
    href.ts
    quick-add-context.ts
  notifications/
    __tests__/
      open-banking-sync-alert.test.ts
    calendar-risk-alert.service.ts
    calendar-risk-notification.storage.ts
    category-spend-alert.service.ts
    local-notifications.ts
    open-banking-sync-alert.service.ts
    open-banking-sync-messages.ts
  onboarding/
    answers.service.ts
    assistance.test.ts
    assistance.ts
    back-tap-guide.ts
    constants.ts
    copy.ts
    features.ts
    first-action.ts
    gate.ts
    onboarding-personalization.test.ts
    onboarding-premium.test.ts
    personalization.ts
    plan.test.ts
    plan.ts
    post-welcome-storage.ts
    premium-constants.ts
    quick-actions.ts
    storage.ts
    suggestions-bridge.ts
    types.ts
    welcome-priority.ts
    welcome.ts
  open-banking/
    gocardless.service.ts
    index.ts
    types.ts
  preferences/
    PreferencesProvider.tsx
    config.ts
    index.ts
    locale.data.ts
    preferences.service.ts
    storage.ts
    types.ts
  privacy/
    consent.memory.ts
    consent.storage.ts
    consent.test.ts
    consent.types.ts
  projections.ts
  quick-expense/
    __tests__/
      handle-quick-expense-link.test.ts
    handle-quick-expense-link.ts
  receipt/
    client-ocr.ts
    ocr-confidence.ts
    ocr-failure.test.ts
    ocr-messages.ts
    ocr-sanitize.ts
    open-receipt.ts
    parse-receipt-pt.ts
    receipt-exif.ts
    receipt-image-enhance.ts
    receipt-image-preprocess.ts
    receipt-upload.ts
    resolve-receipt-ocr.ts
  security/
    appIntegrity.ts
    biometricLock.ts
    index.ts
    open-banking-store.ts
    openBankingPrep.ts
    passwordPolicy.test.ts
    passwordPolicy.ts
    secureStorage.ts
    securityLogger.ts
    sessionSecurity.ts
    versionGuard.ts
  sentry/
    bootstrap.ts
    capture.ts
    index.ts
    init.ts
    privacy.ts
    runtime.ts
    sentry.test.ts
    tags.ts
  simulator/
    simulator-bridge.ts
  storage/
    ignored-habits.storage.ts
    liabilities-storage.ts
    local-flags.ts
    pending-subscriptions.storage.ts
    recommendation-fired.storage.ts
    secure-store-key.ts
  subscriptions/
    cancel-url-map.ts
    detect-recurring-income.ts
    detect-subscriptions.test.ts
    detect-subscriptions.ts
    renewal.constants.ts
    renewal.utils.test.ts
    renewal.utils.ts
    subscription-utils.ts
  supabase/
    accounts.ts
    app-config.ts
    assets.ts
    auth.ts
    category-budgets.ts
    client.ts
    config.ts
    database.types.ts
    financial-assistant.ts
    goal-contributions.ts
    index.ts
    liabilities.ts
    loan-payments.ts
    mappers.ts
    realtime-sync.ts
    receipt-item-mappers.ts
    receipt-items.ts
    receipts.ts
    transactions.ts
  theme/
    ThemeProvider.tsx
    colors.ts
    index.ts
    layout.ts
    spacing.ts
    theme-store.ts
    themes.ts
    types.ts
    typography.ts
    useThemedStyles.ts
  transactions/
    __tests__/
      filter.test.ts
  types/
    analysis.api.ts
    dashboard.api.ts
    index.ts
    receipt.api.ts
    transaction.api.ts
  ui/
    haptics.ts
  updates/
    applyUpdateSafely.ts
    checkForUpdates.ts
    index.ts
    updateStatus.ts
  utils/
    calendar.test.ts
    calendar.ts
    format.test.ts
    format.ts
    pluralize.test.ts
    pluralize.ts
  widgets/
    widget-data.ts
  generate-handoff.ts
  handoff-metrics.ts
  handoff.config.json
  test-ocr-sanitize.ts
```

---

## Fase atual: RC2 Device QA — build Android 607cc31c errored; smoke bloqueado até novo APK

### ✅ Concluído
- Base Expo SDK 56 + Expo Router + TypeScript
- Design system dark premium (Card, Button, EmptyState, TextField, etc.)
- Navegação com 5 abas (Análises com destaque visual)
- TanStack Query configurado
- Domínio de Património Líquido (lib/domain/net-worth.service.ts)
- Dashboard Início reconstruído com 5 secções
- Mocks enriquecidos + buildMockDashboard()
- Componentes dashboard (NetWorthHeroCard, MetricCard, etc.)
- Autenticação completa (login, registo, logout)
- Sessão persistente com expo-secure-store
- Rotas protegidas com Stack.Protected
- AuthContext + auth.service + validação Zod
- Integração token Bearer no apiFetch
- Dashboard ligado à API real (useDashboardData + mappers)
- Hooks useDashboardData e useNetWorth com enabled: isAuthenticated
- Fallback composto quando GET /dashboard retorna 404
- Aba Análises com DonutChart de alocação de património
- CentFlow Brain — secção de insights
- Hooks useAnalysisData + usePatrimonyAllocation
- Análises ligadas à API real (GET /analytics + fallback composto)
- Mappers analysis.mapper.ts + tipos analysis.api.ts
- Estados loading/erro com getApiErrorMessage + retry
- Aba Movimentos — listar + criar transações (GET/POST /transactions)
- Modal AddTransactionModal + TransactionListItem + filtros Todos/Despesas/Receitas
- Mock de movimentos em dev (mock-transactions.ts) quando EXPO_PUBLIC_MOCK_AUTH activo
- Anexar foto de talão no AddTransactionModal (expo-image-picker)
- Preview + remover talão + upload multipart preparado (POST /receipts)
- Tipos ReceiptDraft/ReceiptUpload + processReceiptOcr() stub para OCR futuro
- Upload real POST /receipts (multipart + expo-file-system)
- OCR integrado (POST /receipts/:id/ocr + GET ocr-result)
- Fluxo Opção A com fases de loading (upload → OCR → guardar)
- ReceiptUploadError — falha de upload bloqueia; falha OCR não bloqueia
- ConfirmReceiptModal — rever/editar dados OCR antes de guardar
- OcrResultCard + ReceiptDataForm com badge OCR em campos não editados
- processReceiptFlow() + PATCH /receipts/:id/confirm
- Pré-processamento de imagem para OCR (expo-image-manipulator — resize ~1800px, JPEG 92%)
- Heurísticas PT pós-OCR (ocr-sanitize.ts — TOTAL, datas, filtro itens/moradas)
- Hints OCR no upload (locale pt-PT, psm 6, preprocess_version) + polling ocr-result
- UI isPreprocessing no ReceiptAttachmentField + doc OCR_PIPELINE.md (recomendações backend)
- OCR v3 — resize 1200px, contraste jpeg-js, rotação EXIF, compressão inteligente
- OCR multi-motor (google_vision → vision → auto → tesseract) + polling 8×
- docs/backend/ocr_preprocess.py — deskew/binarização/Tesseract para equipa server
- EAS Build + EAS Update configurado (eas.json, expo-updates, docs/build.md)
- Emails lifecycle — Resend, Edge Functions, preferências, anti-spam, deep links
- Emails — welcome no registo, tips_insight, resumo semanal agregado, Doctor com histórico
- Resend configurado — npm run email:setup, secrets Supabase, deploy send-email + email-jobs
- Google OAuth — callback PKCE/hash, docs google-oauth-setup.md
- Dashboard — alertas atenção + sugestões com navegação contextual
- Movimentos — swipe editar/eliminar + acções web
- BUG 5 — Definições sem secções do Perfil duplicadas
- BUG 6 — Início com HomeAssetsSummaryCard (resumo de ativos)
- BUG 2 — amortização antecipada actualiza saldo real do crédito
- BUG 1 — OCR de PDFs via Google Vision files:annotate (process-receipt deployed)
- UX 1 — tab Créditos com barra de progresso + Registar pagamento
- UX 2 — simulador de crédito com campos avançados colapsáveis
- UX 3 — fluxo de ficheiro do Novo movimento sem modais sobrepostos
- UX 4 — Movimentos agrupados por dia (SectionList) + resumo do mês
- UX 5 — Análises com selector de período, gráfico de barras e donut interactivo
- Segurança — redacção de tokens/chaves/credenciais nos logs do Doctor (dev/beta)
- BUG 2 — fim dos falsos STALL após guardar movimento (stall watch limpo em cache_invalidate_done)
- BUG 5 — sugestão 'Ver análises' (savings) navega para Análises (não Objetivos)
- BUG 4 — Definições dedicadas (/settings) sem dados de perfil duplicados
- BUG 3 — Início deixa de sugerir onboarding quando já há movimentos
- BUG 1 — erro real da Edge Function OCR exposto no Doctor (root cause: falta GOOGLE_VISION_API_KEY)
- BUG 6 — amortização com taxa de comissão dinâmica + poupança estimada (coluna commission_rate_early_repayment)
- Orçamento mensal — calculateMonthlySpendable() puro + 8 testes deterministas (lib/budget)
- Disponível este mês — MonthlySpendableCard na Home + MonthlySpendableSheet (receitas/despesas previstas, projeção, warnings)
- Quick Add — QuickExpenseSheet independente (valor grande, 8 categorias em grid, nota, animação Reanimated, telemetria Doctor)
- Deep link centflow://quick-expense (rota app/quick-expense) + acesso na Home e menu Movimentos
- Definições → Atalhos rápidos — instruções Back Tap (iOS Shortcuts) + copiar/partilhar URL
- Home — removido Património (NetWorthHeroCard fica só para Análises) e botão Gasto rápido
- Movimentos — botão + abre Novo movimento diretamente (sem menu Despesa rápida); Gasto rápido só por deep link
- Precisa de atenção — objetivos excluídos (têm destaque próprio na Home)
- Pluralização correta de subscrições (corrigido 'subscriçãões') + util lib/utils/pluralize
- BUG créditos — novo crédito deixava de aparecer: insert Supabase enviava coluna inexistente (commission_rate_early_repayment); agora só é enviada quando preenchida + log de diagnóstico no fallback
- Créditos — abas Créditos / Cartões de Crédito (tipo 'card' no modelo + formulário)
- Onboarding premium redesenhado de raiz — 17 passos modulares (welcome, curiosidade, problema, objetivo, histórico, objetivo de poupança, prazo, rendimento, plano, IA, OCR, créditos, investimentos, segurança, construção, resultado, primeiro arranque)
- Motor do plano puro lib/onboarding/plan.ts (objetivo + prazo + rendimento → poupança/mês, livre/mês, viabilidade) + 7 testes
- WheelPicker custom estilo iOS (Reanimated, OTA-safe) + BigAmountInput (número gigante)
- PlanResult com donut SVG animado; BuildSequence com inicialização real (persiste respostas, sem loading falso)
- OnboardingAnswers estendido (spendAwareness, financialHistory, savingsGoal, savingsMonths, monthlyIncome, creditTypes, investmentTypes) — retrocompatível
- Wrapper de háptica OTA-safe (no-op) pronto para expo-haptics no IPA nativo
- Guia Back Tap — bottom sheet full-screen 1x após onboarding (passos iOS Shortcuts + Acessibilidade), copiar URL centflow://quick-expense, 'testar agora' → Quick Expense; flag persistida (BackTapGuideGate + lib/onboarding/back-tap-guide.ts)
- Home — removidos os 3 botões de ação (Novo movimento/ativo/objetivo); ações ficam nos respetivos ecrãs
- Movimentos — filtros redesenhados num único chip bar horizontal [Todos][Despesas][Receitas][Subscrições] com transição fade (MovementFilterChips), agrupamento por dia mantido
- OCR — PDFs mostram mensagem neutra (não erro) e permitem preenchimento manual; OcrFailureCard com variante 'info'; logs raw da Vision API e do OCR on-device (dev)
- OCR — toggle Despesa/Receita no ecrã de confirmação; reembolso guardado como income com categoria 'Reembolso'
- Movimentos — botão 'Ver fatura' no detalhe abre o ficheiro (URL assinada/remota ou partilha local) via lib/receipt/open-receipt.ts
- Categorias — seletor em bottom sheet com pesquisa em tempo real (categoria + grupo), lista expandida agrupada e categorias personalizadas persistidas (CategoryField + useCustomCategories)
- Créditos — data de próximo pagamento assume dia 1 do mês seguinte quando vazia (com hint); alerta de débito automático na data prevista (confirmar/valor diferente/adiar 3 dias) via CreditPaymentReminderGate
- Cartões de crédito — formulário específico (nome, banco, limite, saldo, fecho do extrato, vencimento, TAN mensal, notas) sem campos de empréstimo; card na lista com barra de utilização saldo/limite
- Perfil reorganizado — Conta → Perfil financeiro → Preferências → A tua CentFlow, com botão Sair vermelho (confirmação); menu 'E' simplificado
- Quick Expense via URL scheme com parâmetros — centflow://quick-expense?amount=25&category=food&note=Almoço guarda a despesa automaticamente sem mostrar formulário (toast '−25,00 € guardado')
- Parser puro lib/quick-expense/handle-quick-expense-link.ts (parseQuickExpenseUrl, parseQuickExpenseParams, normalizeCategoryKey, mapCategoryKey) + 15 testes; aceita keys EN (food) e nomes PT (Alimentação), case-insensitive/sem acentos
- QuickExpenseLinkHandler (montado no _layout) ouve getInitialURL + evento 'url'; cold start sem login guarda os parâmetros em memória e grava após autenticar; dedupe de URL
- Rota /quick-expense ignora o formulário quando há amount (regressa logo); sem parâmetros mantém o Gasto rápido (formulário)
- Doctor — eventos quick_expense_link (link_received, parse_success, parse_failed, save_start, save_success, save_error)
- Guia Back Tap atualizado para o fluxo com Pedir entrada (valor) + Escolher entre lista (categoria) + nota → Abrir URL com parâmetros; tabela de mapeamento PT→key; botão de teste guarda 1 € e mostra 'Está a funcionar!'
- HOTFIX loop infinito FaceID — BiometricGate com aprovação por sessão (singleton), guarda isPrompting (ref) e cooldown que ignora as transições inactive→active provocadas pelo próprio diálogo de FaceID; sem auto-repetição após falha
- FaceID — escape de emergência sempre visível (entrar com email e password → desativa biometria + signOut); após 3 falhas passa a ação primária; 'Terminar sessão' sempre disponível
- Definições → Segurança — desativar biometria exige confirmação por password (Alert.prompt iOS, valida via authService.login), nunca por FaceID
- HOTFIX loop de FaceID bem-sucedido — distinção determinística entre 'inactive' (provocado pelo diálogo de FaceID) e 'background' real: só repede biometria após background genuíno (hasBackgroundedRef), eliminando o ciclo de autenticações com sucesso; removido o cooldown frágil baseado em tempo
- Pré-beta — pesquisa de movimentos (MovementSearchBar + filterTransactionsBySearch) com chips Todos/Despesas/Receitas/Despesas recorrentes
- Pré-beta — período 6 meses nas Análises (halfyear) com trends/métricas/insights dinâmicos via applyAnalysisPeriod
- Pré-beta — secção Contas em Ativos (CRUD Supabase, saldos, total consolidado)
- Pré-beta — bug dia 1: Disponível este mês considera só movimentos do mês civil actual (sem arrasto de défices)
- Pré-beta — categorias de receita separadas (fontes de rendimento) vs despesas; labels PT sempre visíveis
- Pré-beta — microcopy Subscrições → Despesas recorrentes em toda a UI visível
- Pré-beta — Home com frases financeiras contextuais (getHomeMotivationPhrase) em vez da data
- Movimentos — seletor de conta opcional (AccountPickerField) com account_id no Supabase
- Migrations Supabase sincronizadas — merchant_groups, merchant e delete_own_account restauradas; db push OK
- Auditoria beta — CTAs Home/Sugestões navegam para destinos correctos (talão→movimentos, não Análises)
- Auditoria beta — insights Análises acionáveis (taxa poupança, recorrentes, categorias) + CTAs ligados
- Auditoria beta — mentor Home data-driven (orçamento diário, património, recorrentes)
- Auditoria beta — métricas Análises corrigidas (fluxo líquido em €, rácio de gasto)
- Contas ledger — fix institution/bank schema, goal_contributions, transferências, saldos por conta
- Objetivos — crash modal contribuição (sequência onDismissed), transferência conta→objetivo, UX modal separado
- Receitas — mês financeiro (budget_month) no orçamento/disponível mensal + campo no formulário
- UX movimentos — remover mês financeiro confuso, corrigir guardar com conta, layout contas
- Domínio financeiro central lib/domain/financial/ — money, dates, transactions, accounts, goals, netWorth, savings, score, insights
- Substituição de cálculos duplicados em analysis.compose, analysis.insights, dashboard.compose
- Re-exports de compatibilidade (balance, financial-movement, goal.utils, net-worth.service, transaction-date.utils, monthly-budget-movements)
- Testes unitários do domínio financeiro (money, dates, transactions, accounts, goals, netWorth, savings, score)
- docs/financial-domain.md — regras, API e como adicionar métricas
- Doctor 2.0 — resumo de saúde, agrupamento de operações, timeline, erros humanos, performance, BD, pesquisa/filtros, export JSON/TXT
- Transferências entre contas — validação origem≠destino, preview de impacto, saldo insuficiente bloqueado, exclusão de receitas/despesas/análises, Doctor account_transfer, testes domínio
- Pre-release ledger — migration remota aplicada, cleanup transferências órfãs, CHECK amount>0 e origem≠destino, doc RPC pendente, teste delete reverte saldo
- Cartões de crédito no ledger — compra (expense+credit_id), pagamento (credit_payment), PaymentMethodPicker, PayCreditCardModal, domínio credit-cards, sem dupla contagem
- Tipos canónicos credit_card_purchase/payment/refund + domínio ledger-impact (orçamento, conta, cartão, reembolsos)
- Reembolsos no cartão — RefundTransactionModal, reduz dívida e despesa líquida sem contar como receita
- Análises compactas — 4 tabs (Resumo/Gastos/Dívida/Património) + calendário heatmap de gastos
- Formulário movimentos — selector Despesa/Receita/Transferência/Pagamento/Reembolso com microcopy
- Orçamento mensal transparente — calculateMonthlyAvailableBreakdown() + fórmula no modal (Home e sheet partilham hook)
- Objetivos reservados — contribuição reduz disponível sem despesa; retirada (GoalWithdrawModal) sem receita
- Créditos empréstimo — mensalidade vs amortização (loan_payments, RegisterLoan* modals, domínio loan-payments)
- Cartões — saldo disponível (limite − dívida) + alerta limite excedido na lista Créditos
- Despesas recorrentes — Marcar como pago com recurring_id, movimento real e dedup no orçamento
- Home — card Disponível este mês sem clipping; Créditos — botões empilhados sem texto cortado
- Migrations remotas aplicadas — credit_card types, goal_withdrawals/loan_payments, recurring_id
- Orçamento mensal — compras no cartão excluídas do disponível; pagamentos de cartão e despesas em conta reduzem; consumptionSpending separado para análises
- Orçamento vs património — budget_enabled em contas; investimentos/poupança fora do disponível mensal; transferências orçamento↔investimento
- Auditoria beta — motor sugestões financeiras lib/domain/financial/suggestions.ts (TAEG vs investimento, cenários 10/20/30%, disclaimer)
- Auditoria beta — testes ledger-audit + suggestions; consumptionSpending filtrado por contas orçamento
- Auditoria beta — README raiz, docs financial-domain/architecture; .easignore dist/logs; UX actual→atual (strings visíveis)
- UX premium — datas DD/MM consistentes, FormSheetFooter, layout/formSpacing tokens, cards movimentos 3 linhas
- Financial Core v2 — calculateFinancialState(), módulos puros, eventos, calendário, métricas, oportunidades, doctor, useFinancialState
- Decision Simulator — simulateFinancialDecision(), 10 cenários, UI Análises, CTAs Simular impacto, Doctor trace
- Performance listas — FlashList em Movimentos e Inventário; teste flatten 500 movimentos; Análises já lazy por tab
- Motor poupança Fase A (1–3) — category_budgets, sugestão média 3 meses, hooks TanStack Query, seed automático, validateGoalContribution
- Motor poupança Fase A (4) — UI alertas orçamento 80/100% na Home e Análises Gastos + sheet editar limite
- Motor poupança Fase A (5) — CTA alocar ao objetivo (margem disponível, transferência real goal_contributions, Home + Análises Resumo)
- Motor poupança Fase A (6) — subscrições revista/cancel URL, action-engine (FinancialActionsCard Home + Análises, SubscriptionsSection)
- Motor poupança Fase B — margem real (mediana variável + projeção + tecto 90%), amortização dívida prioritária, toggle Definições
- Contas ocultas na UI — ACCOUNTS_FEATURE_ENABLED=false, saldo global (sumGlobalCashBalance), formulários sem picker de conta, tab Contas removida de Ativos
- Skins de tema — 4 paletas (Classic, Midnight Indigo, Warm Graphite, Deep Emerald), tokens em lib/theme, ThemeProvider + useTheme/useThemedStyles, persistência Supabase (theme_id) + SecureStore, seletor visual em Definições → Aparência
- Projeção cashflow 30/60/90d — buildCashflowProjection (mediana variável + recorrências + dívida), gráfico na tab Resumo das Análises, recálculo via TanStack Query
- Open Banking GoCardless — Edge Function gocardless (OAuth/consent + sync), fuzzy merchant matching, source open_banking, ecrã Definições → Ligações bancárias
- Alertas gasto acima da mediana — calculateCategorySpendMedian (motor poupança), notificação local expo-notifications, toggle + slider limiar em Definições, hook pós-criação e sync Open Banking
- UX Movimentos — sticky headers por dia, chips com ícones/contagens, menu long-press (duplicar/categoria/recorrente), card resumo mensal vs mês anterior, cor de categoria nos ícones
- Sentry — @sentry/react-native, Sentry.wrap no root, bridge logAppError, redacção financeira, tags financial_domain
- Pipeline auto-fix — .github/workflows/auto-fix-errors.yml (Claude Code → PR, rate limit 5/dia, sem merge)
- Docs sentry-auto-fix-pipeline.md — setup Sentry↔GitHub, labels, salvaguardas
- Motor Financeiro — lib/domain/financial/engine.ts (recalculateFinancialState, 9 passos isolados, falha não bloqueia)
- Motor Financeiro — scheduleFinancialRecalculation em background (mutations transações, objetivos, créditos, subscrições, orçamentos categoria)
- Motor Financeiro — testes integração (ordem, falha isolada, resultados derivados) + README mapa de dependências
- Recomendações determinísticas — generateRecommendations com 4 regras auditáveis (dívida vs investimento, excedente, categoria, emergência)
- Recomendações — passo recommendations no motor financeiro + toggles em Definições + card na Home (máx. 3, ver todas)
- Simulador de decisões — simulateDecision() com projeção cashflow 30d, margem real (não saldo bruto), impacto em objetivos
- Simulador de decisões — DecisionImpactModal (Antes vs Depois) em Novo movimento e contribuição a objetivos; só persiste ao confirmar
- Calendário de caixa — buildFinancialCalendar cruza vencimentos, recorrências e rendimento com saldo projetado (cashflow)
- Calendário de caixa — ecrã /calendar com grelha mensal (neutro/atenção/risco), detalhe por dia e notificação única a 7 dias
- Assistente conversacional — Edge Function financial-assistant (classificação + formatação Anthropic, números do motor)
- Assistente conversacional — executeAssistantQuery + simulateDecision no client, histórico Supabase, ecrã /assistant
- Open Banking automático — cron GitHub Actions 6h, sync_all com throttle GoCardless, dedupe external_id, motor financeiro pós-import
- Open Banking automático — push resumo importações + baixa confiança, aviso consentimento 7 dias, dashboard sync por conta
- Padrões de gasto habituais — detectSpendingHabits (dia da semana + merchant), insight neutro nas recomendações (prioridade baixa), ignorar falso positivo
- Benchmarks agregados — tabela spending_benchmarks, Edge Function + cron semanal, opt-in explícito, UI Análises inactiva até escala
- Financial Engine Unification — runCoreFinancialState como única fonte; v2 passos derivam coreState; paridade + mutation tests; 421/421 npm test
- Financial Engine Unification — docs/financial-engine-audit.md, docs/financial-engine-unification.md, FINANCIAL_ENGINE_UNIFICATION_REPORT.md
- Financial Engine Unification — fix movimentos futuros em saldos de conta; objetivos PL só com contribuições; home/dashboard passam accounts
- Financial Engine Unification — fix 5 testes Node (safe-area, financial-movement); fix useLoanPayments import engine.runner
- Compliance RC — Política de Privacidade in-app (/legal/privacy) + docs/legal/privacy-policy.md v1.0.0
- Compliance RC — Termos de Utilização in-app (/legal/terms) + docs/legal/terms.md v1.0.0
- Compliance RC — Eliminar conta (UI settings/delete-account + RPC delete_own_account + limpeza SecureStore/cache)
- Compliance RC — Sign in with Apple (iOS, expo-apple-authentication + Supabase signInWithIdToken)
- Compliance RC — Consentimento analytics/crash (PrivacyConsentGate + toggles em Privacidade)
- Compliance RC — Links legais (login, registo, definições) + metadata loja docs/store/
- Compliance RC — RECORD_AUDIO removido de app.json Android permissions
- RC1 Device Validation — docs/device-test-matrix.md (matriz 8 dispositivos)
- RC1 Device Validation — docs/smoke-test-checklist.md (50+ smoke tests P0/P1/P2)
- RC1 Device Validation — docs/crash-matrix.md (riscos crash por fluxo)
- RC1 Device Validation — REAL_DEVICE_VALIDATION_PLAN.md (plano mestre campanha)
- RC1 Device Validation — RC1_RELEASE_GATE.md (porta TestFlight/Play)
- RC2 Build Readiness — docs/build-audit.md (auditoria EAS/Expo/plugins)
- RC2 Build Readiness — BUILD_RELEASE_AUDIT.md (scores + recomendação build)
- RC2 Build Readiness — RC2_BUILD_CHECKLIST.md (PASS/FAIL/PENDENTE)
- RC2 Native Build — expo-video removido (zero imports; ADR-006 obsoleto)
- RC2 Native Build — blockedPermissions RECORD_AUDIO em app.json (manifest final sem microfone)
- RC2 Native Build — preflight verde (npm ci, 487/487, tsc 0, assets, handoff)
- RC2 Native Build — docs/supabase-external-checklist.md + smoke-p0-execution.md
- RC2 Native Build — RC2_NATIVE_BUILD_REPORT.md
- RC2 Native Build — Build Android 607cc31c ERRORED (sem APK; causa: lockfile npm 10)
- RC2 Native Build — Fix lockfile npm@10.9.4 (typescript@5.9.3); validação local verde
- RC2 Native Build — docs/android-build-607cc31c-failure.md (causa-raiz documentada)
- RC2 Native Build — Build Android eb472165 FINISHED (APK RC2 canónico)
- iOS RC2 — auditoria + preflight; IPA bloqueado (sem Apple Team no EAS)
- iOS RC2 — IOS_RC2_BUILD_REPORT.md criado

### 🔲 Pendente
- Financial Engine — migrar useCashflowProjection e useCategoryBudgetStatus para cache coreState
- Financial Engine — scheduleFinancialRecalculation em mutações de contas
- Financial Engine — expandir ESLint além do scope mínimo actual (dívida técnica lint global)
- Benchmarks — aplicar migration 20240715100000, deploy Edge Function spending-benchmarks, activar UI com EXPO_PUBLIC_SPENDING_BENCHMARKS_UI=true quando ≥30 opt-in por bucket
- Open Banking — aplicar migrations 20240713000000 + 20240714100000, secrets GOCARDLESS_* no Supabase, redirect centflow://open-banking/callback, deploy Edge Function gocardless
- Migration category_spend_alerts — aplicar 20240713110000 no Supabase remoto
- Migration assistant_conversations — aplicar 20240713120000 + deploy Edge Function financial-assistant + secret ANTHROPIC_API_KEY
- Sentry — configurar EXPO_PUBLIC_SENTRY_DSN + SENTRY_ORG/PROJECT no EAS para plugin nativo
- Sentry dashboard — integração GitHub + regras de alerta (auto-detected-error vs requires-manual-review)
- GitHub secret ANTHROPIC_API_KEY para workflow auto-fix-errors.yml
- Branch protection main — exigir 1 aprovação humana (ver docs/sentry-auto-fix-pipeline.md)
- Migrar ecrãs restantes para useThemedStyles (StyleSheets estáticos com colors.* ainda congelam no primeiro tema)
- OCR: definir GOOGLE_VISION_API_KEY nos secrets + deploy process-receipt (CONFIRMADO em falta — causa do erro non-2xx)
- Activar Google Provider no Supabase Dashboard (código pronto; redirect centflow://auth/callback)
- Testar envio real Resend no Doctor (modo sandbox → só envia para a conta Resend)
- EMAIL_CRON_SECRET no GitHub Secrets (workflow email-jobs-cron)
- Produção email — verificar mail.centflow.app no Resend + EMAIL_MODE=production
- Integrar ocr_preprocess.py no serviço api.centflow.app (repo backend separado)
- Edição linha a linha de itens do talão
- Ativos — CRUD objetivos, garantias, inventário
- Compliance RC — Revisão jurídica externa dos textos legais + URL pública https://centflow.app/privacy (ou equivalente)
- Onboarding — ligar savingsGoal/savingsMonths a um objetivo real (criar Goal) e monthlyIncome ao orçamento mensal
- OCR de imagens fotografadas depende de GOOGLE_VISION_API_KEY (cloud) ou expo-ocr-kit on-device
- Copiar URL do guia Back Tap usa Share (OTA-safe); 'Copiado ✓' com clipboard nativo requer expo-clipboard num novo IPA
- RC2 Native Build — Build 7dc46d04 OBSOLETO — não testar (pré expo-video)
- RC2 Device QA — Smoke P0 Android iniciado (eb472165; 20/20 BLOCKED aguarda instalação)
- RC2 Native Build — Smoke P0 Android (20 testes) após instalação confirmada
- iOS RC2 — Ligar Apple Team ao EAS (`npx eas credentials -p ios`) sem revogar certificados
- iOS RC2 — Registar UDID iPhone (`npx eas device:create`) + regenerar Ad Hoc se necessário
- iOS RC2 — Confirmar App ID + Sign in with Apple (PENDENTE APPLE DEVELOPER)
- iOS RC2 — Após credenciais: EAS_NO_VCS=1 npm run eas:build:beta:ios
- RC2 Native Build — iOS beta BLOQUEADO: eas credentials -p ios interactivo + UDIDs registados
- RC2 Native Build — Supabase Dashboard: Google + Apple providers, redirect URLs, SHA-1 Android
- RC2 Native Build — Smoke P0 em ≥1 Android + ≥1 iPhone físico
- RC2 Native Build — Para TestFlight: perfil production + eas submit (beta é internal only)
- RC2 Native Build — Para Play Closed: AAB production + service account (beta é APK only)

---

## Arquitetura

```
UI          → app/(tabs)/*.tsx + components/**
Domínio     → lib/domain/ (cálculos de património)
Dados       → lib/data/mocks.ts + hooks/queries/
API (futuro)→ lib/api/client.ts + mappers
Tema        → lib/theme/
```

### Dashboard — secções do ecrã Início
1. **Saudação** — "Olá, [Nome]" + data + avatar → Perfil
2. **Onde estou?** — Património líquido, cor dinâmica, variação %, botão → Análises
3. **O que mudou?** — Gastos semana / evolução património / inflação pessoal
4. **O que precisa da minha atenção?** — Garantias, créditos, subscrições
5. **O que devo fazer?** — Sugestões inteligentes

### Design system (cores principais)
- Background: `#080C12`
- Surface: `#121820`
- Primary (teal): `#2DD4BF`
- Accent (gold): `#F5C451`
- Success: `#34D399` · Danger: `#F87171`

---

## Integração API (futuro)

```typescript
// hooks/queries/useDashboard.ts
const raw = await apiFetch<DashboardRaw>('/dashboard');
return mapToDashboard(raw); // usa calculateNetWorth() no mapper
```

Variável: `EXPO_PUBLIC_API_URL` (ver `.env.example`)

---

## Atualização automática

Este ficheiro regenera-se automaticamente quando:
1. **Cursor hook** `afterFileEdit` deteta alterações em `app/`, `lib/`, `components/`, `hooks/`
2. Corres `npm run handoff` manualmente
3. O agent Cursor segue a regra em `.cursor/rules/handoff-sync.mdc`

Para atualizar fases/pendências manualmente: edita `scripts/handoff.config.json`.
