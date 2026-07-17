# Arquitectura de informação — Ativos / Património

**Decisão (2026-07-17):** Opção B — manter o label da tab **«Ativos»** no curto prazo, mas deixar de apresentar Objetivos e Garantias como se fossem activos financeiros.

## Taxonomia

| Módulo | Natureza | Entra no património líquido? |
|--------|----------|------------------------------|
| Inventário / bens | Activo (valor estimado) | Sim, quando marcado |
| Investimentos (futuro) | Activo financeiro | Sim |
| Objetivos | Meta de poupança | Não (saldo em contas) |
| Garantias | Documento / prazo | Não |

## UX

- Secções no ecrã Ativos: **Inventário** como primário; Objetivos e Garantias como módulos relacionados com títulos claros («Objetivos de poupança», «Garantias»).
- Empty states sem linguagem de «activo» para objetivos/garantias.
- Renomear tab para «Património» fica como P1 pós-beta se o inventário/investimentos crescerem.

## Formulário inventário (mínimo)

Obrigatório: nome, valor, categoria (lista), incluir no património.  
Opcional: condição, foto, comprovativo, garantia, notas.  
Sem depreciação automática nesta sprint.
