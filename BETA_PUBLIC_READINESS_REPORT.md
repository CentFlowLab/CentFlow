# Beta Public Readiness Report — CentFlow

> Auditoria completa para utilizadores reais — Julho 2026  
> **Sem commit · sem push · sem OTA · sem build EAS**

---

## 1. Resumo executivo

A aplicação está **funcionalmente madura** para uma beta controlada: motor financeiro unificado, 481 testes verdes, TypeScript verde, e a maioria dos ecrãs com loading/erro/vazio. A auditoria identificou **4 bugs UX corrigidos** neste sprint e **vários bloqueadores de release legal/infra** ainda pendentes.

**Recomendação: BETA PÚBLICA CONTROLADA** (cohort limitado, com ressalvas documentadas).

---

## 2. Bugs encontrados

| ID | Severidade | Descrição | Ecrã/fluxo |
|----|------------|-----------|------------|
| B1 | Alta | Deep link `/(tabs)/creditos?action=new-credit` não abria formulário | Créditos / Quick Add |
| B2 | Média | Mensagem de erro de créditos usava copy de “Ativos” | Créditos |
| B3 | Média | `FeatureAreaGate` — botão “Activar” falhava sem feedback | Créditos, Ativos, etc. |
| B4 | Média | Assistente mostrava `error.message` técnico ao utilizador | Assistant |
| B5 | Média | Sem modo offline / banner de conectividade | Global |
| B6 | Release | Política de privacidade e termos “em breve” | Settings/Privacy |
| B7 | Release | Eliminação de conta não implementada | Settings/Privacy |
| B8 | Baixa | `AnalysisDebtTab` — loading apenas texto | Análises |
| B9 | Baixa | Componente exportado como `PrecosScreen` (legado) | Créditos |
| B10 | Info | Doctor/Sentry/logs usam “Erro desconhecido” internamente — não exposto na UI principal | Dev |

---

## 3. Bugs corrigidos (neste sprint)

| ID | Correcção | Ficheiros |
|----|-----------|-----------|
| B1 | `useEffect` trata `action=new-credit` e abre `CreditFormModal` | `app/(tabs)/creditos.tsx` |
| B2 | Novo contexto `credits` em `ScreenErrorContext` + copy dedicada | `lib/api/errors.ts`, `creditos.tsx` |
| B3 | `activateFeature` devolve `boolean`; toast em falha | `hooks/useFeatureAreas.ts`, `FeatureAreaGate.tsx`, `perfil.tsx` |
| B4 | Erros do assistente via `getScreenErrorContent` | `hooks/useFinancialAssistantChat.ts` |

**Validação pós-correcção:**
```
npm test     → 481/481 pass
npx tsc      → 0 erros
```

---

## 4. Fluxos auditados

| Fluxo | Loading | Erro | Sucesso | Cancelar | Voltar | Mensagens | Estado |
|-------|---------|------|---------|----------|--------|-----------|--------|
| Onboarding | ✅ | ⚠️ | ✅ | ✅ | N/A | ✅ | ⚠️ sem ErrorState global |
| Login | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| Registo | ✅ | ✅ | ✅ | — | — | ✅ | ✅ |
| Recuperar password | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Home | ✅ Skeleton | ✅ | ✅ | ✅ modais | tabs | ✅ | ✅ |
| Movimentos lista | ✅ | ✅ | ✅ | ✅ | tabs | ✅ | ✅ |
| Novo movimento | ✅ modal | ✅ toast | ✅ | ✅ sheet | ✅ | ✅ | ✅ |
| Editar movimento | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OCR / talão | ✅ | ✅ humanizado | ✅ | ✅ | ✅ | ✅ | ✅ |
| Créditos | ✅ | ✅ | ✅ | ✅ | tabs | ✅ | ✅ pós-fix |
| Cartões | ✅ | ✅ | ✅ | ✅ | tabs | ✅ | ✅ |
| Objetivos | ✅ | ✅ | ✅ | ✅ | tabs | ✅ | ✅ |
| Ativos | ✅ | ✅ | ✅ | ✅ | tabs | ✅ | ✅ |
| Análises | ✅ | ✅ | ✅ | ✅ | tabs | ✅ | ✅ |
| Perfil | ✅ | ✅ | ✅ | — | menu | ✅ | ✅ |
| Definições | ✅ parcial | ✅ parcial | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Doctor | N/A | logs | ✅ | — | ✅ | ✅ dev | ✅ beta only |
| Assistente | ✅ | ✅ pós-fix | ✅ | ✅ | ✅ | ✅ | ✅ |
| Calendário | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Open Banking | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Premium | N/A | — | — | — | — | — | 🔲 só UI onboarding |

