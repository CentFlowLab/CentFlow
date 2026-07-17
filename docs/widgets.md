# Widgets CentFlow (v1.2)

## Estado

- Stub JS removido (não havia UI nativa ligada).
- UI nativa de widgets **pendente** de módulo nativo (iOS WidgetKit / Android Glance).

## Dados previstos

| Campo | Descrição |
|-------|-----------|
| `netWorth` | Património líquido |
| `centFlowScore` | Score 0–100 |
| `weeklySpending` | Gastos da semana |
| `topInsight` | Primeira acção do assistente |

## Próximo passo nativo

1. Configurar target Widget Extension (iOS) ou App Widget (Android)
2. Definir `WidgetSnapshot` partilhado via App Group / SharedPreferences
3. Refresh a cada abertura da app + background fetch
