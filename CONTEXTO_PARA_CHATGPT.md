# CentFlow Mobile — Contexto para ChatGPT

> **Como usar:** Copia este ficheiro inteiro para o ChatGPT no início de uma conversa sobre o projecto CentFlow.  
> **Path local:** `C:\Users\EMANU\Documents\CentFlow App\centflow`  
> **Repo:** https://github.com/EveryFT1me/CentFlow  
> **Última actualização deste documento:** Junho 2026

---

## 1. O que é o CentFlow

App mobile de **controlo financeiro pessoal** (MVP) para utilizadores portugueses. Foco em:

- Dashboard com património líquido e resumo
- **Movimentos** (despesas/receitas) com **digitalização de talões** (OCR)
- **Ativos** (objetivos, garantias, inventário)
- Análises, preços, perfil e definições
- Design **dark premium** (teal + gold)

---

## 2. Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Framework | Expo SDK **56**, Expo Router |
| UI | React Native 0.85, React 19 |
| Linguagem | TypeScript |
| Estado servidor | TanStack Query v5 |
| Backend | Supabase (auth, DB, storage, Edge Functions) + API REST opcional |
| Auth | Supabase / mock / REST (`lib/auth/`) |
| OCR | `expo-ocr-kit` (device) + Google Vision (cloud) + heurísticas PT |
| Animações | `react-native-reanimated` |
| Persistência local | `expo-secure-store` |
| Deploy | EAS Build + EAS Update (OTA) |

**Comandos:**
```bash
cd centflow
npm start
npx expo start
# TypeScript (se node_modules instalado):
node_modules/.bin/tsc --noEmit
```

---

## 3. Variáveis de ambiente relevantes

```env
EXPO_PUBLIC_API_URL=...
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_MOCK_AUTH=true          # dev: auth + dados mock
EXPO_PUBLIC_USE_MOCK=true          # força mock no Início
EXPO_PUBLIC_MOCK_OCR=true          # OCR demo
```

---

## 4. Estrutura do projecto

```
centflow/
├── app/                          # Expo Router (ecrãs)
│   ├── _layout.tsx               # Root: AuthProvider, Stack protegido
│   ├── onboarding.tsx            # Onboarding conversacional 8 passos
│   ├── (auth)/                   # login, register, forgot-password
│   ├── (tabs)/                   # 5 abas principais
│   │   ├── index.tsx             # Início / Dashboard
│   │   ├── movimentos.tsx        # Lista + CRUD movimentos
│   │   ├── analises.tsx
│   │   ├── precos.tsx
│   │   ├── ativos.tsx            # Objetivos | Garantias | Inventário
│   │   └── perfil.tsx
│   └── settings/                 # Definições funcionais
├── components/
│   ├── ui/                       # Button, Text, Card, TextField, Toast...
│   ├── layout/                   # AppHeader, DraggableBottomSheet...
│   ├── dashboard/                # Cards do Início
│   ├── movements/                # Talão, OCR, modais movimentos
│   ├── assets/                   # CRUD ativos
│   └── onboarding/               # Shell, cards, progresso
├── hooks/
│   ├── useOnboarding.ts
│   ├── useReceiptImage.ts
│   ├── useProcessReceipt.ts
│   └── queries/                  # React Query hooks
├── lib/
│   ├── auth/
│   ├── api/services/             # transaction, receipt, profile, home...
│   ├── domain/                   # tipos + schemas Zod
│   ├── onboarding/               # tipos, personalização, storage
│   ├── preferences/
│   ├── receipt/                  # OCR pipeline, parser PT
│   ├── supabase/
│   └── theme/                    # colors, spacing (dark premium)
└── supabase/migrations/          # Schema SQL
```

---

## 5. Navegação e fluxo de entrada

```
Login/Registo → (tabs) → se onboarding incompleto → /onboarding → (tabs)
```

- Gate de onboarding: `app/(tabs)/_layout.tsx` + `hooks/useOnboarding.ts`
- Rotas protegidas: `Stack.Protected` em `app/_layout.tsx`
- Onboarding **por utilizador** (SecureStore + Supabase `onboarding_answers`)

**5 abas:** Início · Movimentos · Análises · Preços · Ativos  
(Perfil existe mas `href: null` — acesso via header/menu)

---

## 6. Base de dados Supabase (migrations)

