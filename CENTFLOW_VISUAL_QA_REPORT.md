# CentFlow — QA visual (código + revisão estática)

**Data:** 2026-07-17  
**Branch:** `rc2-ios-sideload`  
**Dispositivo físico:** não testado nesta sprint (sem afirmação de validação iPhone).

## Ecrãs auditados (estático / código)

| Ecrã | Safe area | Labels financeiros | Empty / erro | Notas |
|------|-----------|--------------------|--------------|--------|
| Onboarding | OK (existente) | Plano sem “livres” negativos | — | Copy segurança/OCR/IA corrigida |
| Home | OK | Situação do mês + Ver cálculo | ErrorState | Prioridade única + recentes |
| Movimentos | OK | Saldo realizado | — | Comparação com guardrail |
| Novo movimento | OK (existente) | — | — | Sem alteração estrutural |
| Análises Resumo | OK | Realizado vs previsto | — | Nota engenharia removida |
| Análises Gastos | OK | Períodos Semana/Mês/… | — | Calendário: confirmar com dados |
| Análises Dívida | OK | Dívida total | — | Registar pagamento |
| Análises Património | OK | Saldos/caixa ≠ “Ativos −” | — | Rácios “Não calculável” |
| Créditos / Cartões | OK | Totais explícitos | — | |
| Património (tab) | OK | Tab renomeada | — | Objetivos ainda na área |
| Perfil | OK | Sem gamificação | — | Preservado |
| Definições | OK | OB escondido | — | |
| Ligações bancárias | OK | Indisponível se flag off | Mensagem produto | |
| Eliminar conta | OK (existente) | — | — | Não retestado UI |

## Pendências dispositivo real

- Teclado em Novo movimento / Registar pagamento  
- Dynamic Type em valores monetários grandes  
- Scroll Home com poucos vs muitos movimentos  
- OCR com flag ON (review manual)  
- Open Banking com flag ON (quando backend estável)
