# CentFlow — Launch Checklist

Revisão completa de prontidão para submissão à **Apple App Store** e **Google Play**.  
Última revisão: **30 de junho de 2026**.

---

## Resumo executivo

| Área | Estado | Notas |
|------|--------|-------|
| Compliance App Store (privacidade, eliminação de conta, Sign in with Apple) | ✅ Código pronto | Requer migration Supabase + novo IPA nativo |
| Compliance Play Store | ✅ Código pronto | Política de privacidade e termos in-app + URLs |
| Fluxos de utilizador (5 abas + auth + onboarding) | ✅ Revisados | Objetivo de onboarding agora cria Goal real |
| Precisão financeira | ✅ Documentada | Disclaimer + regra anti-dupla-contagem em PL |
| Performance | ⚠️ Aceitável | SectionList optimizada; paginação futura para >1000 movimentos |
| Subscrições (IAP) | ✅ N/A | App gratuita; «subscrições» = despesas recorrentes do utilizador |
| Backend / infra | ⚠️ Pendente | Migrations, OCR key, Google/Apple providers no Supabase |

---

## 1. Bloqueadores de submissão (ação obrigatória antes da loja)

### 1.1 Supabase — migrations

Correr na base de dados de produção:

```bash
npx supabase db push
```

Migrations críticas:

- [ ] `20240622000000_credit_commission_rate.sql`
- [ ] `20240623000000_merchant_groups.sql`
- [ ] `20240624000000_transaction_merchant.sql`
- [ ] `20240625000000_accounts_warranty_receipts.sql`
- [ ] `20240626000000_delete_own_account.sql` — **eliminação de conta (App Store 5.1.1)**

### 1.2 Autenticação OAuth

- [ ] **Google Provider** activo no Supabase Dashboard com redirect `centflow://auth/callback`
- [ ] **Apple Provider** activo no Supabase Dashboard (Services ID + key para Sign in with Apple)
- [ ] Testar login Google e Apple em dispositivo físico iOS

### 1.3 Build nativo de produção

OTA **não** inclui módulos nativos novos. É necessário **novo IPA/AAB** com:

- [ ] `expo-apple-authentication` (Sign in with Apple)
- [ ] `runtimeVersion` alinhado com `app.json` version `1.0.0`
- [ ] `EXPO_PUBLIC_APP_VARIANT=production`
- [ ] `EXPO_PUBLIC_MOCK_AUTH=false`

```bash
npm run eas:build:production:ios
npm run eas:build:production:android
```

### 1.4 URLs legais públicas

- [ ] Publicar `https://centflow.app/privacy` e `https://centflow.app/terms` (fallback in-app já existe)
- [ ] Preencher URLs no App Store Connect e Play Console

### 1.5 OCR (opcional para submissão, recomendado)

- [ ] Definir `GOOGLE_VISION_API_KEY` nos secrets Supabase
- [ ] Deploy `process-receipt` Edge Function
- Sem isto: OCR cai em preenchimento manual (aceitável, documentar nas notas de revisão)

---

## 2. Compliance — verificado no código

| Requisito | Implementação |
|-----------|---------------|
| Política de privacidade acessível | `app/settings/privacy.tsx` → URL + `/legal/privacy-policy` |
| Termos de utilização | `/legal/terms` + link no registo |
| Consentimento no registo | `TermsConsentRow` obrigatório antes de criar conta |
| Eliminação de conta | RPC `delete_own_account` + fluxo com confirmação «ELIMINAR» |
| Sign in with Apple (iOS + Google OAuth) | `AppleSignInButton` + `expo-apple-authentication` |
| Permissão desnecessária removida | `RECORD_AUDIO` removido do Android manifest |
| Aviso financeiro | `FinancialDisclaimer` em Análises e Disponível este mês |
| Exportação de dados | `/settings/export-data` (JSON) + `/settings/export-pdf` |
| Encriptação declarada | `ITSAppUsesNonExemptEncryption: false` |

---

## 3. Ecrãs revistos

| Ecrã | Rota | Estado | Notas |
|------|------|--------|-------|
| Login | `/(auth)/login` | ✅ | Email, Google, Apple |
| Registo | `/(auth)/register` | ✅ | Termos obrigatórios, força da password |
| Recuperar password | `/(auth)/forgot-password` | ✅ | Deep link `centflow://reset-password` |
| Onboarding (17 passos) | `/onboarding` | ✅ | Cria Goal real se savingsGoal > 0 |
| Início | `/(tabs)/` | ✅ | Banner PL incompleto se créditos falham |
| Movimentos | `/(tabs)/movimentos` | ✅ | SectionList optimizada, swipe editar/eliminar |
| Análises | `/(tabs)/analises` | ✅ | Error boundaries, disclaimer |
| Créditos | `/(tabs)/precos` | ✅ | Empréstimos + cartões, amortização |
| Ativos | `/(tabs)/ativos` | ✅ | Objetivos, garantias, inventário (dev) |
| Perfil | `/(tabs)/perfil` | ✅ | Sair com confirmação |
| Definições | `/settings/*` | ✅ | Privacidade, notificações, export |
| Plano financeiro | `/financial-plan` | ✅ | Resultado do onboarding |
| Gasto rápido | `/quick-expense` | ✅ | Deep link com parâmetros |
| Política (in-app) | `/legal/privacy-policy` | ✅ | Texto completo PT |
| Termos (in-app) | `/legal/terms` | ✅ | Aviso «não é aconselhamento» |

---

## 4. Fluxos de utilizador