| Migration | Conteúdo |
|-----------|----------|
| `20240613000000_initial_schema.sql` | profiles, transactions, receipts, OCR |
| `20240614000000_assets_schema.sql` | goals, warranties, inventory |
| `20240615000000_warranties_receipt.sql` | ligação garantias ↔ recibos |
| `20240616000000_user_preferences.sql` | push, região, tema, biometria |
| `20240617000000_onboarding_answers.sql` | respostas onboarding conversacional (JSONB) |

**Tabelas principais:**
- `profiles` — name, currency
- `user_preferences` — notificações, região, tema
- `onboarding_answers` — completed, skipped, answers (jsonb)
- `transactions`, `receipts`, `ocr_results`
- `goals`, `warranties`, `inventory_items`

---

## 7. Funcionalidades implementadas (estado actual)

### ✅ Início (`app/(tabs)/index.tsx`)
- Dashboard com património, métricas, movimentos recentes
- `useHomeScreenData()` com fallback mock
- Saudação personalizada via onboarding (`DashboardHeaderLeading`)
- Quick actions, alertas, sugestões, perfil financeiro

### ✅ Movimentos (`app/(tabs)/movimentos.tsx`)
- Lista com filtros (todos/despesas/receitas)
- Swipe para editar/eliminar (`SwipeableTransactionListItem`)
- `AddTransactionModal` — manual ou talão
- `EditTransactionModal`
- Import CSV no header
- Deep link: `?action=receipt` abre câmara (pós-onboarding)

### ✅ Fluxo Talão / OCR (MVP importante)
```
Foto/PDF → pré-processamento → upload → OCR → ConfirmReceiptModal → createTransaction
```

**Ficheiros-chave:**
- `components/movements/AddTransactionModal.tsx`
- `components/movements/ConfirmReceiptModal.tsx` — preview hero, zoom, re-take, descartar
- `components/movements/ReceiptDataForm.tsx` — campos editáveis com badges OCR
- `hooks/useProcessReceipt.ts`, `hooks/useReceiptImage.ts`
- `lib/api/services/receipt.service.ts`
- `lib/receipt/parse-receipt-pt.ts`, `ocr-confidence.ts`

**UX talão:**
- Preview ampliável (`ReceiptImageViewer`)
- Confiança OCR global + por campo
- Distinção OCR vs «Editado»
- «Tirar outra foto», «Descartar», «Confirmar e guardar» (verde)
- Toast de sucesso ao guardar

### ✅ Ativos (`app/(tabs)/ativos.tsx`)
- 3 tabs: Objetivos | Garantias | Inventário
- CRUD completo com modais de formulário
- Overview clicável
- Deep links: `?action=new-goal|new-warranty|new-asset`

### ✅ Definições / Perfil
- `app/settings/*` — dados pessoais, moeda, notificações, tema, segurança
- Export PDF + JSON
- Persistência Supabase + SecureStore fallback
- `PreferencesProvider` sincroniza moeda/locale

### ✅ Onboarding conversacional (`app/onboarding.tsx`)
**8 passos:**
1. Nome («Como gostaria de ser tratado?»)
2. Mensagens animadas de boas-vindas
3. Perfil (multi-select: gastos, faturas, património...)
4. Áreas de vida (casa, carro, créditos, subscrições...)
5. Config mínima (rendimento, poupanças, dívidas)
6. Ambição a 12 meses
7. Revelação (loading → resumo personalizado)
8. WOW — escolher primeiro passo (talão, objetivo, garantia, ativo)

**Persistência:** `lib/onboarding/answers.service.ts`  
**Personalização:** `lib/onboarding/personalization.ts`  
**Hook:** `hooks/queries/useOnboardingAnswers.ts`

### ✅ Auth
- Login, registo, Google OAuth, sessão SecureStore
- Mock auth para desenvolvimento

### ✅ CI / Build
- GitHub Actions: `npm ci` + build iOS unsigned
- EAS Update para OTA preview
- Nota: usar `npx npm@10 install` para compatibilidade lockfile com CI (Node 20)

---

## 8. Design system

**Tema:** `lib/theme/colors.ts`
- Background: `#05080E`
- Primary (teal): `#2DD4BF`
- Accent (gold): `#F0C14D`
- Superfícies com profundidade, bordas subtis

**Componentes base:** `components/ui/`
- `Button` — variants: primary, secondary, ghost, danger, **success**
- `Text`, `TextField`, `Card`, `Toast`, `ScreenContainer`
- `TextField` suporta badges OCR (alto/médio/baixo/editado)

