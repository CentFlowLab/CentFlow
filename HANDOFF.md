<!-- ⚠️ AUTO-GENERATED — não editar manualmente -->
<!-- Gerado por: npm run handoff -->
<!-- Última geração: 2026-06-18T21:58:47.806Z -->
<!-- Git: ce15d22 (2026-06-18T22:28:10+01:00) -->

# CentFlow Mobile — Handoff

> **Where does it go?** — Documento vivo para partilha com outros agents (Grok, Claude, etc.)
>
> Este ficheiro é **gerado automaticamente**. Para alterar conteúdo curado (fases, pendências),
> edita `scripts/handoff.config.json` e corre `npm run handoff`.

---

## Meta

| Campo | Valor |
|-------|-------|
| Fase atual | **Fase 5 — Movimentos (OCR melhorado → UI confirmação)** |
| Última geração | 2026-06-18T21:58:47.806Z |
| Path do projeto | `C:\Users\EMANU\Documents\CentFlow App\centflow` |
| Git commit | `ce15d22` (2026-06-18T22:28:10+01:00) |

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
- `calculateNetWorth()`
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

Ecrãs detetados: `analises`, `ativos`, `index`, `movimentos`, `perfil`, `precos`

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
    index.tsx
    movimentos.tsx
    perfil.tsx
    precos.tsx
  +html.tsx
  +not-found.tsx
  _layout.tsx
  auth/
    callback.tsx
  index.tsx
  onboarding.tsx
  reset-password.tsx
  settings/
    _layout.tsx
    appearance.tsx
    currency-region.tsx
    diagnostics.tsx
    export-data.tsx
    export-pdf.tsx
    notifications.tsx
    personal-data.tsx
    privacy.tsx
    security.tsx
  analysis/
    AnalysisMetricCard.tsx
    AnalysisSkeleton.tsx
    InsightsSection.tsx
    PatrimonyAllocationCard.tsx
    PricesInsightsSection.tsx
    SpendingCategoryCard.tsx
    TrendsSummaryCard.tsx
    index.ts
  app/
    AndroidNavigationBarEffect.tsx
    AppSecurityBootstrap.tsx
    BiometricGate.tsx
    EmailDeepLinkHandler.tsx
    RemoteDataSyncEffect.tsx
    StartupErrorScreen.tsx
    StartupShell.tsx
    index.ts
  auth/
    AuthLoadingScreen.tsx
    AuthScreenLayout.tsx
    AuthSocialDivider.tsx
    GoogleSignInButton.tsx
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
    HomeAssetsSummaryCard.tsx
    HomeAssistantCard.tsx
    HomeAttentionSheet.tsx
    HomeChangesSheet.tsx
    HomeGoalHighlightCard.tsx
    HomePersonalizedInsightCard.tsx
    HomeQuickActions.tsx
    HomeStoriesRow.tsx
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
    TabIcon.tsx
  layout/
    AppHeader.tsx
    CentFlowTabBar.tsx
    DraggableBottomSheet.tsx
    ProfileMenuSheet.tsx
    QuickAddMenuSheet.tsx
    SegmentedControl.tsx
    TabBarAnalisesIcon.tsx
    UserAvatarButton.tsx
    index.ts
  movements/
    AddTransactionModal.tsx
    ConfirmReceiptModal.tsx
    EditTransactionModal.tsx
    ImportCsvModal.tsx
    OcrDetectionSummary.tsx
    OcrResultCard.tsx
    PendingSubscriptionModal.tsx
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
    FeatureAreaCard.tsx
    OnboardingGateEffect.tsx
    OnboardingProgressBar.tsx
    OnboardingShell.tsx
    OnboardingStepHeader.tsx
    SelectableCard.tsx
    ValuePromiseSection.tsx
    index.ts
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
    Button.tsx
    Card.tsx
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
  mutations/
    useProfileMutations.ts
  queries/
    useActiveSessions.ts
    useAnalysisData.ts
    useAssets.ts
    useDashboard.ts
    useDashboardData.ts
    useFinancialProfile.ts
    useHomeScreenData.ts
    useLiabilities.ts
    useNetWorth.ts
    useOnboardingAnswers.ts
    usePatrimonyAllocation.ts
    usePricesData.ts
    useProfile.ts
    useTransactions.ts
    useUserPreferences.ts
  useCentFlowIntelligence.ts
  useFeatureAreas.ts
  useFormDismiss.ts
  useHomeStoryNotifications.ts
  useImportCsv.ts
  useKeyboardVisible.ts
  useOnboarding.ts
  useProcessReceipt.ts
  usePullToRefresh.ts
  useQuickAddActions.ts
  useReceiptImage.ts
  useSubscriptionDetection.ts
  useTabBarBottomInset.ts
  analises-tab-icon/
    analises-tab-icon.context.tsx
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
      analysis.service.ts
      assets.service.ts
      csv-import.service.ts
      dashboard.service.ts
      financial-profile.service.ts
      home.service.ts
      prices.service.ts
      profile.service.ts
      receipt-items.service.ts
      receipt.service.ts
      transaction.service.ts
    token.ts
    upload.ts
  app/
    intro-session.ts
  auth/
    auth.context.tsx
    auth.service.ts
    constants.ts
    errors.ts
    google-oauth.config.ts
    google-oauth.ts
    index.ts
    mock-auth.ts
    schemas.ts
    storage.ts
    supabase-oauth.config.ts
    types.ts
    useAuth.ts
  config/
    app-variant.ts
    data-mode.ts
    demo-mode.ts
    runtime-env.ts
  credit/
    credit-analysis.test.ts
    credit-analysis.ts
    credit-type.utils.test.ts
    credit-type.utils.ts
  csv/
    csv-import.types.ts
    parse-transactions-csv.ts
    read-csv-file.ts
  data/
    analysis.mocks.ts
    mocks.ts
    prices.mocks.ts
    transaction-categories.ts
  diagnostics/
    app-log.ts
    config.ts
    index.ts
  doctor/
    index.ts
    log-mutation.ts
  domain/
    analysis.compose.ts
    analysis.insights.ts
    analysis.types.ts
    assets.schema.ts
    assets.types.ts
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
    net-worth.service.ts
    receipt-confirmation.schema.ts
    receipt-confirmation.ts
    receipt-items.schema.ts
    receipt.types.ts
    transaction-form.ts
    transaction.schema.ts
    transaction.types.ts
    types.ts
    warranty.utils.ts
  email/
    deep-links.ts
    dev-tools.ts
    index.ts
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
    story-seen.storage.ts
  liabilities/
    liabilities.service.ts
  migrations/
    index.ts
    migrationRunner.ts
    onboardingMigrations.ts
    profileMigrations.ts
    settingsMigrations.ts
  onboarding/
    answers.service.ts
    constants.ts
    features.ts
    gate.ts
    personalization.ts
    storage.ts
    types.ts
    welcome.ts
  preferences/
    PreferencesProvider.tsx
    config.ts
    index.ts
    locale.data.ts
    preferences.service.ts
    storage.ts
    types.ts
  receipt/
    client-ocr.ts
    ocr-confidence.ts
    ocr-sanitize.ts
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
    pending-subscriptions.storage.ts
    secure-store-key.ts
  subscriptions/
    detect-subscriptions.test.ts
    detect-subscriptions.ts
    subscription-utils.ts
  supabase/
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
  updates/
    applyUpdateSafely.ts
    checkForUpdates.ts
    index.ts
    updateStatus.ts
  utils/
    format.ts
  widgets/
    widget-data.ts
  generate-handoff.ts
  handoff.config.json
  test-ocr-sanitize.ts
```

---

## Fase atual: Fase 5 — Movimentos (OCR melhorado → UI confirmação)

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

### 🔲 Pendente
- Correr npx eas init no projecto Expo (liga repo + projectId + updates URL)
- Etapa 2 — Melhorar UI do ecrã ConfirmReceiptModal
- Integrar ocr_preprocess.py no serviço api.centflow.app (repo backend separado)
- Google OAuth (expo-auth-session — preparado)
- Validar contrato exacto da API com backend em produção
- Edição linha a linha de itens do talão
- Editar e eliminar movimentos
- Ativos — CRUD objetivos, garantias, inventário
- Navegação funcional em alertas e sugestões do Dashboard

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