### 4.1 Primeiro arranque

1. Registo / login → onboarding 17 passos → Home  
2. Goal criado automaticamente se objetivo de poupança > 0  
3. Guia Back Tap (iOS) após onboarding  
4. **Verificar:** utilizador sem movimentos vê empty states contextuais

### 4.2 Movimento com talão

1. Novo movimento → anexar foto → upload → OCR → confirmar  
2. Falha upload → bloqueia; falha OCR → preenchimento manual  
3. PDF → mensagem neutra (não erro)

### 4.3 Créditos

1. Criar crédito/cartão → aparece na lista  
2. Registar pagamento → actualiza saldo  
3. Alerta débito automático na data prevista

### 4.4 Eliminação de conta

1. Definições → Privacidade → Pedir eliminação  
2. Escrever «ELIMINAR» → confirmar Alert  
3. Dados em cascata removidos (FK ON DELETE CASCADE)  
4. **Requer:** migration `delete_own_account` aplicada

---

## 5. Precisão financeira

| Cálculo | Ficheiro | Regra crítica |
|---------|----------|---------------|
| Património líquido | `lib/domain/net-worth.service.ts` | Ativos − passivos |
| Composição dashboard | `lib/domain/dashboard.compose.ts` | **Não** somar `goal.current` (evita dupla contagem) |
| Disponível este mês | `lib/budget/calculateMonthlySpendable.ts` | Orçamento ≠ património |
| CentFlow Score | `lib/domain/financial/centflow-score.ts` | 0–100, requer dados suficientes |
| Health Score | `lib/insights/health-score.ts` | `hasSufficientData` guard |
| Variação PL % | `calculateNetWorthChangePercent` | Divisão por zero tratada |

**Testes:** 117 testes a passar (`npm test`).

---

## 6. Performance

| Item | Estado | Acção futura |
|------|--------|--------------|
| Lista Movimentos | ✅ `initialNumToRender`, `windowSize`, `removeClippedSubviews` | Paginação server-side para power users |
| AnimatedCurrency | ✅ rAF (sem Reanimated no arranque) | — |
| useCentFlowIntelligence | ✅ safe-analytics wrappers | — |
| Doctor overlay | ✅ Desligado em `production` | — |
| Pesquisa movimentos | ⚠️ Filtro em memória | Debounce já implícito via React batch |

---

## 7. Privacidade e dados

- Dados financeiros: Supabase com RLS por `user_id`
- Tokens: `expo-secure-store`
- Biometria: opcional, Face ID com escape de emergência
- Analytics: console-only MVP (sem SDK terceiros)
- OCR: imagens enviadas para processamento cloud ou on-device
- Emails: opt-in em Definições → Notificações

---

## 8. Subscrições e monetização

- **Sem IAP / RevenueCat / paywall**
- Na App Store: classificar como app **gratuita**
- «Subscrições» na app = tracking de Netflix, Spotify, etc. (despesas do utilizador)
- Notas de revisão: explicar que não há compras in-app

---

## 9. Notas para o revisor (App Store Connect)

```
CentFlow is a personal finance organizer. Users manually enter transactions,
goals, credits, and subscriptions. There are NO in-app purchases.

Camera/Photos: used only for receipt OCR scanning.
Face ID: optional app lock for financial data protection.

"Subscriptions" in the app refers to recurring bills the user tracks
(Netflix, etc.), not Apple subscriptions.

Sign in with Apple is offered alongside Google Sign-In per guideline 4.8.
Account deletion is available in Settings → Privacy → Delete account.

Financial figures are estimates based on user-entered data and are not
financial advice. The app is not a bank and does not connect to banks yet.
```

---

## 10. Notas para Google Play

- [ ] Preencher Data Safety form (dados financeiros, email, fotos para OCR)
- [ ] Declarar que a app não vende dados
- [ ] Link política de privacidade: `https://centflow.app/privacy`
- [ ] Permissões: apenas `CAMERA` (fotos via image-picker)

---

## 11. Checklist pré-submissão (dia D)

### Apple

- [ ] Build production IPA via EAS
- [ ] Screenshots 6.7" e 6.1" (iPhone)
- [ ] Ícone 1024×1024
- [ ] Privacy Nutrition Labels preenchidas
- [ ] Age rating: 4+ (finanças pessoais, sem conteúdo adulto)
- [ ] Testar em TestFlight: login, onboarding, movimento, OCR, eliminar conta

### Google

- [ ] AAB production
- [ ] Feature graphic + screenshots
- [ ] Data safety form
- [ ] Testar em internal testing track

### Ambos

- [ ] `npm test` verde
- [ ] OTA production publicado
- [ ] `HANDOFF.md` actualizado
- [ ] Suporte: support@centflow.app funcional

---

## 12. Itens conhecidos pós-lançamento (não bloqueiam v1)

- Push notifications locais/remotas (toggles desactivados com «Em breve»)
- Contas bancárias (`ACCOUNTS_FEATURE_ENABLED = false`)
- Open banking / ligação bancária
- Temas adicionais em Aparência
- Paginação de movimentos para listas muito grandes
- `expo-clipboard` para feedback «Copiado» no guia Back Tap

---

## 13. Comandos úteis

```bash
# Testes
npm test

# Handoff
npm run handoff

# Build produção
npm run eas:build:production:ios
npm run eas:build:production:android

# OTA
npm run eas:update:preview -- "mensagem"
npm run eas:update:production -- "mensagem"
```

---

*Gerado após auditoria de lançamento — CentFlow v1.0.0*
