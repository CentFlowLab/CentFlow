# Cartões de crédito, empréstimos e dívidas — auditoria e proposta

Estado: **aprovada e implementada localmente (ADR-057, 2026-11-11). Migração do servidor
`20261115000100_cards_and_loans.sql` escrita e testada em PGlite, por aplicar.**

## A. Auditoria do modelo atual

| Peça                  | Hoje                                                                                                                                                                                                                                     | Avaliação                                                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contas (`accounts`)   | `type` inclui `card`; `initial_balance` pode ser negativo (dívida de abertura). Saldo = saldo inicial + movimentos.                                                                                                                      | Base certa: um cartão já é uma conta. Faltam limite, entidade, datas, conta de pagamento.                                                                                                                                                       |
| Saldo de abertura     | `initial_balance` não é um movimento: não entra em relatórios de receitas/despesas.                                                                                                                                                      | Correto (regra "saldo de abertura").                                                                                                                                                                                                            |
| Compra com cartão     | Uma linha em `entries` (`expense`, `account_id = cartão`). Reduz o saldo do cartão (aumenta a dívida). Pode ter veículo e categoria.                                                                                                     | Correto: um movimento, uma contabilização.                                                                                                                                                                                                      |
| Pagamento do cartão   | Transferência: **uma só linha** `transfer` com `account_id` (banco) e `destination_account_id` (cartão). Relatórios ignoram transferências.                                                                                              | Correto e atómico: não há dois lados a dessincronizar.                                                                                                                                                                                          |
| Cartões no Património | `wealth_items.type = credit` (passivo). "Passar para Contas" cria a conta e fecha o item (ADR-052). Aviso no movimento.                                                                                                                  | Ainda se podem criar cartões no Património: origem da confusão.                                                                                                                                                                                 |
| Empréstimos           | `wealth_items` (`loan`, `mortgage`, `other_debt`): valor em dívida + histórico de avaliações; valor inicial = primeira avaliação (ADR-052). "Registar pagamento" cria uma despesa (total) e baixa a dívida pelo capital, numa transação. | Funciona, mas: (1) o pagamento não fica **ligado** ao movimento — editar/eliminar a despesa não recalcula a dívida; (2) juros e comissões não ficam separados; (3) faltam taxa, prestação, vencimento, prazo, entidade, tipo automóvel/pessoal. |
| Receção de empréstimo | Não existe. Se a pessoa registar o dinheiro recebido, só pode ser rendimento.                                                                                                                                                            | Errado para relatórios (financiamento não é rendimento).                                                                                                                                                                                        |
| Património líquido    | Contas (com cartões negativos) + bens − dívidas (`wealth_items`).                                                                                                                                                                        | Correto se o cartão não estiver nos dois sítios (já garantido ao passar).                                                                                                                                                                       |
| Sincronização         | Linha a linha com versões, guardas para apps antigas, fusão a três vias.                                                                                                                                                                 | Reutilizar: nada de sistemas paralelos.                                                                                                                                                                                                         |

## B. Arquitetura proposta

### B1. Cartões = contas especiais (sem tabela nova)

`accounts` ganha colunas opcionais, usadas quando `type = 'card'`:

| Coluna               | Tipo           | Regra                                      |
| -------------------- | -------------- | ------------------------------------------ |
| `credit_limit`       | bigint, nulo   | > 0; moeda da conta                        |
| `institution`        | text, nulo     | ≤ 60                                       |
| `statement_day`      | smallint, nulo | 1–31 (dia de fecho)                        |
| `due_day`            | smallint, nulo | 1–31 (dia limite de pagamento)             |
| `payment_account_id` | uuid, nulo     | conta (não cartão) da mesma pessoa e moeda |
| `color`              | text, nulo     | chave da paleta (`CATEGORY_COLOR_KEYS`)    |

- **Dívida** = −saldo (quando negativo). **Crédito disponível** = limite − dívida (pode ser negativo
  se ultrapassado: mostrado como "acima do limite"). **Utilização** = dívida ÷ limite.
- **Dívida inicial** = `initial_balance` negativo (saldo de abertura): nunca uma despesa.
- O limite não entra no património (só o saldo da conta entra).
- **Cartões no Património**: deixa de ser possível criar `credit` novo (o tipo fica só para dados
  antigos, com o botão "Passar para Contas"). Sem migração de dados automática: a pessoa decide.

