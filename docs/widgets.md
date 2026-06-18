# Widgets CentFlow (v1.2)

## Estado

- Snapshot de dados preparado em `lib/widgets/widget-data.ts`
- UI nativa de widgets **pendente** de módulo nativo (iOS WidgetKit / Android Glance)

## Dados expostos

| Campo | Descrição |
|-------|-----------|
| `netWorth` | Património líquido |
| `centFlowScore` | Score 0–100 |
| `weeklySpending` | Gastos da semana |
| `topInsight` | Primeira acção do assistente |

## Próximo passo nativo

1. Configurar target Widget Extension (iOS) ou App Widget (Android)
2. Partilhar `WidgetSnapshot` via App Group / SharedPreferences
3. Refresh a cada abertura da app + background fetch