---

## 9. Dados do onboarding — como reutilizar

```typescript
// lib/onboarding/types.ts
OnboardingAnswers {
  displayName, profileTags[], lifeAreas[],
  hasMonthlyIncome, hasSavings, hasDebt,
  ambitions[], ambitionOther, firstAction,
  completed, skipped
}
```

**Funções úteis** (`lib/onboarding/personalization.ts`):
- `getHomeContextualMessage()` — frase no Início
- `getOnboardingInsights()` — bullets no resumo
- `getPriorityFeatures()` — funcionalidades activadas
- `getWowActionCards()` — CTAs contextuais
- `shouldShowDebtFeatures()` / `shouldShowSavingsFeatures()`

**Exemplos de personalização futura:**
- Mostrar/ocultar secções conforme `lifeAreas`
- Priorizar «Digitalizar talão» se `receipts_warranties`
- Sugerir objetivos se `financial_goals`
- Adaptar empty states com base em `firstAction`

---

## 10. Padrões de código

- Serviços em `lib/api/services/` com fallback mock/Supabase
- React Query para fetch + mutations optimistas onde aplicável
- Schemas Zod em `lib/domain/*.schema.ts`
- Tipos de domínio em `lib/domain/*.types.ts`
- Mappers API em `lib/api/mappers/`
- Comentários mínimos — código auto-explicativo
- Respostas ao utilizador em **português de Portugal**

---

## 11. O que ainda pode melhorar (não bloqueante)

| Área | Nota |
|------|------|
| Itens do talão | UI existe mas **não persiste** no backend ao confirmar |
| `OcrResultCard.tsx` | Componente órfão (substituído por `OcrDetectionSummary`) |
| Análises / Preços | Ecrãs com menos conteúdo real |
| Onboarding web | SecureStore em memória — perde estado no refresh |
| `HANDOFF.md` | Auto-gerado e **desactualizado** — preferir este ficheiro |
| Gate onboarding | Só nas tabs; `/settings` acessível sem onboarding |

---

## 12. Ficheiros mais importantes (referência rápida)

| Tarefa | Ficheiros |
|--------|-----------|
| Onboarding | `app/onboarding.tsx`, `lib/onboarding/*`, `hooks/useOnboarding.ts` |
| Talão/OCR | `ConfirmReceiptModal.tsx`, `receipt.service.ts`, `useProcessReceipt.ts` |
| Movimentos | `movimentos.tsx`, `AddTransactionModal.tsx`, `useTransactions.ts` |
| Início | `index.tsx`, `home.service.ts`, `DashboardHeaderLeading.tsx` |
| Ativos | `ativos.tsx`, `components/assets/*`, `useAssets.ts` |
| Perfil/Prefs | `lib/preferences/*`, `profile.service.ts`, `app/settings/*` |
| Auth | `lib/auth/*`, `app/(auth)/*` |
| Tema | `lib/theme/colors.ts` |

---

## 13. Instruções para o ChatGPT

Quando trabalhares neste projecto:

1. **Assume Expo SDK 56** e TypeScript strict.
2. **Mantém o design dark premium** — não introduzir temas claros sem pedido.
3. **Textos em português de Portugal** (tu/você conforme contexto existente).
4. **Minimiza scope** — alterações focadas, sem refactors não pedidos.
5. **Segue padrões existentes** — serviço + hook + componente; mock + Supabase.
6. **Não commits nem push** a menos que o utilizador peça explicitamente.
7. Para novas features de personalização, usa `OnboardingAnswers` e funções em `personalization.ts`.
8. O fluxo de talão é **crítico para o MVP** — preservar UX permissiva quando OCR falha.

---

## 14. Histórico recente de desenvolvimento

1. Início estável com mock fallback e header avatar
2. Definições/perfil funcionais com Supabase
3. Ativos CRUD unificado (objetivos, garantias, inventário)
4. Movimentos: edit/delete, swipe, import CSV
5. Fix CI package-lock (typescript eas-cli)
6. UX completa ecrã confirmação talão (preview, re-take, confiança OCR)
7. Onboarding conversacional 8 passos com persistência e personalização do Início

---

*Fim do contexto. Podes colar isto no ChatGPT e depois fazer perguntas específicas sobre qualquer área.*