### B2. Empréstimos = dívida no Património + movimentos ligados

Mantém-se `wealth_items` (os empréstimos já lá estão, com histórico) e ganha colunas opcionais:

| Coluna               | Tipo           | Regra                                    |
| -------------------- | -------------- | ---------------------------------------- |
| `loan_kind`          | text, nulo     | `car`, `mortgage`, `personal`, `other`   |
| `institution`        | text, nulo     | ≤ 60                                     |
| `principal_amount`   | bigint, nulo   | capital emprestado (> 0)                 |
| `started_on`         | date, nulo     | início                                   |
| `opening_debt`       | bigint, nulo   | dívida na data de entrada na Miven (> 0) |
| `opening_on`         | date, nulo     | data dessa dívida                        |
| `interest_rate_bp`   | integer, nulo  | taxa anual em pontos-base (3,25 % = 325) |
| `installment_amount` | bigint, nulo   | prestação prevista                       |
| `due_day`            | smallint, nulo | 1–31                                     |
| `ends_on`            | date, nulo     | fim previsto                             |

`entries` ganha a ligação ao empréstimo e a decomposição do pagamento:

| Coluna             | Tipo         | Regra                                                       |
| ------------------ | ------------ | ----------------------------------------------------------- |
| `loan_id`          | uuid, nulo   | `wealth_items` da mesma pessoa, tipo dívida                 |
| `loan_role`        | text, nulo   | `payment` (prestação) ou `disbursement` (dinheiro recebido) |
| `principal_amount` | bigint, nulo | capital amortizado (≥ 0, ≤ `amount`)                        |
| `interest_amount`  | bigint, nulo | juros (≥ 0)                                                 |
| `fees_amount`      | bigint, nulo | comissões, seguros e outros encargos (≥ 0)                  |

- **Prestação**: uma despesa (`amount` = total), com `principal + interest + fees = amount`. Se só
  se indicar o capital, a diferença fica em `fees_amount` como "juros e encargos por discriminar".
- **Dívida atual** = `opening_debt` − Σ capital das prestações **não eliminadas** com data ≥
  `opening_on` (+ desembolsos, ver abaixo). É **calculada**, nunca escrita à mão por um pagamento:
  editar ou eliminar uma prestação recalcula a dívida sozinho, e não há forma de um pagamento mudar
  outro. O campo `amount` do item passa a ser só "ajuste" explícito.
- **Receção de empréstimo** (`disbursement`): movimento de entrada na conta (tipo `income`) com
  `loan_role = disbursement`, **excluído dos relatórios de rendimentos** (financiamento) e somado à
  dívida.
- **Capital > dívida** é recusado, salvo com o ajuste explícito ("Corrigir dívida", que regista a
  diferença com data e nota no histórico).
- Empréstimos existentes: `opening_debt`/`opening_on` = valor e data atuais; o histórico de
  avaliações fica; os pagamentos já registados (despesas sem ligação) não são alterados.

### B3. Porque não tabelas novas

Uma prestação é dinheiro real numa conta: tem de ser um movimento. Pôr a decomposição no próprio
movimento mantém "um movimento, uma contabilização", herda a sincronização, a fila offline, os
conflitos e o RLS, e editar/eliminar fica coerente sem triggers nem duplicação.

## C. Regras contabilísticas

| Operação                     | Tratamento                               | Relatórios           | Património                |
| ---------------------------- | ---------------------------------------- | -------------------- | ------------------------- |
| Compra com cartão            | despesa na conta do cartão               | despesa              | cartão mais negativo      |
| Pagamento do cartão          | transferência banco → cartão (uma linha) | nada                 | neutro                    |
| Dívida inicial do cartão     | `initial_balance` negativo               | nada                 | cartão negativo           |
| Receção de empréstimo        | entrada na conta, `disbursement`         | **não** é rendimento | conta +, dívida +         |
| Prestação                    | despesa (total)                          | despesa              | conta −, dívida − capital |
| Capital                      | parte da prestação                       | dentro da despesa    | baixa a dívida            |
| Juros e comissões            | parte da prestação                       | dentro da despesa    | —                         |
| Dívida inicial do empréstimo | `opening_debt`                           | nada                 | dívida                    |

