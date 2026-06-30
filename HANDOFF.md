<!-- ⚠️ AUTO-GENERATED — não editar manualmente -->
<!-- Gerado por: npm run handoff -->
<!-- Última geração: 2026-06-30T11:49:30.310Z -->
<!-- Git: 5f84848 (2026-06-30T01:06:17+01:00) -->

# CentFlow Mobile — Handoff

> **Where does it go?** — Documento vivo para partilha com outros agents (Grok, Claude, etc.)
>
> Este ficheiro é **gerado automaticamente**. Para alterar conteúdo curado (fases, pendências),
> edita `scripts/handoff.config.json` e corre `npm run handoff`.

---

## Meta

| Campo | Valor |
|-------|-------|
| Fase atual | **Fase 18 — Prontidão de lançamento (App Store / Play Store)** |
| Última geração | 2026-06-30T11:49:30.310Z |
| Path do projeto | `/workspace` |
| Git commit | `5f84848` (2026-06-30T01:06:17+01:00) |

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
| Mês anterior | 9850,00 € |
| Variação | +22.2% |
| Gastos esta semana | 342,50 € |
| Alertas ativos | 5 |
| Sugestões | 2 |

### Regras de investimentos recorrentes (correção vs. web)
- Usa `currentValue` (valor de mercado), não `appliedAmount`
- Inclui: regra ativa OU `appliedAmount > 0`
- Não projeta contribuições futuras
- Não duplica saldos de conta com investimentos

### Funções de domínio (`lib/domain/net-worth.service.ts`)
- `sumAccountBalances()`
- `sumInventoryValue()`
- `sumRecurringInvestments()`
- `sumCreditLiabilities()`
- `sumGoalSavings()`
- `calculateNetWorth()`
- `buildNetWorthProjection()`
- `calculateNetWorthChangePercent()`

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

