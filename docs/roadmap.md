# Roadmap CentFlow

## Posicionamento

**Arma principal:** OCR + vida financeira automática — fotografar → ler → movimento → garantia → análise.

**Promessa:** *A tua vida financeira num só lugar* — mas o diferenciador é a digitalização inteligente, não a quantidade de tabs.

---

## v1.0 — Core (actual)

- [x] Movimentos e categorias
- [x] OCR de talões / faturas
- [x] Garantias e inventário (Ativos)
- [x] Subscrições + deteção automática
- [x] Objetivos financeiros
- [x] Créditos e simulador
- [x] Onboarding premium com activação de áreas
- [x] Log de diagnóstico (beta)

## v1.1 — Inteligência

- [x] **CentFlow Score** (0–100) — saúde financeira agregada
- [x] Home como **assistente** (“o que fazer hoje”) em vez de dashboard passivo
- [x] **Centro de acções** — atalhos contextuais (despesa, digitalizar, objetivo, subscrição)
- [x] Insights e alertas (renovações, objetivos, poupança)
- [x] Gamificação leve (níveis financeiros, sem pontos infantis)

## v1.2 — Escala

- [x] Relatórios PDF avançados (CentFlow Score + subscrições)
- [x] Exportação completa de dados (JSON v2)
- [x] Widgets iOS / Android (snapshot + docs; UI nativa pendente)
- [x] `lib/domain/financial/` — domínio financeiro unificado

## v1.3 — Performance

- [ ] FlashList em listas grandes (movimentos, inventário)
- [ ] Audit de re-renders em ecrãs >400 linhas
- [ ] Lazy load de tabs secundárias

---

## O que NÃO entra no v1.0

- Features “faz tudo” sem ligação ao core OCR
- Duplicação de lógica financeira em `data/`, `analytics/` e ecrãs
- Artefactos de build no repositório (`.expo-export-test/`, `ci-artifacts/`)
