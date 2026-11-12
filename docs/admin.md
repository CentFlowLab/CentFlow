# Painel de administração

Implementado (ADR-065; migração `20261119000100_admin.sql`, por aplicar):

- **Quem entra:** só quem tem uma linha em `private.admin_roles`. A app pergunta ao servidor
  (`admin_role()`); sem papel, a entrada nem aparece e o ecrã `/admin` diz "Sem acesso". As
  funções recusam no servidor (`forbidden`) — esconder o botão não é a proteção.
- **Papéis:** `technical` (agregados + registo de consultas), `support` e `product` (agregados).
- **O que se vê:** contas registadas, novas em 30 dias, que sincronizaram em 7 dias, número de
  contas financeiras, movimentos, documentos e objetivos, integrações por estado. **Só números.**
- **O que não se vê:** movimentos, saldos, documentos, nomes, emails ou qualquer linha de uma
  pessoa. Não há conta administrativa universal nem forma de contornar a RLS; o `service_role`
  nunca está no cliente.
- **Auditoria:** cada consulta fica em `private.admin_audit` (quem, papel, ação, quando).
- **Fora do painel:** erros técnicos (Sentry), cópias da base de dados (painel do Supabase).

## Dar ou tirar um papel (só o responsável, por SQL)

```sql
insert into private.admin_roles (user_id, role, note)
values ('<uuid do utilizador>', 'technical', 'motivo');
delete from private.admin_roles where user_id = '<uuid>';
```

## Proposta (não implementada): acesso de suporte com consentimento

Para ajudar uma pessoa com os seus dados, sem acesso permanente:

1. A pessoa cria, na app, uma autorização com prazo (ex.: 24 h) para um pedido de suporte.
2. Tabela `support_grants` (pessoa, administrador, motivo, expira em, revogado em), com RLS.
3. Funções de leitura de suporte verificam uma autorização válida, só leem e registam cada acesso
   com o motivo; a pessoa vê o registo e pode revogar a qualquer momento.
4. Precisa de entrar na política de privacidade antes de existir.
