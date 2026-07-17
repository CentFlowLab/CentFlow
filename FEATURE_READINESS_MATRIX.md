# Feature readiness matrix — CentFlow

Estado para Internal Beta. Classificação: **READY** | **INTERNAL_ONLY** | **HIDE** | **BROKEN**.

| Funcionalidade | Classificação | Notas |
|----------------|---------------|--------|
| Movimentos CRUD | READY | Fluxo principal |
| Novo movimento | READY | Validar conta/valor; OCR separado |
| Home — situação do mês | READY | Decomposição realizado/previsto |
| Análises (tabs) | READY | Períodos rotulados; rácios com guardrails |
| Créditos / Cartões | READY | Labels “Total dos créditos/cartões”; “Registar pagamento” |
| Património (tab) | READY | Renomeada de Ativos; objetivos ainda na mesma área |
| Perfil | READY | Sem gamificação |
| Definições (estrutura) | READY | Doctor só DEV |
| Eliminar conta | READY | Fluxo existente |
| Apple / Google Sign-In | READY | Preservar |
| Face ID / biometria | READY | Preservar |
| Consentimento / legal | READY | Links legais |
| Exportar dados | READY | Confirmar em dispositivo |
| Exportar PDF | READY | Confirmar em dispositivo |
| Notificações | INTERNAL_ONLY | Preferências existem; entrega depende de backend |
| Aparência | READY | Tema |
| Sugestões financeiras | READY | Preferência de opt-out |
| OCR | HIDE | `EXPO_PUBLIC_RECEIPT_OCR_UI` off por defeito |
| Open Banking | HIDE | `EXPO_PUBLIC_OPEN_BANKING_UI` off; ecrã mostra “indisponível” se acedido |
| Atalhos rápidos | INTERNAL_ONLY | Secundário |
| Assistente / Action Center | INTERNAL_ONLY | Só com insights concretos |
| Doctor | INTERNAL_ONLY | Só `__DEV__` / variant development |
| Repetir onboarding | READY | Em Avançado |
| Segurança (settings) | READY | |

**Regra:** itens BROKEN/HIDE não devem aparecer no menu de produção.