Nota: os relatórios por categoria podem mostrar a prestação separada em capital/juros/encargos
(proposta de ecrã), mas o total da despesa é sempre o valor pago.

## E. SQL proposto (por aplicar)

```sql
-- 20261115000100_cards_and_loans.sql (proposta)
alter table public.accounts
  add column credit_limit bigint check (credit_limit is null or (credit_limit > 0 and credit_limit <= 1000000000000)),
  add column institution text check (institution is null or char_length(btrim(institution)) between 1 and 60),
  add column statement_day smallint check (statement_day is null or statement_day between 1 and 31),
  add column due_day smallint check (due_day is null or due_day between 1 and 31),
  add column payment_account_id uuid,
  add column color text check (color is null or char_length(color) between 1 and 20),
  add foreign key (user_id, payment_account_id) references public.accounts (user_id, id),
  add constraint accounts_card_fields check (
    type = 'card' or (credit_limit is null and statement_day is null and due_day is null
                      and payment_account_id is null)
  );

alter table public.wealth_items
  add column loan_kind text check (loan_kind is null or loan_kind in ('car','mortgage','personal','other')),
  add column institution text check (institution is null or char_length(btrim(institution)) between 1 and 60),
  add column principal_amount bigint check (principal_amount is null or principal_amount > 0),
  add column started_on date,
  add column opening_debt bigint check (opening_debt is null or opening_debt > 0),
  add column opening_on date,
  add column interest_rate_bp integer check (interest_rate_bp is null or interest_rate_bp between 0 and 100000),
  add column installment_amount bigint check (installment_amount is null or installment_amount > 0),
  add column due_day smallint check (due_day is null or due_day between 1 and 31),
  add column ends_on date;

alter table public.entries
  add column loan_id uuid,
  add column loan_role text check (loan_role is null or loan_role in ('payment','disbursement')),
  add column principal_amount bigint check (principal_amount is null or principal_amount >= 0),
  add column interest_amount bigint check (interest_amount is null or interest_amount >= 0),
  add column fees_amount bigint check (fees_amount is null or fees_amount >= 0),
  add foreign key (user_id, loan_id) references public.wealth_items (user_id, id),
  add constraint entries_loan_rules check (
    (loan_id is null) = (loan_role is null)
    and (loan_role is distinct from 'payment' or (type = 'expense'
         and coalesce(principal_amount,0) + coalesce(interest_amount,0) + coalesce(fees_amount,0) = amount))
    and (loan_role is distinct from 'disbursement' or (type = 'income'
         and principal_amount is null and interest_amount is null and fees_amount is null))
  ) not valid;
create index entries_loan_idx on public.entries (user_id, loan_id, date) where loan_id is not null;

-- private.sync_apply_op: recriada com as colunas novas e guardas `v_data ? 'campo'` em accounts,
-- wealth_items e entries (apps antigas não as apagam). Sem novas políticas: as tabelas já têm RLS
-- por `auth.uid()` e a escrita continua só por `sync_push`.
```

Local: migração v14 com as mesmas colunas e triggers; testes em SQLite real e PGlite (incluindo
uma app 0.1.15 a editar uma conta, um empréstimo e uma prestação sem os campos novos).

## F. Testes previstos

Cartões: criar sem e com dívida inicial; compra; utilização e disponível; pagamento parcial e
total por transferência; acima do limite; sem duplicação em despesas nem no Património; editar e
eliminar compras. Empréstimos: criar novo e importar existente; capital inicial preservado;
prestação com capital/juros/encargos; editar e eliminar prestação (dívida recalculada);
desembolso fora dos rendimentos; amortização acima da dívida recusada. Integração: Início,
Movimentos, Contas, Património, Relatórios, Veículos, offline, conflitos, app antiga.

## G. Decisões para o responsável

1. Cartões só em Contas (deixa de haver "Cartão de crédito" novo no Património) — recomendado.
2. Dívida do empréstimo **calculada** a partir da abertura e das prestações ligadas (editar ou
   eliminar uma prestação recalcula) — recomendado.
3. Receção de empréstimo fora dos rendimentos (`disbursement`) — recomendado.
4. Taxa de juro guardada em pontos-base (só informativa; sem cálculo de plano de amortização nesta
   fase).
5. Autorizar a migração no staging e na produção depois de rever este SQL.
