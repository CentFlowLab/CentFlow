# Beta Visual QA Report

**Ambiente:** código local / TypeScript + testes automatizados  
**Dispositivo físico:** não executado nesta sprint  
**Data:** 2026-07-17

| Ecrã | Estado | Problemas encontrados | Correções | Riscos | Captura necessária | Resultado |
|------|--------|----------------------|-----------|--------|--------------------|-----------|
| Tab bar | Código | Botão Análises elevado | Ícone igual às outras tabs | Layout em iPhone pequeno | Sim (físico) | PENDENTE físico |
| Home | Código | Excesso de cartões | 1 acção + 1 rec; assistente condicional | Pode parecer “vazia” | Sim | PENDENTE físico |
| Movimentos | Código | −100% vs mês anterior | `percentChangeVsPrevious` + copy | — | Sim | PENDENTE físico |
| Análises | Código | Poupança clampada a 0% | Mostra défice / sem dados | — | Sim | PENDENTE físico |
| Créditos | Parcial | Âmbito dos totais | Documentado; UI completa P1 | Labels ambíguos | Sim | PENDENTE |
| Ativos | Parcial | Taxonomia | Doc IA; UI copy P1 | Confusão objetivos | Sim | PENDENTE |
| Perfil | Código | Gamificação | Removido nível/%/stats/áreas | — | Sim | PENDENTE físico |
| Definições | Código | Doctor em beta; eliminar conta escondido | Doctor só DEV; eliminar conta no índice | — | Sim | PENDENTE físico |
| Novo movimento | Código | OCR dominante | Flag OCR off por defeito | Testers sem OCR | Sim | PENDENTE físico |
| Safe area / overlap | Código | Tab elevada | Removida elevação | Validar home indicator | Sim | PENDENTE físico |

**Nota:** Não afirmar validação em dispositivo físico — falta smoke visual real.
