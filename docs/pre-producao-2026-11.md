# Pré-produção: `20261118000100_integrations` e `20261119000100_admin`

Análise para uma futura aplicação na produção. **Nada aqui foi executado na produção.**
Estado a 2026-11-12: as duas migrações estão no staging (verificadas); a produção para em
`20261117000100`.

## O que as migrações fazem

| Migração                      | Cria                                                                                                                                                 | Mexe em objetos existentes?                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `20261118000100_integrations` | `public.integrations`, `public.investment_snapshots`, `private.integration_secrets`; funções `integration_secret_put/get/delete` (só `service_role`) | Não                                                               |
| `20261119000100_admin`        | `private.admin_roles`, `private.admin_audit`; funções `admin_role`, `admin_overview`, `admin_audit_log`, `private.admin_require`                     | Não (só lê `auth.users`, `profiles`, `sync_metadata` e contagens) |

## Análise de risco

- **Dependências:** esquema `private` (existe desde `20261108000300`), `auth.users`, `public.profiles`,
  `public.sync_metadata`, `public.accounts/entries/documents/goals`. Todas existem na produção.
- **Compatibilidade com o esquema atual:** só objetos novos; nenhum `alter` em tabelas existentes,
  nenhum trigger, nenhuma alteração a `sync_apply_op`. A sincronização não muda.
- **RLS e políticas:** RLS ligado nas 5 tabelas; leitura só da própria pessoa em `integrations` e
  `investment_snapshots`; nenhuma escrita direta por `anon`/`authenticated` (verificado no
  staging: 401 em leitura e escrita anónimas).
- **Funções:** todas `security definer` com `search_path` vazio; as dos segredos só para
  `service_role`; as de administração verificam o papel por dentro e registam cada consulta.
- **Índices:** chaves primárias `(user_id, provider)` e `user_id`; volumes pequenos.
- **Eliminação de conta:** todas as tabelas novas têm `references auth.users on delete cascade`;
  a função `delete-account` (que apaga o utilizador) apaga-as também.
- **Apps em uso:** a 0.1.17 (iPhone, Android) não chama nada disto. A web atual já pergunta
  `admin_role()`: na produção, sem a migração, a chamada falha e a área fica escondida (sem erro
  visível). Com a migração, devolve `null` a toda a gente até alguém ter um papel.
- **Trading 212:** continua escondida (`EXPO_PUBLIC_T212_ENABLED` desligado). A migração sozinha
  não liga nada.

## Reversão (se for preciso)

Só objetos novos, sem dados de ninguém além dos que estas funcionalidades criarem:

```sql
drop function if exists public.admin_audit_log(int), public.admin_overview(),
  public.admin_role(), private.admin_require(text, text[]);
drop table if exists private.admin_audit, private.admin_roles;
drop function if exists public.integration_secret_put(uuid, text, text, text),
  public.integration_secret_get(uuid, text), public.integration_secret_delete(uuid, text);
drop table if exists private.integration_secrets, public.investment_snapshots, public.integrations;
delete from supabase_migrations.schema_migrations where version in ('20261118000100', '20261119000100');
```

## Checklist de pré-produção

- [ ] `npm run check` verde no commit a aplicar (inclui os testes PGlite destas migrações).
- [ ] Staging: migrações aplicadas e verificadas (feito a 2026-11-12).
- [ ] Staging com sessão: utilizador normal sem acesso ao painel; papel `product` vê só números;
      papel `technical` vê o registo (passo do responsável, conta de teste).
- [ ] Função `t212` publicada no staging com `INTEGRATIONS_KEY` e testada com uma conta demo da
      Trading 212 (ligar, atualizar, credenciais erradas, desligar).
- [ ] Cópia da produção (`pg_dump` como nas execuções anteriores) e contagem antes.
- [ ] Autorização expressa para a produção; guard antes de cada comando; dry-run só com as duas.
- [ ] Verificação só de leitura igual à do staging; contagens iguais às de antes.
- [ ] Só depois disto, e com autorização própria: publicar `t212` na produção e definir o segredo.
