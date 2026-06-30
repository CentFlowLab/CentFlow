# CentFlow — Relatório de Performance

**Data:** 30 de junho de 2026  
**Âmbito:** Auditoria completa de re-renders, memoização, listas, cálculos, base de dados, bundle, lazy loading e imagens.

---

## Resumo executivo

| Área | Estado antes | Estado depois |
|------|--------------|---------------|
| Re-renders em listas | Inline renderers, sem `memo` | `React.memo` em 8 list items + `TransactionSectionList` |
| SectionList (movimentos) | Sem tuning | `initialNumToRender`, `windowSize`, `removeClippedSubviews` |
| Listas não virtualizadas | ScrollView + `.map()` em contas | `FlatList` em contas |
| Modais pesados | Sempre montados | `DeferredMount` + import dinâmico |
| Queries | Fan-out de `useTransactions('all')` | `enabled` condicional em Análises |
| Foreground sync | `invalidateAll` em cada `active` | Throttle 30s + refetch stale leve |
| Imagens | `Image` RN sem cache | `expo-image` com `memory-disk` |
| Bundle inicial | Modais OCR no critical path | `LazyAddTransactionModal`, `LazyQuickExpenseSheet` |

---

## 1. Re-renders desnecessários

### Problemas encontrados

- **`SectionList` em movimentos** usava `renderItem` e `renderSectionHeader` inline — novas referências de função a cada render, forçando re-render de todas as linhas.
- **8 componentes de lista** sem `React.memo`: `SwipeableTransactionListItem`, `TransactionListItem`, `AccountListItem`, `GoalListItem`, `WarrantyListItem`, `InventoryListItem`, `SwipeableAssetRow`.
- **Callbacks instáveis** (`handleDelete`) recriados a cada render no ecrã de movimentos.
- **Modais e sheets** (`AddTransactionModal`, 705 linhas) montados com `visible={false}` — hooks e subárvore OCR inicializavam mesmo fechados.

### Correções aplicadas

| Ficheiro | Alteração |
|----------|-----------|
| `components/movements/TransactionSectionList.tsx` | Novo componente com `memo`, `useCallback` para renderers, mapa de nomes de grupos |
| `components/movements/SwipeableTransactionListItem.tsx` | `React.memo` |
| `components/movements/TransactionListItem.tsx` | `React.memo` |
| `components/accounts/AccountListItem.tsx` | `React.memo` |
| `components/assets/*ListItem.tsx` | `React.memo` em goals, warranties, inventory |
| `components/assets/SwipeableAssetRow.tsx` | `React.memo` |
| `components/ui/DeferredMount.tsx` | Montagem condicional de modais/sheets |
| `app/(tabs)/movimentos.tsx`, `index.tsx`, `contas.tsx` | `DeferredMount` + callbacks estáveis |

---

## 2. Memoização

### Já existente (mantido)

- ~40 ficheiros com `useMemo` (agrupamento de transações, insights, formulários)
- ~25 ficheiros com `useCallback` (auth context, sheets, receipt flow)
- `AnalysisIconMark`, `TabBarAnalisesIcon` já memoizados

### Adicionado nesta auditoria

- Memoização sistemática de **list items** (ver secção 1)
- **`TransactionSectionList`**: `MonthSummaryHeader`, `SectionHeader`, `TransactionRow` memoizados
- **`useAnalyticsInsights`**: snapshot vazio tipado quando `enabled: false`

---

## 3. Otimização de FlatList / SectionList

### Movimentos (`SectionList`)

Única lista virtualizada da app. Agora com:

```tsx
initialNumToRender={12}
maxToRenderPerBatch={8}
windowSize={7}
removeClippedSubviews
```

Extraído para `TransactionSectionList` com renderers estáveis.

### Contas (`FlatList`)

Substituído `ScrollView` + `.map()` por `FlatList` com:

```tsx
initialNumToRender={8}
maxToRenderPerBatch={6}
windowSize={5}
removeClippedSubviews
```

### Pendente (não alterado — risco/escopo)