Ecrãs detetados: `analises`, `ativos`, `contas`, `index`, `movimentos`, `perfil`, `precos`

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
    contas.tsx
    index.tsx
    movimentos.tsx
    perfil.tsx
    precos.tsx
  +html.tsx
  +not-found.tsx
  _layout.tsx
  auth/
    callback.tsx
  financial-plan.tsx
  index.tsx
  legal/
    privacy-policy.tsx
    terms.tsx
  onboarding.tsx
  quick-expense.tsx
  reset-password.tsx
  settings/
    _layout.tsx
    appearance.tsx
    currency-region.tsx
    diagnostics.tsx
    export-data.tsx
    export-pdf.tsx
    index.tsx
    merchant-groups.tsx
    notifications.tsx
    personal-data.tsx
    privacy.tsx
    security.tsx
    shortcuts.tsx
  accounts/
    AccountDetailSheet.tsx
    AccountFormModal.tsx
    AccountListItem.tsx
    AccountPickerField.tsx
    index.ts
  analysis/
    AnalysisErrorBoundary.tsx
    AnalysisMetricCard.tsx
    AnalysisSectionEmpty.tsx
    AnalysisSkeleton.tsx
    AnalysisTabChips.tsx
    AutoInsightsCarousel.tsx
    CategoryBreakdownList.tsx
    CreditsAnalysisSection.tsx
    HealthScoreBreakdownSheet.tsx
    HealthScoreCard.tsx
    InsightsSection.tsx
    MonthEndForecastCard.tsx
    MonthlyComparisonSection.tsx
    PatrimonyAllocationCard.tsx
    PricesInsightsSection.tsx
    SpendingCategoryCard.tsx
    SpendingHeatmap.tsx
    SpendingTrendBars.tsx
    SubscriptionsAnalysisSection.tsx
    TopMerchantsSection.tsx
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
  attachments/
    AttachReceiptButton.tsx
  auth/
    AppleSignInButton.tsx
    AuthLoadingScreen.tsx
    AuthScreenLayout.tsx
    AuthSocialDivider.tsx
    GoogleSignInButton.tsx
    index.ts
  budget/
    MonthlySpendableCard.tsx
    MonthlySpendableSheet.tsx
    index.ts
  charts/
    DonutChart.tsx
    index.ts
  dashboard/
    ActionCenterSheet.tsx
    AttentionCard.tsx
    CentFlowScoreCard.tsx
    CentFlowScoreSheet.tsx
    DashboardFinancialSnapshot.tsx
    DashboardGreeting.tsx
    DashboardHeaderLeading.tsx
    DashboardSkeleton.tsx
    DemoModeBadge.tsx
    HomeAlertsSection.tsx
    HomeAssetsSummaryCard.tsx
    HomeAssistantCard.tsx
    HomeAttentionSheet.tsx
    HomeChangesSheet.tsx
    HomeGoalHighlightCard.tsx
    HomePersonalizedInsightCard.tsx
    HomePostOnboardingWelcomeCard.tsx
    HomeQuickActions.tsx
    MetricCard.tsx
    NetWorthHeroCard.tsx
    SuggestionCard.tsx
    index.ts
  diagnostics/
    DiagnosticLogPanel.tsx
    DiagnosticOverlay.tsx
    DiagnosticsBootstrap.tsx
    index.ts
  features/
    FeatureAreaGate.tsx
    index.ts
  icons/
    AnalysisIconMark.tsx
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
    FinancialDisclaimer.tsx
    TermsConsentRow.tsx
  movements/
    AddTransactionModal.tsx
    CategoryField.tsx
    ConfirmReceiptModal.tsx
    EditTransactionModal.tsx
    ImportCsvModal.tsx
    MerchantAutocompleteField.tsx
    MerchantGroupSuggestionGate.tsx
    MerchantGroupSuggestionSheet.tsx
    MovementFilterChips.tsx
    OcrDetectionSummary.tsx
    OcrResultCard.tsx
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
    SwipeableTransactionListItem.tsx
    TransactionForm.tsx
    TransactionListItem.tsx
    TransactionsSkeleton.tsx
    index.ts
    movements.config.ts
    ocr/
      OcrFailureCard.tsx
      OcrFieldBadge.tsx
      OcrFieldsChecklist.tsx
      index.ts
  onboarding/
    AnimatedAssistantMessage.tsx
    BackTapGuide.tsx
    BackTapGuideGate.tsx
    FeatureAreaCard.tsx
    OnboardingGateEffect.tsx
    OnboardingIllustration.tsx
    OnboardingPlanLoading.tsx
    OnboardingProgressBar.tsx
    OnboardingShell.tsx
    OnboardingStepHeader.tsx
    OnboardingValueCard.tsx
    SelectableCard.tsx
    ValuePromiseSection.tsx
    index.ts
    premium/
      BigAmountInput.tsx
      BuildSequence.tsx
      PlanResult.tsx
      WheelPicker.tsx
      index.ts
      primitives.tsx
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
    ChangePasswordModal.tsx
    SettingsOptionGroup.tsx
    SettingsScreenLayout.tsx
    SettingsToggleRow.tsx
    index.ts
  ui/
    AnimatedCurrency.tsx
    BottomActionSheet.tsx
    Button.tsx
    Card.tsx
    CentFlowCalendar.tsx
    DatePickerField.tsx
    EmptyState.tsx
    ErrorState.tsx
    LoadingSpinner.tsx
    QueryScreenState.tsx
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
      PricesSkeleton.tsx
      ProfileSkeleton.tsx
  useClientOnlyValue.ts
  useClientOnlyValue.web.ts
  useColorScheme.ts
  useColorScheme.web.ts
  version/
    ForceUpdateScreen.tsx
  warranties/
    WarrantyInventorySyncEffect.tsx
  mutations/
    useProfileMutations.ts
  queries/
    useAccounts.ts
    useActiveSessions.ts
    useAnalysisData.ts
    useAssets.ts
    useDashboard.ts
    useDashboardData.ts
    useEmailEvents.ts
    useFinancialProfile.ts
    useHomeScreenData.ts
    useLiabilities.ts
    useMerchantGroups.ts
    useNetWorth.ts
    useOnboardingAnswers.ts
    usePatrimonyAllocation.ts
    usePricesData.ts
    useProfile.ts
    useTransactions.ts
    useUserPreferences.ts
  useAnalyticsInsights.ts
  useCentFlowIntelligence.ts
  useContextualQuickAdd.ts
  useCustomCategories.ts
  useDiagnosticScreen.ts
  useFeatureAreas.ts
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
  useRecentMerchants.ts
  useResponsiveLayout.ts
  useSubscriptionDetection.ts
  useTabBarBottomInset.ts
  useTabBarMetrics.ts
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
    mock-accounts.ts
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
      prices.service.ts
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
    apple-auth.ts
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
  budget/
    calculateMonthlySpendable.test.ts
    calculateMonthlySpendable.ts
  config/
    app-variant.ts
    data-mode.ts
    demo-mode.ts
    legal.ts
    product-features.ts
    runtime-env.ts
  credit/
    credit-analysis.test.ts
    credit-analysis.ts
    credit-dates.ts
    credit-reminder-storage.ts
    credit-type.utils.test.ts
    credit-type.utils.ts
  csv/
    csv-import.types.ts
    parse-transactions-csv.ts
    read-csv-file.ts
  data/
    analysis.mocks.ts
    custom-categories-storage.ts
    mocks.ts
    prices.mocks.ts
    transaction-categories.ts
  diagnostics/
    app-log.ts
    config.ts
    index.ts
    runtime-context.ts
  doctor/
    financial-mutation-trace.ts
    index.ts
    log-mutation.ts
    movement-flow-trace.ts
    quick-expense-link-trace.ts
    quick-expense-trace.ts
  domain/
    account.types.ts
    analysis-period.ts
    analysis.compose.ts
    analysis.insights.ts
    analysis.types.ts
    assets.schema.ts
    assets.types.ts
    attention-items.test.ts
    attention-items.ts
    dashboard.compose.ts
    date-input.schema.ts
    financial/
      assistant.ts
      centflow-score.ts
      index.ts
      score-explain.ts
      types.ts
    financial-profile.service.ts
    financial-profile.types.ts
    goal-form.utils.ts
    goal.utils.ts
    home.types.ts
    index.ts
    merchant-group.types.ts
    net-worth-monthly.ts
    net-worth-projection.test.ts
    net-worth.service.test.ts
    net-worth.service.ts
    receipt-confirmation.schema.ts
    receipt-confirmation.ts
    receipt-items.schema.ts
    receipt.types.ts
    transaction-date.utils.ts
    transaction-form.ts
    transaction-grouping.ts
    transaction.schema.ts
    transaction.types.ts
    types.ts
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
  insights/
    __tests__/
      generate-insights.test.ts
      health-score.test.ts
    category-breakdown.ts
    generate-insights.ts
    health-score.ts
    home-daily-message.ts
    month-utils.ts
    monthly-comparison.ts
    safe-analytics.ts
    spending-forecast.ts
    subscription-analysis.ts
    types.ts
  launch-readiness.test.ts
  layout/
    device-metrics.ts
    responsive-layout.test.ts
    safe-area.test.ts
    safe-area.ts
    tab-bar-metrics.test.ts
    tab-bar-metrics.ts
  legal/
    open-legal-document.ts
  liabilities/
    liabilities.service.ts
  merchants/
    __tests__/
      fuzzy-match.test.ts
    dismissed-suggestions.ts
    fuzzy-match.ts
    group-analytics.ts
    local-merchant-groups.ts
    merchant-groups.service.ts
    suggestion-publisher.ts
    transaction-search.ts
  migrations/
    index.ts
    migrationRunner.ts
    onboardingMigrations.ts
    profileMigrations.ts
    settingsMigrations.ts
  navigation/
    dashboard-routes.ts
    quick-add-context.ts
    suggestion-actions.ts
  onboarding/
    answers.service.ts
    assistance.test.ts
    assistance.ts
    back-tap-guide.ts
    constants.ts
    copy.ts
    create-goal-from-answers.ts
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
  preferences/
    PreferencesProvider.tsx
    config.ts
    index.ts
    locale.data.ts
    preferences.service.ts
    storage.ts
    types.ts
  quick-expense/
    __tests__/
      handle-quick-expense-link.test.ts
    handle-quick-expense-link.ts
  receipt/
    attach-entity-receipt.ts
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
    openBankingPrep.ts
    passwordPolicy.test.ts
    passwordPolicy.ts
    secureStorage.ts
    securityLogger.ts
    sessionSecurity.ts
    versionGuard.ts
  storage/
    liabilities-storage.ts
    local-flags.ts
    pending-subscriptions.storage.ts
    quick-expense-storage.ts
    secure-store-key.ts
  subscriptions/
    auto-categorize.ts
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
    client.ts
    config.ts
    database.types.ts
    index.ts
    liabilities.ts
    mappers.ts
    realtime-sync.ts
    receipt-item-mappers.ts
    receipt-items.ts
    receipts.ts
    transactions.ts
  theme/
    colors.ts
    index.ts
    spacing.ts
    typography.ts
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
    format.ts
    pluralize.test.ts
    pluralize.ts
  warranties/
    expired-to-inventory.ts
  widgets/
    widget-data.ts
  generate-handoff.ts
  handoff.config.json
  test-ocr-sanitize.ts
