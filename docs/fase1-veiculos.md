# Fase 1 — Veículos: arquitetura e migrações (proposta)

Estado: **implementado localmente (ADR-054); migração do servidor escrita e testada só em PGlite, por aplicar.** A
migração do servidor só é aplicada no staging depois de o SQL ser revisto e autorizado; na produção,
com uma autorização separada. Base: versão 0.1.13 (migração local v11; servidor até
`20261111000400`, produção = staging).

## 1. Regras

1. **Um movimento, uma contabilização.** A despesa de 240 € em pneus continua a ser **uma** linha
   em `entries`: tem uma categoria (ex.: Manutenção), uma conta (ex.: o cartão de crédito) e,
   agora, um veículo. Os relatórios gerais somam `entries` uma vez, como hoje; os totais do
   veículo são só uma **vista filtrada** das mesmas linhas (`WHERE vehicle_id = ?`). Nada é
   copiado para outra tabela.
2. **Histórico preservado.** Os quilómetros e o combustível ficam no movimento onde foram
   registados; mudar os quilómetros atuais do veículo não apaga leituras antigas.
3. **Offline e sincronizado.** Tudo entra nas tabelas existentes e na fila `sync_outbox`, com as
   mesmas regras de versão, fusão a três vias e RLS. Sem chamadas novas ao servidor.

## 2. O que já existe

- `vehicles`: nome, tipo, matrícula, quilómetros, `inspection_due`, `insurance_due`. Sincroniza.
- `documents`: título, categoria (`vehicle`, …), validade, notas. **Não guarda ficheiros.**
- `entries`: despesas/rendimentos/transferências com `category_id` e `account_id`.
- Cartões de crédito são contas do tipo `card` (ADR-052): pagar com o cartão já é
  `entries.account_id = <cartão>`; pagar o cartão é uma transferência (não conta como despesa).

Por isso o caso "pneus · Manutenção · 50-XO-29 · Cartão X" só precisa de **uma coluna nova** no
movimento: `vehicle_id`.

## 3. Modelo de dados

### 3.1 `entries` (colunas novas, todas opcionais)

| Coluna              | Tipo (SQLite / Postgres) | Regra                                                                           |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `vehicle_id`        | TEXT / uuid, nulo        | Só em despesas (e rendimentos, ex.: venda de peças). Nunca em transferências.   |
| `vehicle_cost_type` | TEXT, nulo               | Tipo de custo do veículo (lista abaixo). Obrigatório quando há `vehicle_id`.    |
| `quantity_milli`    | INTEGER / bigint, nulo   | Litros × 1000 (ou kWh × 1000 nos elétricos). Só em `fuel`. Inteiro, sem floats. |
| `odometer_km`       | INTEGER / bigint, nulo   | Quilómetros no momento (abastecimento, revisão, pneus…).                        |

`vehicle_cost_type`: `fuel`, `insurance`, `road_tax` (IUC), `inspection`, `tyres`, `maintenance`,
`repair`, `parking_tolls`, `purchase`, `other`.

É a "segunda classificação" pedida (Seguro + 50-XO-29): a **categoria** organiza o orçamento e os
relatórios gerais; o **tipo de custo** organiza a ficha do veículo. O valor existe uma vez.

O preço por litro **não se guarda**: calcula-se (`amount / quantity_milli`), arredondado só na
apresentação. Assim nunca há três números que não batem certo.

### 3.2 `vehicles` (colunas novas)

| Coluna            | Tipo                | Notas                                                     |
| ----------------- | ------------------- | --------------------------------------------------------- |
| `make`, `model`   | TEXT, nulo (≤ 40)   | Marca e modelo.                                           |
| `year`            | INTEGER, nulo       | 1900–2100.                                                |
| `fuel_type`       | TEXT, nulo          | `petrol`, `diesel`, `electric`, `hybrid`, `lpg`, `other`. |
| `acquired_on`     | data, nulo          | Data de aquisição.                                        |
| `purchase_amount` | INTEGER, nulo       | Valor de compra (unidades mínimas), informativo.          |
| `currency`        | TEXT, nulo          | Moeda do valor de compra (obrigatória se houver valor).   |
| `road_tax_due`    | data, nulo          | Próximo IUC.                                              |
| `service_due_on`  | data, nulo          | Próxima revisão (data).                                   |
| `service_due_km`  | INTEGER, nulo       | Próxima revisão (km).                                     |
| `notes`           | TEXT, nulo (≤ 1000) |                                                           |

