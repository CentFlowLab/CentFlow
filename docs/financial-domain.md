# Domínio financeiro CentFlow

Fonte única de verdade para cálculos financeiros. Vive em `lib/domain/financial/`.

## Princípios

- **Funções puras** — sem React, Supabase, TanStack Query, I/O ou estado global.
- **Dinheiro em cêntimos** — `addMoney`, `subtractMoney` e `roundMoney` evitam erros de float.
- **Datas consistentes** — mês civil (dia 1 → último dia), movimentos futuros excluídos do «disponível actual».
- **Componentes só renderizam** — ecrãs buscam dados e chamam o domínio; não fazem `reduce` locais de `amount`.

## Estrutura

| Módulo | Responsabilidade |
|--------|------------------|
| `money.ts` | Conversão euros/cêntimos, soma segura, formatação |
| `dates.ts` | Chaves de mês, períodos, ocorrido vs futuro |
| `transactions.ts` | Receitas, despesas, fluxo, agrupamentos |
| `accounts.ts` | Saldo por conta, transferências, contribuições |
| `goals.ts` | Progresso, ritmo, contribuição mensal necessária |
| `liabilities.ts` | Dívidas, rácio dívida/rendimento |
| `netWorth.ts` | Património líquido consolidado |
| `savings.ts` | Taxa de poupança |
| `score.ts` | CentFlow Score + explicação transparente |
| `insights.ts` | Helpers para insights acionáveis |
| `projections.ts` | Projeção de património com movimentos futuros |

## Compatibilidade

Ficheiros legados re-exportam o domínio (não duplicam lógica):

- `lib/accounts/balance.ts`
- `lib/domain/financial-movement.ts`
- `lib/domain/goal.utils.ts`
- `lib/domain/net-worth.service.ts`
- `lib/domain/transaction-date.utils.ts`
- `lib/domain/monthly-budget-movements.ts`

## Regras financeiras assumidas

1. **Receita** aumenta saldo da conta; **despesa** reduz.
2. **Transferência** move valor entre contas; não entra em receitas/despesas.
3. **Contribuição para objetivo** reduz saldo disponível da conta de origem.
4. **Património na Home (modelo simplificado)** usa saldo de movimentos ocorridos; objetivos não duplicam património.
5. **Património consolidado** = contas + poupanças reservadas (objetivos) + inventário − créditos.
6. **Taxa de poupança** = `(rendimento − despesa) / rendimento`; rendimento zero → estado seguro sem divisão.

## Exemplo

```typescript
import {
  getIncomeTotal,
  getExpenseTotal,
  calculateSavingsRate,
  calculateAccountBalance,
} from '@/lib/domain/financial';

const period = { kind: 'month', monthKey: '2026-07', asOf: new Date() };
const income = getIncomeTotal(transactions, period);
const expenses = getExpenseTotal(transactions, period);
const savings = calculateSavingsRate(income, expenses);

const balance = calculateAccountBalance({
  account: { id: 'acc-1', initialBalance: 1000 },
  transactions,
  goalContributions,
});
```

## Adicionar nova métrica

1. Implementar função pura em `lib/domain/financial/` (ou módulo existente).
2. Adicionar testes em `*.test.ts` no mesmo directório.
3. Exportar em `index.ts`.
4. Consumir nos compositors (`analysis.compose.ts`, `dashboard.compose.ts`) ou serviços — **nunca** no JSX com `reduce`.

## Testes

```bash
npm test
npx tsc --noEmit
```

Testes do domínio: `lib/domain/financial/*.test.ts`

## Cartões de crédito (ledger)

Cartão **não é conta corrente** — é passivo (`credits` com `creditType: 'card'`).

| Operação | Tipo | Efeito |
|----------|------|--------|
| Compra no cartão | `expense` + `credit_id` | +dívida, conta como despesa, **não** debita conta |
| Pagar cartão | `credit_payment` + `account_id` + `credit_id` | −conta, −dívida, **não** é despesa |

Funções: `lib/domain/financial/credit-cards.ts`

Sincronização de `outstandingBalance`: `lib/credit/credit-ledger-sync.ts` (após create/delete de movimentos ligados).


### Modelo de dados

Não existe tabela `account_transfers`. Transferências internas são uma linha em `public.transactions`:

| Campo | Papel |
|-------|-------|
| `type = 'transfer'` | Marca transferência interna |
| `account_id` | Conta de origem |
| `destination_account_id` | Conta de destino |
| `amount` | Valor movido (> 0) |

Garantias no Postgres (migration `20240629000000_transfer_constraints.sql`):

- RLS activo em `transactions` — policies `*_own` por `auth.uid() = user_id`
- `CHECK (amount > 0)`
- `CHECK` de transferência: origem e destino obrigatórios e distintos

### Saldos derivados (sem `current_balance`)

Saldos de conta **não são persistidos**. Calculam-se em runtime:

```
saldo = initial_balance + movimentos + transferências − contribuições objetivo
```

Implementação: `calculateAccountBalance()` em `accounts.ts`.

**Criar transferência** → insert único em `transactions` → saldos recalculados na próxima query.

**Eliminar transferência** → delete da linha → saldos revertem automaticamente (mesma fórmula, sem a linha).

Não há rollback manual de `current_balance` — não existe coluna equivalente em `accounts`.

### RPC atómica (pendente)

Ainda **não existe** RPC `create_account_transfer()`. Risco **baixo** na v1:

- Operação = **insert único** (não há duas escritas independentes)
- Validação dupla: app (`isTransferValid`) + CHECK SQL

**Futuro:** RPC server-side com transacção explícita para validar saldo e inserir numa operação atómica.

### QA manual — eliminar transferência

1. Conta A = 713 €, Conta B = 371 € após transferência de 300 €
2. Eliminar a transferência na lista Movimentos
3. Validar: A = 1013 €, B = 71 €, total = 1084 €
4. Receitas/despesas/análises inalteradas