```

---

## Fase atual: Fase 18 — Prontidão de lançamento (App Store / Play Store)

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
- Fuzzy merchant matching — tabela merchant_groups + merchant_group_id em transactions (migration SQL); algoritmo Levenshtein + tokens + prefixo (threshold 0.65); sugestão bottom sheet 1.5s após guardar despesa; dismiss 7 dias via SecureStore
- Grupos de comerciantes — Definições → lista/renomear/aliases/eliminar; pesquisa em Movimentos (description + aliases); badge grupo na lista; Top comerciantes em Análises com comparação mês anterior
- Analytics — motor lib/insights (generateInsights, health-score, previsão, comparação mensal, heatmap); carousel de insights + score 0-100 no topo de Análises; categorias expandidas, subscrições, créditos com simulador amortização
- Home inteligente — mensagem contextual dinâmica, AnimatedCurrency no Disponível, resumo rápido condicional, Plano de hoje sem objetivos, ícone neutro Outros
- FIX crash arranque pós-analytics — AnimatedCurrency sem Reanimated (rAF), HealthScoreCard SVG transform, safe-analytics + Error Boundaries, useCentFlowIntelligence protegido
- P0 core refinements — formatCurrency guard, health score hasSufficientData, Home NetWorthHeroCard + liabilitiesLoadFailed, onboarding error fix, InventorySection onPrimaryAction
- P1 refinements — Análises (dedupe, PatrimonyAllocationCard, empty states, period note), Quick Add despesa rápida, Movimentos filtros, push disabled, PT labels, goals copy
- Campo merchant opcional — migration, formulários, OCR, autocomplete, pesquisa, gasto rápido com presets e repetir última
- Launch review — Política de privacidade e Termos in-app + URLs (centflow.app/privacy, /terms)
- Launch review — Eliminação de conta (RPC delete_own_account + fluxo Definições → Privacidade)
- Launch review — Sign in with Apple (expo-apple-authentication + botão login/registo)
- Launch review — Consentimento de termos obrigatório no registo
- Launch review — Aviso financeiro (FinancialDisclaimer em Análises e Disponível este mês)
- Launch review — Removida permissão RECORD_AUDIO do Android
- Launch review — Onboarding cria Goal real a partir de savingsGoal
- Launch review — SectionList Movimentos optimizada (windowSize, removeClippedSubviews)
- Launch review — launch-checklist.md gerado

### 🔲 Pendente
- Aplicar migration 20240624000000_transaction_merchant.sql no Supabase (db push) — coluna merchant em transactions
- Aplicar migration 20240623000000_merchant_groups.sql no Supabase (db push) — merchant_groups + merchant_group_id
- OCR: definir GOOGLE_VISION_API_KEY nos secrets + deploy process-receipt (CONFIRMADO em falta — causa do erro non-2xx)
- Aplicar migration 20240622000000_credit_commission_rate.sql no Supabase (db push) — necessária para editar comissão de amortização; a criação normal de crédito já não depende dela
- Activar Google Provider no Supabase Dashboard (BUG 3 — código pronto, falta config + redirect centflow://auth/callback)
- Testar envio real Resend no Doctor (modo sandbox → só envia para a conta Resend)
- EMAIL_CRON_SECRET no GitHub Secrets (workflow email-jobs-cron)
- Produção email — verificar mail.centflow.app no Resend + EMAIL_MODE=production
- Integrar ocr_preprocess.py no serviço api.centflow.app (repo backend separado)
- Edição linha a linha de itens do talão
- Ativos — CRUD objetivos, garantias, inventário
- Aplicar migration 20240626000000_delete_own_account.sql no Supabase (db push) — eliminação de conta
- Activar Apple Provider no Supabase Dashboard + novo IPA nativo (Sign in with Apple)
- OCR de imagens fotografadas depende de GOOGLE_VISION_API_KEY (cloud) ou do módulo nativo expo-ocr-kit (não presente no IPA unsigned) — sem isso, cai em preenchimento manual
- Publicar URLs legais https://centflow.app/privacy e /terms no site
- Onboarding IPA nativo — expo-haptics (háptica), expo-blur (glass): instalar + novo IPA (não entram por OTA)
- Cartão de crédito reutiliza colunas existentes (originalAmount=limite, termMonths=dia de fecho, interestRateAnnual=TAN); migration dedicada fica para depois

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