---

## 5. UX issues (não bloqueadores)

- Home sem empty state global quando utilizador novo (secções omitidas) — aceitável com onboarding.
- Análises → Dívida: loading minimalista (texto).
- Settings privacidade: links legais placeholder.
- Feature areas bloqueadas até activação manual — intencional, agora com feedback.
- Teclado: `KeyboardAvoidingView` no assistente; modais usam sheets — sem issues críticos detectados em código.
- Acessibilidade: `accessibilityLabel` presente em acções principais; auditoria VoiceOver/TalkBack não executada neste sprint.

---

## 6. Performance

**Medição runtime:** não executada neste sprint (sem dispositivo ligado ao profiler).

**Auditoria estática:**

| Área | Observação | Risco |
|------|------------|-------|
| Home | `useHomeScreenData` + `useFinancialEngineSnapshot` + intelligence | Médio — múltiplas queries |
| Movimentos | FlashList + flatten sections | Baixo — optimizado |
| Análises | `useAnalysisData` + engine snapshot | Médio |
| Motor | baseline 10k tx ~242ms | Baixo |
| OCR | edge function + upload | Alto latência esperada |

**Baseline documentada (motor):** `calculateFinancialState` ~242ms / 10k transações.

Recomendação pós-beta: React Query Devtools + Flipper para contar renders por tab switch.

---

## 7. Segurança

| Item | Estado |
|------|--------|
| Logout | ✅ `settings/security` + perfil |
| Face ID / biometria | ✅ `expo-local-authentication`, `BiometricGate` |
| Password reset | ✅ forgot + reset-password flow |
| Sessão expirada | ✅ mensagem no login + `sessionSecurity` |
| Secure Store | ✅ tokens auth |
| Doctor | ✅ limitado dev/beta, sem PII nos logs |
| Sentry | ✅ scrubbing em `lib/sentry/privacy` |
| Open Banking | ✅ OAuth browser, tokens não locais (copy privacy) |
| Google Login | ✅ callback + erros humanizados |
| Apple Login | 🔲 não identificado no código auditado |

---

## 8. Estados vazios

| Ecrã | Loading | Erro | Sem dados | Primeira utilização |
|------|---------|------|-----------|---------------------|
| Home | ✅ | ✅ | ⚠️ parcial | onboarding guia |
| Movimentos | ✅ | ✅ | ✅ contextual | ✅ |
| Análises | ✅ | ✅ | ✅ insights | ✅ |
| Créditos | ✅ | ✅ | ✅ | ✅ |
| Ativos | ✅ | ✅ | ✅ por tab | ✅ personalizado |
| Perfil | ✅ | ✅ | N/A | N/A |
| Calendar | ✅ | ✅ | hint | ✅ |
| Assistant | ✅ | ✅ | FAQ | ✅ |
| Bank connections | ✅ | ✅ | ✅ texto | ✅ |

**Gap principal:** banner offline universal (Fase 6).

---

## 9. Loading

| Padrão | Estado |
|--------|--------|
| Skeletons principais | ✅ Home, Movimentos, Análises, Ativos, Perfil |
| Spinner pontual | ✅ Créditos, Settings, Calendar, Assistant |
| Loading infinito | ❌ não detectado em código |
| Flash branco | Mitigado por `AuthLoadingScreen` + skeletons |
| Refetch indicator | ✅ Home, Análises, Ativos |

---

## 10. Navegação

| Item | Estado |
|------|--------|
| Back stack | ✅ Expo Router Stack |
| Bottom tabs | ✅ 5 abas (perfil oculta na bar) |
| Deep links | ✅ `centflow://`, quick-expense, email links |
| Modais / sheets | ✅ DraggableBottomSheet pattern |
| 404 | ✅ `+not-found` |
| Typed routes | ⚠️ mitigado com `appHref()` |
| Utilizador preso | ❌ não identificado |

---

## 11. Riscos restantes

