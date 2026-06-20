# Objetivos — Risco de double-count e proposta arquitetural

**Data:** 2026-06-20  
**Âmbito:** P2 — análise antes de alterar código  
**Estado:** Proposta para decisão de produto

---

## Contexto

O património líquido (PL) da CentFlow é calculado em `lib/domain/net-worth.service.ts` e composto em `lib/domain/dashboard.compose.ts`:

```
PL = saldo_movimentos_ocorridos + inventário + investimentos + sum(goal.current) − créditos
```

Os objetivos **não** sincronizam automaticamente com movimentos. O utilizador edita `goal.current` manualmente em `GoalFormModal.tsx`.

---

## O problema de double-count

### Cenário típico

1. Utilizador recebe 500€ de salário → regista movimento de receita (+500 no saldo de movimentos).
2. Utilizador marca 500€ no objetivo «Fundo de emergência» → `goal.current = 500`.
3. O PL soma **ambos**: +500 (cash) + +500 (poupança em objetivos) = **+1000€ inflacionados**.

### Porque acontece

O modelo actual trata `goal.current` como **ativo adicional** (`savings` no breakdown), não como subconjunto do cash já contabilizado nos movimentos.

### Inconsistências secundárias

| Local | Comportamento |
|-------|---------------|
| `sumGoalSavings` | `Math.max(0, current)` — ignora negativos |
| `getGoalsAggregate` | Soma `current` sem clamp — UI pode mostrar total negativo |
| Breakdown PL | Bucket «Poupanças» mistura alocação virtual com poupança real |

### Testes existentes

- `net-worth.service.test.ts` — só valida `sumGoalSavings` com negativos
- **Nenhum teste** de cenário movimento + objetivo duplicado

---

## Opção A — Objetivos como poupança real

### Definição

`goal.current` representa dinheiro **efectivamente retirado** do saldo disponível e guardado para a meta. O PL inclui esse montante como ativo distinto **e** o saldo de movimentos deve reflectir a transferência.

### Implementação necessária

1. Ao aumentar `goal.current`, criar movimento automático `expense` (transferência interna) ou `income` negativo no bucket cash.
2. Ao diminuir `goal.current`, movimento inverso.
3. Categoria dedicada: `goal_transfer` (excluída de despesas de lifestyle nos relatórios).
4. Migração: recalcular `goal.current` a partir de movimentos tagueados ou pedir reconciliação única.

### Prós

- PL matematicamente correcto sem ambiguidade
- Auditoria completa: cada euro rastreável via movimentos
- Alinha com apps tipo YNAB / envelope budgeting

### Contras

- Complexidade alta: sync bidireccional movimento ↔ objetivo
- Risco de loops em edições manuais
- Migração dolorosa para utilizadores existentes com `current` manual
- UX mais pesada (cada contribuição = movimento)

---

## Opção B — Objetivos como alocação virtual (recomendada)

### Definição

`goal.current` é **subconjunto** do saldo de movimentos — uma etiqueta de «quanto do meu cash está mentalmente reservado». O PL **não** soma `goal.current` como ativo separado.

### Fórmula proposta

```
cash_disponível = saldo_movimentos_ocorridos
cash_alocado = min(sum(goal.current), cash_disponível)   // clamp anti-negativo
cash_livre = cash_disponível − cash_alocado

PL = cash_disponível + inventário + investimentos − créditos
     (goals NÃO entram como linha separada no total)

Breakdown UI:
  - Contas (cash total)
  - └ Alocado em objetivos (informativo, sub-linha)
  - └ Disponível (informativo)
```

### Implementação necessária

1. Remover `savings: goalSavings` de `calculateNetWorth` no path de produção **ou** passar `savings: 0` e expor alocação só no breakdown UI.
2. Novo helper `getGoalAllocationSummary(cash, goals)` para cards de objetivos e Home.
3. Validação em `GoalFormModal`: avisar se `current > cash_disponível` (soft warning, não bloquear).
4. Documentação in-app: «O valor no objetivo é uma reserva do teu saldo, não dinheiro extra.»
5. Teste de regressão: movimento 500€ + goal 500€ → PL = 500€, não 1000€.

### Prós

- Corrige double-count sem sync automático de movimentos
- Mantém UX simples (editar `current` manualmente)
- Diff pequeno e previsível
- Coerente com mental accounting (como Revolut Vaults / N26 Spaces conceptualmente)

### Contras

- Utilizador pode definir `goal.current` > saldo real → inconsistência de alocação (mitigável com warning)
- Histórico de contribuições não auditável por movimento (opcional: link manual futuro)
- Requer comunicação clara na UI para não parecer «dinheiro duplicado»

---

## Comparação directa

| Critério | A — Poupança real | B — Alocação virtual |
|----------|-------------------|----------------------|
| Correctness PL | Alta (com sync) | Alta (sem double-count) |
| Complexidade dev | Alta | Baixa-média |
| Migração | Difícil | Simples |
| UX utilizador | Mais fricção | Mantém fluxo actual |
| Auditabilidade | Total via movimentos | Parcial (manual) |
| Risco de bugs | Sync loops | Clamp/warnings |

---

## Recomendação definitiva

**Adoptar Opção B (alocação virtual)** como modelo de produção.

### Razões

1. O produto actual já funciona como alocação mental — os utilizadores editam `current` sem criar movimentos.
2. A Opção A exigiria reescrever o fluxo de objetivos e migrar dados; inviável antes de produção pública sem atraso significativo.
3. O bug actual (double-count) é **conceptual**, não de precisão decimal — B resolve na raiz com mudança mínima na fórmula.
4. A Opção A pode ser evolução futura (v2 «contribuição com movimento») sem contradizer B se `goal.current` passar a ser derivado.

### Plano de implementação (fase seguinte — não aplicado neste PR)

| Passo | Acção |
|-------|-------|
| 1 | `calculateNetWorth`: remover `savings` do total de ativos |
| 2 | `NetWorthHeroCard` / breakdown: mostrar «Alocado em objetivos» como sub-linha |
| 3 | `GoalFormModal`: warning se `current > cash disponível` |
| 4 | Teste: `movimento 1000 + goal 500 → PL 1000, alocado 500, livre 500` |
| 5 | Comunicar em onboarding/help |

### O que NÃO fazer agora

- Não alterar schema Supabase de goals
- Não criar movimentos automáticos silenciosos
- Não misturar A e B (somar goals E deduzir do cash — double penalty)

---

## Decisão pendente do produto

Confirmar com stakeholders:

1. Aceitar que `goal.current` é reserva virtual (B)?
2. Mostrar «disponível vs alocado» na Home?
3. Permitir `goal.current > saldo` com warning ou hard cap?

**Até confirmação, o código de produção mantém o comportamento actual (com double-count documentado).**
