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