`inspection_due` e `insurance_due` já existem. Fotografia do veículo: ver §8 (ficheiros).

### 3.3 `documents` (coluna nova)

`vehicle_id` (nulo): seguro, inspeção, faturas e outros documentos ligados a um veículo. A Fase 4
generaliza para qualquer elemento do património.

## 4. Migrações

### 4.1 Local (SQLite) — v12

```sql
ALTER TABLE entries ADD COLUMN vehicle_id TEXT REFERENCES vehicles (id);
ALTER TABLE entries ADD COLUMN vehicle_cost_type TEXT CHECK (vehicle_cost_type IS NULL OR vehicle_cost_type IN
  ('fuel','insurance','road_tax','inspection','tyres','maintenance','repair','parking_tolls','purchase','other'));
ALTER TABLE entries ADD COLUMN quantity_milli INTEGER CHECK (quantity_milli IS NULL OR quantity_milli > 0);
ALTER TABLE entries ADD COLUMN odometer_km INTEGER CHECK (odometer_km IS NULL OR odometer_km BETWEEN 0 AND 10000000);
CREATE INDEX entries_vehicle_idx ON entries (vehicle_id, date) WHERE vehicle_id IS NOT NULL;

ALTER TABLE vehicles ADD COLUMN make TEXT;            -- … e as restantes de §3.2
ALTER TABLE documents ADD COLUMN vehicle_id TEXT REFERENCES vehicles (id);
-- Triggers de sync de entries, vehicles e documents recriados com os campos novos (como v10/v11).
```

Regras de coerência (transferência sem veículo, `quantity_milli` só com `fuel`, tipo obrigatório
com veículo) ficam na validação do `core` e na função do servidor; o SQLite só guarda tipos e
intervalos, como nas outras tabelas. Teste novo em `database-test.ts` (v11 → v12 com dados).

### 4.2 Servidor — `20261112000100_vehicle_costs.sql`

- `alter table public.entries add column vehicle_id uuid, …` com as mesmas restrições; chave
  estrangeira composta `(user_id, vehicle_id) references public.vehicles (user_id, id)`, como
  `category_id` → nunca aponta para um veículo de outra pessoa.
- `vehicles` e `documents`: colunas de §3.2 e §3.3.
- `private.sync_apply_op` recriada com **guardas `v_data ? 'campo'`** para todos os campos novos:
  uma app 0.1.13 ou anterior que edite um movimento não apaga o veículo nem os litros (mesma
  técnica do ADR-046).
- Validação no servidor: transferência com veículo, ou litros sem `fuel`, é rejeitada como
  qualquer outro dado inválido (fica em `sync_conflicts` com o motivo).
- `sync_pull_v2`, `sync_verify` e `purge_deleted` não mudam de forma: leem as linhas inteiras.
- RLS: sem alterações (as políticas são por tabela e já cobrem as colunas novas).

**Compatibilidade:** apps antigas ignoram colunas que não conhecem ao receber (a escrita local usa
uma lista fixa de colunas) e não as enviam (guardas). Movimentos com veículo continuam a contar
nos totais delas.

**Ordem de aplicação:** staging → ensaio real (`live-sync-test`) com uma app antiga e uma nova a
editar o mesmo movimento → produção só com `CONFIRMO-PRODUCAO` → depois publicar a app.

## 5. Sincronização

- `SYNC_FIELDS.entries` ganha `vehicle_id`, `vehicle_cost_type`, `quantity_milli`, `odometer_km`.
- Fusão (`COUPLED`): `vehicle_id` + `vehicle_cost_type` mudam juntos; `quantity_milli` +
  `odometer_km` + `amount` também (um abastecimento é um todo). Dois aparelhos a mudar campos
  diferentes continuam a combinar-se sem conflito.
- `SYNC_FIELDS.vehicles` e `.documents` com os campos novos; sem acoplamentos.

## 6. Cálculos (`src/core/finance/vehicles.ts`, com testes)

Todos a partir dos movimentos não eliminados com `vehicle_id`, na moeda do veículo:

- **Total gasto** (desde a aquisição), **este mês** e **este ano**; por tipo de custo.
- **Custo total de posse** = compra + restantes despesas. A compra é o movimento marcado como
  `purchase` (§9.1) ou, sem ele, `purchase_amount`; nunca os dois.
- **Combustível**: litros totais, preço médio por litro, gasto por mês.
- **Combustível por km e custo total por km**: ver §9.3. Sem dados suficientes, mostra "Faltam
  dados" (nunca um número inventado).
- **Prazos**: dias até seguro, inspeção, IUC e revisão (data ou km); estado `ok`, `soon`
  (≤ 30 dias ou ≤ 1000 km), `overdue`.
- Relatórios gerais **não mudam**: somam `entries` como hoje.

## 7. Interface

- **Ficha do veículo** (`/vehicles/[id]`): cabeçalho (matrícula, marca, modelo, ano), prazos com
  "expira em X dias" e alertas de cor, totais (mês, ano, desde a aquisição, custo de posse),
  combustível e custo/km, histórico de despesas por tipo, documentos ligados.
- **Movimento**: campo opcional "Veículo" (só despesas); ao escolher, aparece "Tipo de custo";
  com "Combustível", aparecem litros e quilómetros, e o preço por litro calculado.
- **Associar movimentos existentes**: na ficha, "Associar movimentos" abre a lista com pesquisa
  (ex.: "pneus", "Galp") e seleção múltipla; grava numa só transação.
- **Eliminar um veículo**: confirmação com o número de movimentos ligados; os movimentos ficam e
  perdem só a ligação (ver §9.4).

## 8. Fora desta fase

- **Fotografias e ficheiros** (fatura, apólice, foto do carro): exigem armazenamento de ficheiros
  (Supabase Storage com RLS por utilizador), limites de tamanho e uma nova categoria de dados na
  política de privacidade. Proposta: Fase 4 (Documentos). Na Fase 1, os documentos ligam-se ao
  veículo só com metadados.
- Valor atual do veículo no património líquido (desvalorização): pode ligar-se a um bem do
  Património numa fase seguinte.
- Lembretes por notificação (precisa de notificações locais; hoje só há alertas na app).

## 9. Decisões do responsável (2026-11-11)

1. **Compra explícita.** A Miven nunca adivinha. A compra é o movimento que a pessoa marca com o
   tipo `purchase` nesse veículo; no máximo um por veículo (índice único parcial, local e no
   servidor). Com compra marcada, o custo de posse usa esse movimento e ignora `purchase_amount`;
   a ficha mostra qual é.
2. **Combustível em inteiros, com validação.** `quantity_milli` entre 1 ml e 1000 l (1 000 000);
   `odometer_km` entre 0 e 10 000 000. Preço por litro calculado. Leituras incoerentes recusadas:
   uma leitura não pode ser menor do que outra do mesmo veículo numa data anterior, nem maior do
   que uma numa data posterior (validado no aparelho, onde estão os movimentos; o servidor valida
   tipos e intervalos).
3. **Custo por km só com dados.** Exige duas leituras em datas diferentes e distância positiva.
   Duas métricas separadas: **combustível por km** (só abastecimentos) e **custo total por km**
   (todas as despesas exceto a compra), ambas no intervalo entre a primeira e a última leitura.
4. **Eliminar com confirmação.** O diálogo diz quantos movimentos estão ligados. Eliminar desliga-os
   (`vehicle_id`, tipo de custo, litros e km a nulo) numa só transação, sem alterar valor,
   categoria, conta nem data.
5. **Compatibilidade testada.** Teste no servidor (PGlite) em que uma operação no formato da app
   antiga edita um movimento com veículo e os campos novos ficam intactos; e o mesmo no aparelho
   antigo a receber linhas novas. É condição para o staging.

## 10. Plano de execução (depois de aprovado)

1. `core`: tipos, validação, cálculos e testes.
2. Migração local v12 e teste; repositórios (veículo nos movimentos, associação em lote,
   eliminação com desligar) e testes em SQLite real.
3. Migração do servidor, testada em PGlite (`server-test.ts`), incluindo a app antiga.
4. Ecrãs (ficha, campos no movimento, associar) com testes e verificação na web.
5. Staging + ensaio real; produção só com autorização; publicação da app.
