# Arquitectura de informação — Património

## Decisão

A tab inferior **Ativos** passa a chamar-se **Património** (rota interna `ativos` mantém-se para não partir deep links).

## O que conta para património líquido

| Componente | Conta? | Onde |
|------------|--------|------|
| Saldos de conta / caixa | Sim | Motor `netWorth.breakdown.accounts` |
| Investimentos | Sim | `breakdown.investments` |
| Inventário (bens, se incluídos) | Sim | `breakdown.inventory` |
| Poupanças reservadas / objetivos | Parcial | `breakdown.savings` — capital reservado |
| Créditos e cartões | Passivos | `totalLiabilities` |
| Garantias | Não | Informação / risco, não activo financeiro |
| Objetivos (meta) | Não como activo | Planeamento — progresso separado |

## Onde vivem os ecrãs

| Conceito | Localização UI |
|----------|----------------|
| Resumo património | Análises → Património; Home resumo rápido |
| Objetivos | Tab Património → Objetivos (planeamento) |
| Garantias | Tab Património → Garantias |
| Inventário | Tab Património → Inventário |
| Créditos / cartões | Tab Créditos |

## Apresentação (Análises → Património)

Não rotular “Ativos” com saldo de conta negativo sem contexto.

Preferir:

1. Património líquido  
2. Saldos e caixa  
3. Investimentos  
4. Bens  
5. Dívidas  

Rácios (dívida, liquidez, etc.) → “Não calculável” se activos ≤ 0.
