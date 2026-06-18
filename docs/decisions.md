# Decisões de arquitectura (ADR)

Registo curto de decisões para evitar regressões e confusão.

---

## ADR-001 — SecureStore para dados sensíveis

**Decisão:** tokens, onboarding, preferências e pending subscriptions usam `expo-secure-store`, não AsyncStorage.

**Motivo:** app financeira; AsyncStorage não é encriptado.

**Estado:** implementado em `lib/auth/`, `lib/onboarding/`, `lib/preferences/`, `lib/supabase/client.ts`.

---

## ADR-002 — Supabase como fonte de verdade remota

**Decisão:** movimentos, activos e liabilities sincronizam com Supabase; React Query gere cache.

**Motivo:** multi-dispositivo, backup, RLS.

---

## ADR-003 — OCR no cliente (expo-ocr-kit + jpeg-js)

**Decisão:** preprocessamento local (`jpeg-js` para contraste/binarização) + OCR nativo; script Python em `docs/backend/` só como referência server-side.

**Motivo:** latência, privacidade, funciona offline parcial.

**Nota:** `jpeg-js` está activamente usado em `lib/receipt/receipt-image-enhance.ts`.

---

## ADR-004 — Feature gates pós-onboarding

**Decisão:** áreas não seleccionadas no onboarding ficam bloqueadas com UI “Disponível → Activar” via `isFeatureActive()` + `FeatureAreaGate`.

**Motivo:** foco de produto; evitar “app que faz tudo” de entrada.

---

## ADR-005 — Diagnóstico só em beta/dev

**Decisão:** log global (`lib/diagnostics/`) activo apenas quando `EXPO_PUBLIC_APP_VARIANT` é `beta` ou `development`.

**Motivo:** fase de testes; não expor FAB de log em produção.

---

## ADR-006 — expo-video só no tab Análises

**Decisão:** manter `expo-video` para ícone animado da tab Análises (`TabBarAnalisesIcon`); intro em vídeo removida.

**Motivo:** reduzir superfície; manter diferenciação visual num ponto.

---

## ADR-007 — Documentação em `docs/`

**Estrutura:**

| Ficheiro | Conteúdo |
|----------|----------|
| `architecture.md` | mapa técnico |
| `onboarding.md` | copy e fluxo de onboarding |
| `roadmap.md` | versões e prioridades |
| `decisions.md` | ADRs (este ficheiro) |
| `build.md` | EAS Build + OTA |
| `beta.md` | testes beta |
| `backend/` | referências server-side (OCR Python) |

---

## Pendente — ADR-008 Domínio financeiro unificado

**Proposta:** `lib/domain/financial/` com sub-módulos movements, subscriptions, assets, goals, receipts.

**Estado:** proposto; não implementado (refactor grande, planeado v1.2).
