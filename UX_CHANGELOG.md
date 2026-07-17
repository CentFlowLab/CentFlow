# UX Changelog — sprint de remediação

## Home
- Máximo **1** acção financeira e **1** recomendação.
- Cartão «Plano de hoje» só aparece com insights concretos.

## Movimentos
- Comparação vs mês anterior: sem base → «Sem comparação disponível» (nunca −100% artificial).

## Análises
- Taxa de poupança mostra défice real ou «Sem dados suficientes».
- Fundo de emergência alinhado a despesas fixas (subscrições + prestações).

## Navegação
- Tab Análises sem botão central gigante — ícone equilibrado com as outras tabs.

## Perfil
- Removidos nível, progresso gamificado, catálogo de áreas e estatísticas de uso.
- Foco em conta, preferências e ligação a Definições.
- Copy «Conta ativa» (PT-PT).

## Definições
- Secções: Conta / Preferências / Dados / Integrações / Ajuda / Avançado.
- **Eliminar conta** visível na secção Conta.
- CentFlow Doctor só em desenvolvimento (`__DEV__` / variant development).
- Versão da app no fundo da lista.

## Novo movimento / OCR
- OCR escondido por defeito (`EXPO_PUBLIC_RECEIPT_OCR_UI=true` para activar).
- Ação rápida «talão» omitida quando OCR está off.

## Interno
- Guardrails em `lib/domain/financial/safe-math.ts`.
- Glossário: `FINANCIAL_METRICS_GLOSSARY.md`.
- Auditoria: `CENTFLOW_UX_REMEDIATION_AUDIT.md`.