| Ecrã | Motivo |
|------|--------|
| Ativos (goals, warranties, inventory) | Secções compostas com swipe + empty states; refactor maior |
| `AccountDetailSheet` | Lista dentro de bottom sheet; requer `FlatList` aninhada |
| `SpendingHeatmap` | Grid fixo ~30–42 células; impacto baixo |
| `SearchableSelect` | Listas curtas em modais |

**Recomendação futura:** avaliar `@shopify/flash-list` para histórico de movimentos com >500 itens.

---

## 4. Árvores de componentes grandes

### Ficheiros monolíticos identificados

| Linhas | Ficheiro | Risco |
|--------|----------|-------|
| 882 | `app/onboarding.tsx` | 9 ScrollViews, wizard monolítico |
| 820 | `components/assets/CreditFormModal.tsx` | 22+ `useState` |
| 705 | `components/movements/AddTransactionModal.tsx` | OCR + formulário + modais aninhados |

### Mitigação aplicada

- **Lazy load** de `AddTransactionModal` e `QuickExpenseSheet` via `import()` dinâmico
- **DeferredMount** evita montar modais até primeira abertura

### Pendente

- Dividir `onboarding.tsx` e `CreditFormModal.tsx` em sub-componentes por passo/secção
- `newArchEnabled: false` em `app.json` — Fabric desligado (decisão de produto, não alterada)

---

## 5. Cálculos dispendiosos

### Problemas

- **`useAnalyticsInsights`** recalculava snapshot completo mesmo na aba Património (sem uso)
- **`computeSpendingByCategory`** corria em todas as abas de Análises
- **15+ subscritores** de `useTransactions('all')` re-executavam `useMemo` em cada invalidação de cache

### Correções

| Local | Alteração |
|-------|-----------|
| `app/(tabs)/analises.tsx` | `needsTransactions` / `needsAnalytics` por aba ativa |
| `hooks/queries/useTransactions.ts` | Parâmetro `options.enabled` |
| `hooks/useAnalyticsInsights.ts` | `options.enabled` + snapshot vazio |
| `analises.tsx` | `periodCategories` só calculado na aba Gastos |

### Mantido (cache React Query deduplica rede)

Subscritores múltiplos de `useTransactions('all')` na Home, intelligence hooks, etc. — a rede é deduplicada; o custo restante é recomputação local em `useMemo`, aceitável com `staleTime: 2min`.

---

## 6. Chamadas à base de dados

### Arquitetura

- **Supabase** (remoto) — sem SQLite local
- **expo-secure-store** — prefs, auth, flags
- **React Query** — `staleTime: 2min`, `gcTime: 30min`, `retry: 2`

### Problemas

- **`RemoteDataSyncEffect`**: `invalidateAllRemoteData()` em **cada** transição para `AppState.active` → tempestade de refetch ao alternar apps rapidamente
- Realtime Supabase já adiado 1.5s após login (mantido)

### Correção

```tsx
// Foreground < 30s → refetch apenas queries stale activas
queryClient.refetchQueries({ stale: true, type: 'active' });

// Foreground ≥ 30s → invalidação completa
invalidateAllRemoteData(queryClient);
```

Ficheiro: `components/app/RemoteDataSyncEffect.tsx`

---

## 7. Bundle size

### Dependência adicionada

- `expo-image@~56.0.6` — cache nativo; impacto no bundle nativo compensado por menos pressão de memória em runtime

### Redução de parse inicial (JS)

| Módulo | Técnica |
|--------|---------|
| `AddTransactionModal` (~705 linhas) | `LazyAddTransactionModal` — `import()` no primeiro `visible` |
| `QuickExpenseSheet` (~426 linhas) | `LazyQuickExpenseSheet` — idem |

### Não alterado

- Sem `React.lazy` em rotas expo-router (ganho marginal vs complexidade de Suspense)
- `jpeg-js`, `expo-ocr-kit` permanecem no bundle (necessários ao fluxo de talão)

---

## 8. Lazy loading

### Implementado

| Padrão | Onde |
|--------|------|
| `DeferredMount` | Modais/sheets em Home, Movimentos, Contas |
| `import()` dinâmico | AddTransactionModal, QuickExpenseSheet |
| `import()` existente | `realtime-sync.ts` (1.5s delay) |
| Queries `enabled: false` | Análises por aba |