1. **Sem UX offline explícita** — utilizador sem rede vê erros, não orientação.
2. **Documentação legal incompleta** — política/termos placeholder.
3. **Eliminação de conta** não disponível (GDPR expectation).
4. **Cobertura branches 83,94%** — domínio financeiro sólido, global abaixo meta.
5. **Apple Sign-In** — verificar requisito App Store se login social iOS.
6. **Performance runtime** — não medida neste sprint.

---

## 12. Bloqueadores de beta pública ampla

| Bloqueador | Tipo | Acção |
|------------|------|-------|
| Política de privacidade publicada | Legal | Publicar URL + link na app |
| Termos de utilização | Legal | Publicar URL |
| Eliminar conta (ou processo manual documentado) | GDPR | Backend + UI |
| Banner offline ou copy unificada “sem rede” | UX | NetInfo + componente |
| Apple Sign-In (se Google no iOS) | App Store | Avaliar guideline 4.8 |

**Não bloqueadores para beta controlada (cohort < 100):** Doctor, cobertura branches global, lint global 173 issues.

---

## 13. Melhorias pós-beta

- Skeleton em `AnalysisDebtTab`
- Banner offline global
- Persistência React Query offline-first
- Medições Flipper/Reactotron por ecrã
- VoiceOver/TalkBack pass completo
- Página Premium/subscrição (se monetização)
- Regenerar typed routes Expo
- Reduzir queries duplicadas no snapshot central

---

## 14. Scores atualizados

| Dimensão | Antes | Depois | Notas |
|----------|-------|--------|-------|
| **Financial Core** | 92/100 | **92/100** | Inalterado — fora de âmbito |
| **UX** | 72/100 | **82/100** | Fixes deep link, erros, feedback |
| **Performance** | 75/100 | **75/100** | Sem medição runtime nova |
| **Security** | 80/100 | **82/100** | Sessão/erros assistente |
| **Stability** | 88/100 | **90/100** | 481 testes, TS verde |
| **Beta Readiness** | 78/100 | **84/100** | Pronto para cohort controlado |

---

## 15. Recomendação

### **BETA PÚBLICA CONTROLADA**

**Justificação:**
- App utilizável end-to-end com estados de erro/vazio na maioria dos fluxos
- Bugs críticos de navegação e feedback corrigidos
- Motor financeiro e testes sólidos

**Não recomendado ainda:**
- **PRONTO PARA BETA PÚBLICA** — faltam política/termos, eliminar conta, offline UX
- **BLOQUEAR BETA** — qualidade técnica suficiente para testers invitados

---

## 16. Release checklist

| Item | Estado |
|------|--------|
| Splash | ✅ `expo-splash-screen` configurado |
| App Icon | ✅ `assets/images/icon.png` |
| OTA | ✅ EAS Update preview + production scripts |
| Versionamento | ✅ `1.0.0`, `runtimeVersion: appVersion` |
| Crash Reporting | ✅ Sentry v8 |
| Doctor | ✅ beta/dev diagnostics |
| Analytics | ✅ service provider-agnostic |
| Privacy page | 🔲 placeholder |
| Terms | 🔲 em falta |
| Open Banking | ✅ GoCardless + settings |
| Google Login | ✅ |
| Apple Login | 🔲 não confirmado |
| Emails | ✅ edge functions |
| Deep Links | ✅ scheme `centflow` |
| Force Update | ✅ `ForceUpdateScreen` / version guard |
| Permissões | ✅ câmara, fotos, Face ID declarados |
| Build Android | ✅ EAS scripts |
| Build iOS | ✅ EAS scripts |

---

## 17. Ficheiros criados

- `docs/beta-screen-audit.md`
- `BETA_PUBLIC_READINESS_REPORT.md`

## 18. Ficheiros modificados

- `app/(tabs)/creditos.tsx` — deep link + contexto erro + rename componente
- `lib/api/errors.ts` — contexto `credits`
- `hooks/useFeatureAreas.ts` — `activateFeature` retorna boolean
- `components/features/FeatureAreaGate.tsx` — toast em falha
- `app/(tabs)/perfil.tsx` — activação com feedback correcto
- `hooks/useFinancialAssistantChat.ts` — erros humanizados

---

## Confirmação explícita

- ✅ **Sem commit**
- ✅ **Sem push**
- ✅ **Sem OTA**
- ✅ **Sem build EAS**

---

## Comandos executados

```bash
npm test          # 481/481 pass
npx tsc --noEmit  # 0 erros
```

Auditoria de código + inventário de 38 rotas (ver `docs/beta-screen-audit.md`).
