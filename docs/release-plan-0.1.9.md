# Plano da versão 0.1.9 (release candidate)

Estado em 2026-11-10: tudo em commits locais, por publicar. Staging com `20261111000200`,
`20261111000300` e `20261111000400`; produção até `20261111000100`. **Nada deste plano corre sem a
autorização explícita do responsável** (`CONFIRMO-PRODUCAO` para a produção, autorização de push
para publicar).

## 1. O que entra

Desde a 0.1.8 publicada (`origin/master`), revistos no diff completo (68+ ficheiros, todos em
`src/`, `supabase/`, `docs/`, README, CLAUDE.md e a versão do `package.json`; sem ficheiros
estranhos nem registos de depuração):

- Formulários que passam ao campo seguinte; onboarding de primeira utilização.
- Alertas com impacto mensal e estimativa anual explícita; saúde financeira com definições.
- Sem enumeração de contas e limites por origem (ADR-045, ADR-048).
- Evolução do património total, categorias essenciais, bens vendidos ou pagos (ADR-046, ADR-048).
- Web: 4,29 → 2,19 MB de JavaScript para abrir; erros iniciais guardados para o Sentry (ADR-047).

## 2. Ordem obrigatória: servidor primeiro, app depois

| Combinação                      | Resultado                                                                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App 0.1.8 + servidor novo       | Funciona (testado): sem `email_registered` mostra a mesma frase; as atualizações sem os campos novos não os apagam (`v_data ? …`).                                                 |
| App 0.1.9 + servidor antigo     | **Não publicar assim.** O servidor ignora `essential`, `value_history` e `closed_on`; ao receber, a app grava-os vazios (o `essential` fica 0, com proteção e teste de regressão). |
| Migrações locais nos telemóveis | v8→v9→v10→v11 testadas com dados existentes (`database-test.ts`).                                                                                                                  |

## 3. Efeito das migrações nos dados existentes da produção

| Migração         | Altera                                                                                                             | Dados existentes                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `20261111000200` | Remove `email_registered`; cria `lookup_attempts` (vazia); redefine `username_available` e `login_email`           | Nenhuma linha muda                                                                 |
| `20261111000300` | `categories.essential` (`not null default 0`), `wealth_items.value_history` (nulo); redefine `sync_apply_op`       | Categorias ficam com 0 (default constante: só metadados); bens com histórico vazio |
| `20261111000400` | Redefine `private.throttle` e `login_email` (bloqueios); `wealth_items.closed_on` (nulo); redefine `sync_apply_op` | Nenhuma linha muda                                                                 |

### Verificações só de leitura antes de aplicar (com autorização)

```sql
-- Nada mais depende de email_registered (resultado esperado: 0 linhas).
select classid::regclass, objid from pg_depend
 where refobjid = 'public.email_registered(text)'::regprocedure;
-- Contagens de referência para comparar depois.
select (select count(*) from public.categories) as categories,
       (select count(*) from public.wealth_items) as wealth_items,
       (select count(*) from public.subscriptions) as subscriptions;
```

## 4. Procedimento na produção (com `CONFIRMO-PRODUCAO`)

Guard antes de cada comando (`npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO`).

1. Cópia: `pg_dump` 17 a partir de `db dump --dry-run` (esquema e dados) para
   `~/Documents/Miven-backups/`, fora do git e de pastas sincronizadas. Confirmar tamanhos.
2. Verificações da secção 3.
3. `db push --dry-run`: tem de listar **só** `000200`, `000300`, `000400`, por esta ordem.
4. `db push --skip-vault`; `migration list` igual ao local até `20261111000400`.
5. Verificação só de leitura: `email_registered` inexistente; `lookup_attempts` com RLS e sem
   permissões; colunas novas com os tipos certos; `search_path` vazio em `sync_apply_op`,
   `throttle` e `login_email`; contagens iguais às do passo 2.
6. Ensaio anónimo: `username_available` responde; `email_registered` dá 404.
7. Só depois: versão 0.1.9 no `app.json`, push, workflows "iOS IPA" e "Android APK".

**Reverter:** as migrações só acrescentam; as colunas novas podem ficar sem efeito. Repor dados só
com a cópia do passo 1, e apenas se houver perda confirmada.

## 5. Testes físicos antes de autorizar a publicação

Num iPhone (SideStore) e num Android (APK), com uma conta de teste e dados fictícios:

- [ ] Registo, confirmação do email (o link abre a app), reenviar, entrar com nome de utilizador.
- [ ] Onboarding: três passos, saltar, criar conta principal; não volta a aparecer.
- [ ] Teclado: cada campo passa ao seguinte; a data salta; o botão do fundo não fica tapado.
- [ ] Movimentos: despesa, rendimento, transferência, editar, eliminar, mês anterior.
- [ ] Património: criar, reavaliar, retirar (vendido/pago e engano), voltar a contar, evolução.
- [ ] Categorias: marcar essencial e ver a mudança no fundo de emergência.
- [ ] Registo rápido (iPhone): criar o atalho, Toque posterior, a despesa aparece ao abrir.
- [ ] Offline: registar sem rede, voltar a ligar, sincronizar.
- [ ] Dois dispositivos: editar o mesmo registo nos dois, resolver o conflito.
- [ ] Recuperar a palavra-passe; sair e entrar; eliminar a conta de teste.

## 6. Pendentes do responsável

- `ANTHROPIC_API_KEY` (decidir custo e quota) antes de anunciar a IA.
- Nome do responsável pelo tratamento na política de privacidade (D-4).
- Modelos de email no painel da produção.

## 7. Testes com pessoas reais (depois da 0.1.9)

10 a 20 pessoas que não participaram no desenvolvimento, com situações diferentes (rendimento
fixo, irregular, estudantes, famílias, com e sem crédito à habitação). Uma sessão observada de 20
minutos sem ajuda e duas semanas de uso livre.

Tarefas observadas: criar conta e configurar; registar uma semana de despesas; encontrar a saúde
financeira e explicá-la por palavras suas; marcar uma despesa fixa; ver a evolução do património.

Perguntas no fim:

1. Conseguiu configurar a aplicação sem ajuda? Onde hesitou?
2. Percebe a sua saúde financeira? O que significa cada pilar?
3. Descobriu despesas que não tinha identificado?
4. Alguma recomendação foi útil? Qual mudou o que fez?
5. Voltou a abrir a aplicação sem lembrete? Quantas vezes?
6. Sentiria falta dela se deixasse de a usar? Porquê?

Medir sem dados financeiros: dias com registo, abertura espontânea, tarefas concluídas sem ajuda.
Os participantes aceitam a política de privacidade e os termos da fase de testes antes de começar.