### Pendente

- Tab screens permanecem montadas (comportamento padrão React Navigation)
- Conteúdo condicional por aba em Análises/Ativos já usa `tab === 'x' ? ... : null`

---

## 9. Otimização de imagens

### Antes

- `Image` do React Native em 5 componentes
- Sem cache em disco, sem `recyclingKey`, URIs `file://` de talões re-decodificadas

### Depois

Novo `components/ui/CachedImage.tsx`:

```tsx
<Image
  source={{ uri }}
  cachePolicy="memory-disk"
  recyclingKey={uri}
  transition={120}
/>
```

### Ficheiros migrados

| Ficheiro | Uso |
|----------|-----|
| `ReceiptPreview.tsx` | Miniatura/hero de talão |
| `ReceiptImageViewer.tsx` | Visualização fullscreen |
| `ReceiptDigitizePreview.tsx` | Comparação original/digitalizado |
| `OnboardingIllustration.tsx` | Assets estáticos (`CachedStaticImage`) |
| `TabBarAnalisesIcon.tsx` | Ícone PNG da tab bar |

---

## 10. Métricas de referência (estimativas)

| Cenário | Impacto esperado |
|---------|------------------|
| Scroll em 200+ movimentos | Menos jank (virtualização tunada + memo) |
| Abrir Home (cold) | −~705 linhas de parse até primeiro "+" |
| Alternar apps <30s | −N refetches Supabase (só stale activas) |
| Aba Análises → Resumo | Sem fetch `transactions/all` dedicado no ecrã |
| Reabrir talão OCR | Cache disco `expo-image` |

*Valores dependem do dispositivo e volume de dados; validar com React DevTools Profiler e Flipper.*

---

## 11. Checklist de verificação manual

- [ ] Scroll fluido em Movimentos com histórico longo
- [ ] Swipe editar/eliminar continua funcional
- [ ] Abrir modal de movimento / despesa rápida na Home
- [ ] Alternar abas em Análises (Resumo, Gastos, Dívida, Património)
- [ ] Lista de contas com pull-to-refresh
- [ ] Pré-visualização e zoom de talão
- [ ] Voltar à app após <30s e após >30s em background

---

## 12. Próximos passos recomendados

1. **FlashList** no histórico de movimentos se utilizadores reportarem lag com >500 itens
2. **FlatList** nas secções de Ativos quando inventário/garantias crescer
3. **Dividir** `onboarding.tsx` e `CreditFormModal.tsx`
4. **Profiler** em `useCentFlowIntelligence` + Home para consolidar subscritores de transações
5. **Avaliar** `newArchEnabled: true` num build de teste iOS

---

## Ficheiros alterados nesta auditoria

```
app/(tabs)/analises.tsx
app/(tabs)/contas.tsx
app/(tabs)/index.tsx
app/(tabs)/movimentos.tsx
components/accounts/AccountListItem.tsx
components/app/RemoteDataSyncEffect.tsx
components/assets/GoalListItem.tsx
components/assets/InventoryListItem.tsx
components/assets/SwipeableAssetRow.tsx
components/assets/WarrantyListItem.tsx
components/layout/TabBarAnalisesIcon.tsx
components/movements/LazyAddTransactionModal.tsx
components/movements/LazyQuickExpenseSheet.tsx
components/movements/ReceiptDigitizePreview.tsx
components/movements/ReceiptImageViewer.tsx
components/movements/ReceiptPreview.tsx
components/movements/SwipeableTransactionListItem.tsx
components/movements/TransactionListItem.tsx
components/movements/TransactionSectionList.tsx
components/movements/index.ts
components/onboarding/OnboardingIllustration.tsx
components/ui/CachedImage.tsx
components/ui/DeferredMount.tsx
components/ui/index.ts
hooks/queries/useTransactions.ts
hooks/useAnalyticsInsights.ts
package.json
package-lock.json
```

---

*Gerado automaticamente durante auditoria de performance CentFlow.*
