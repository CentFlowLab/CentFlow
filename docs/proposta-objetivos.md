# Objetivos — auditoria e proposta de redesign

Estado: **implementada localmente (ADR-058, 2026-11-11).** Migração do servidor
`20261116000100_goals_redesign.sql` escrita e testada em PGlite, por aplicar. A imagem de
referência citada no pedido não chegou; o desenho segue a descrição do pedido.

## 1. Auditoria

- **Modelo** (ADR-023): `goals` (nome, alvo, moeda, data opcional) e `goal_contributions` (uma
  linha por contribuição: valor positivo, data, eliminação lógica). Ambos sincronizados, com RLS.
- **Progresso**: soma das contribuições ativas (`savedAmountMinor`), sem total guardado; em falta =
  `max(0, alvo − poupado)` (`remainingAmountMinor`). A moeda do objetivo bloqueia com contribuições.
- **Integridade**: uma contribuição **não cria movimentos nem altera saldos** e não entra no
  património líquido. Hoje é um acompanhamento de meta, não dinheiro separado — certo, mas a
  interface não o diz.
- **Ecrãs**: `GoalsScreen` (totais por moeda, cartões com `ProgressBar`), `GoalScreens` (detalhe
  com contribuições), `GoalForm`.
- **Falta para o redesign**: ícone/imagem e cor, descrição, conta associada, data de conclusão,
  separação "Concluídos/Em curso", evolução no tempo.

## 2. Proposta

### Dados (sem segundo sistema)

`goals` ganha colunas opcionais: `icon` (catálogo de ícones da app, incluindo os desenhados),
`color` (paleta), `description` (≤ 280), `account_id` (conta onde o dinheiro está guardado, se a
pessoa quiser associar), `achieved_on` (data em que foi concluído). `goal_contributions` ganha
`entry_id` opcional: ligar a contribuição a uma transferência existente (ex.: para a conta
Poupança), sem criar movimentos.

- **Concluído** = poupado ≥ alvo. `achieved_on` = dia da contribuição que fez atingir o alvo
  (calculado; guardado só quando a pessoa marca à mão). Mudar o alvo recalcula tudo, sem tocar nas
  contribuições; se o alvo subir acima do poupado, o objetivo volta a "Em curso".
- **Ultrapassado**: guarda o valor real (ex.: 21 000 € de 20 000 €); a barra fica a 100 % e o
  cartão mostra "+1000 €".
- **Imagem**: ícone + cor (coerente com a app, sem novos dados pessoais). Fotografia própria pode
  usar o Storage dos anexos numa fase seguinte.
- **Clareza**: no detalhe e na criação, "As contribuições acompanham a meta; não movem dinheiro.
  Para guardar de facto, faz uma transferência para a conta de poupança e liga-a aqui."

### Ecrã

- Secções **Em curso** (ordem: mais perto do fim primeiro) e **Concluídos** (mais recentes
  primeiro); os concluídos nunca desaparecem.
- Cartão horizontal: ícone circular à esquerda; nome e percentagem ao centro; acumulado, em falta e
  meta à direita; **barra integrada no fundo do cartão** (preenchimento proporcional, cor esmeralda
  translúcida sobre `surface`), como na referência, com os tokens Midnight Emerald (claro e
  escuro, contraste AA).
- Concluído: fundo esmeralda translúcido, "✓ Concluído", data e valor atingido.
- Detalhe: alvo, acumulado, em falta, %, criação, data prevista, histórico de contribuições,
  gráfico da evolução (barras por mês, componente `BarChart`), ações (contribuir, editar, alterar
  meta e data, eliminar com confirmação).
- Estados: vazio, um, vários, sem contribuições, parcial, atingido, ultrapassado, editado,
  eliminado.

### Migração (por aplicar)

`20261116000100_goals_redesign.sql`: colunas acima em `goals` e `goal_contributions` (nulas, com
`check`), FK `(user_id, account_id)` e `(user_id, entry_id)`, `sync_apply_op` com guardas para apps
antigas. Local v15. Testes: progresso, em falta, mudar meta, concluído, ultrapassado,
contribuições, edição e eliminação, sincronização, app antiga, sem duplicação de movimentos nem
efeito no saldo ou no património.

## 3. Decisões para o responsável

1. Enviar a imagem de referência.
2. Imagem do objetivo: ícone + cor agora (recomendado) ou fotografia já.
3. Ligar contribuições a transferências reais (opcional por contribuição) — recomendado.
4. Autorizar a migração no staging e na produção quando o SQL estiver revisto.
