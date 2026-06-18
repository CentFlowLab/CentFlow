# Auditoria de Polimento — CentFlow

Data: 17 Jun 2026  
Âmbito: UX, consistência e valor percebido (sem novas funcionalidades grandes)

---

## Resumo executivo

A fase de polimento transformou a experiência existente numa app mais madura: menos ruído visual, Home com contexto real, Score explicado, Perfil mais completo, empty states com CTAs e OCR mais visível. Nenhuma feature grande foi adicionada (sem Open Banking, Premium Plus, IA nova).

---

## Problemas encontrados

### 1. Poluição visual / debug
| Problema | Impacto |
|----------|---------|
| FAB vermelho **LOG** global (`zIndex: 9998`) | Competia com o botão + e parecia funcionalidade principal |
| Toasts automáticos de erro em overlay | Distraíam o utilizador durante testes |

### 2. Hierarquia da Home
| Problema | Impacto |
|----------|---------|
| Saudação duplicada (header + assistente) | Ruído cognitivo |
| Score e assistente antes do património | Informação financeira não era prioridade #1 |
| Score sem explicação | Utilizador não percebia o valor 0–100 |

### 3. Home pouco contextual
| Problema | Impacto |
|----------|---------|
| Plano de hoje com fallback genérico | Pouco «vivo» sem dados reais |
| Sem garantias a expirar / comparação semanal | Oportunidades de contexto perdidas |

### 4. Perfil vazio
| Problema | Impacto |
|----------|---------|
| Sem «membro desde», plano, dados pessoais | Parecia ecrã incompleto |
| Estatísticas não navegáveis | Dados mortos, sem utilidade |

### 5. Empty states
| Problema | Impacto |
|----------|---------|
| Objetivos/garantias sem botão primário | Só texto + «saber mais» |
| Home movimentos sem CTA OCR | Funcionalidade diferenciadora escondida |

### 6. Espaço morto
| Problema | Impacto |
|----------|---------|
| Margens `2xl` excessivas no Perfil | Menos informação visível |
| Empty states com padding `4xl` | Muito scroll em ecrãs vazios |

### 7. Produção
| Problema | Impacto |
|----------|---------|
| LOG visível em beta/dev | Utilizador final em beta via LiveContainer via LOG como produto |

---

## Correções realizadas

### Debug e produção
- **`DiagnosticOverlay`**: removido FAB LOG e toasts; componente retorna `null`. Logs ficam só em **CentFlow Doctor** (`/settings/diagnostics`).
- Doctor continua acessível apenas em variantes `development` / `beta` via menu Perfil → Testes.

### Home
- **Hierarquia**: `NetWorthHeroCard` → `HomeAssistantCard` → `CentFlowScoreCard` → snapshot.
- **Header**: saudação única («Olá, Nome») + data; assistente usa «Plano de hoje» sem repetir «Bom dia».
- **Assistente** (`assistant.ts`): contexto real — subscrições a renovar, gap de objetivo, garantias a expirar, menos despesas na semana; fallback com acções (movimento, OCR, objetivo, subscrição).
- **OCR na Home**: empty património, movimentos recentes e garantias com CTA «Digitalizar talão».
- **`DashboardSkeleton`**: alinhado com nova ordem de secções.

### CentFlow Score
- **`score-explain.ts`**: breakdown por dimensão (poupança, dívida, subscrições, objetivos, estabilidade).
- **`CentFlowScoreCard`**: preview de pontos ganhos + link «Como melhorar».
- **`CentFlowScoreSheet`**: sheet com «Porque tens este valor» e «Como melhorar».

### Perfil
- **Conta**: estado, email, «Desde [data]» (onboarding `completedAt`).
- **Preferências**: moeda/região + link dados pessoais.
- **A tua CentFlow**: plano (Gratuito / Beta / Dev), áreas activas.
- **Estatísticas**: células clicáveis → movimentos, objetivos, subscrições, garantias, créditos.
- **Menu**: Privacidade adicionada; espaçamentos reduzidos.

### Empty states
- **`EmptyState`**: variante `compact` para listas na Home.
- **`GoalsEmptyState` / `WarrantiesEmptyState`**: CTAs primários + OCR em garantias.
- **`assets.config`**: copy de garantias reforça OCR.

### Navegação
- **`ativos.tsx`**: suporte a `?tab=garantias|objetivos|inventario` para links do Perfil.

---

## Ficheiros principais alterados

```
components/diagnostics/DiagnosticOverlay.tsx
components/dashboard/CentFlowScoreCard.tsx
components/dashboard/CentFlowScoreSheet.tsx
components/dashboard/HomeAssistantCard.tsx
components/dashboard/DashboardHeaderLeading.tsx
components/dashboard/DashboardSkeleton.tsx
components/dashboard/NetWorthHeroCard.tsx
components/profile/ProfileHubSections.tsx
components/ui/EmptyState.tsx
components/assets/GoalsEmptyState.tsx
components/assets/WarrantiesEmptyState.tsx
lib/domain/financial/assistant.ts
lib/domain/financial/score-explain.ts
hooks/useCentFlowIntelligence.ts
app/(tabs)/index.tsx
app/(tabs)/perfil.tsx
app/(tabs)/ativos.tsx
```

---

## Validação final (checklist)

| Área | Estado |
|------|--------|
| LOG não visível na UI principal | ✅ |
| Doctor só em dev/beta | ✅ |
| Home prioriza património | ✅ |
| Score explicado | ✅ |
| Perfil com conta + stats | ✅ |
| Empty states com CTA | ✅ (objetivos, garantias, movimentos, créditos/subscrições já tinham) |
| OCR promovido na Home | ✅ |
| Espaços reduzidos (Perfil, empty compact) | ✅ Parcial |

### Pontos a rever manualmente
- [ ] Confirmar OTA recebida no LiveContainer (fechar/reabrir app).
- [ ] Percorrer todos os tabs com conta vazia e com dados.
- [ ] Verificar link `?tab=garantias` no Perfil → Ativos.

---

## Melhorias recomendadas — fase seguinte

1. **Unificar Score e Perfil Financeiro** — dois sistemas paralelos (0–100 vs %) ainda podem confundir; considerar um único modelo ou labels mais distintos.
2. **`created_at` real da conta** — hoje «membro desde» usa data de onboarding; ideal ligar ao Supabase Auth.
3. **Assistente com acção «ver garantias»** — garantir deep link consistente em todos os pontos de entrada.
4. **Animações e micro-interacções** — transições suaves entre sheets já existem; falta consistência em cards pressáveis.
5. **Património empty** — inventário/património no tab Análises pode receber o mesmo tratamento de empty states.
6. **Remover `DiagnosticOverlay` do `_layout`** — hoje retorna `null`; pode ser removido do mount para simplificar árvore.
7. **Testes E2E** — smoke tests para Home reorder e Score sheet.

---

## Objetivo final

A CentFlow deve parecer uma aplicação financeira premium e pronta para uso diário. Esta fase endereçou os maiores sinais de «app em desenvolvimento» (LOG, hierarquia, contexto vazio, Score opaco). A fase seguinte deve focar unificação de modelos e polish fino de animação/copy.
