# Exportação de dados e eliminação de conta — CentFlow

Documentação técnica e de produto dos fluxos de exportação, eliminação de conta e limpeza local. Baseado na implementação actual (`lib/export/`, `lib/account/delete-account.service.ts`).

> **Aviso legal:** Os textos legais associados (Política de Privacidade, Termos) são rascunhos e requerem revisão por advogado antes da publicação nas lojas.

---

## Exportar PDF

**Caminho na app:** Definições → Exportar PDF (`/settings/export-pdf`)

**Também acessível em:** Definições → Privacidade → Exportar PDF

### Comportamento

1. O utilizador selecciona secções do relatório (património é obrigatório).
2. A app gera HTML com `expo-print` e exporta um PDF.
3. O ficheiro é partilhado via `expo-sharing` (sheet nativo de partilha).

### Secções disponíveis

| Secção | Conteúdo |
|--------|----------|
| Património (obrigatório) | Património líquido, variação, gastos da semana |
| Composição do património | Contas, inventário, investimentos, passivos |
| Perfil financeiro | Pontuação e nível CentFlow |
| Movimentos recentes | Últimos 8 movimentos |
| Objectivos | Metas de poupança e progresso |
| Ativos | Garantias e inventário |
| Despesas recorrentes | Subscrições mensais |

### Dados de entrada

Dashboard, perfil financeiro, CentFlow Score, movimentos, ativos e passivos carregados via React Query no momento da exportação.

---

## Exportar JSON

**Caminho na app:** Definições → Exportar dados (`/settings/export-data`)

**Também acessível em:** Definições → Privacidade → Exportar dados

### Comportamento

1. A app agrega dados do utilizador autenticado.
2. Gera ficheiro `centflow-export-<timestamp>.json` (formato v2).
3. Partilha via `expo-sharing`.

### Conteúdo do ficheiro

- `exportedAt`, `version` (2)
- `transactions` — todos os movimentos
- `goals`, `warranties`, `inventory` — ativos
- `credits`, `subscriptions` — passivos
- `centFlowScore` — pontuação CentFlow (se disponível)

---

## Eliminar conta

**Caminho na app:** Avatar (canto superior) → Definições → Privacidade → Eliminar conta (`/settings/delete-account`)

### Fluxo

1. **Confirmação de identidade:**
   - Contas com email/password: reintroduzir password (mín. 8 caracteres).
   - Contas só Google/Apple: escrever a frase `ELIMINAR`.
2. **Checkbox** de reconhecimento dos efeitos permanentes.
3. **Alert nativo** de confirmação final («Eliminar»).
4. **Backend:** RPC Supabase `delete_own_account` (remoção em cascata).
5. **Limpeza local** via `clearLocalAccountData()`.
6. **Sign-out** local (`supabase.auth.signOut({ scope: 'local' })`).

### Modo mock (só development)

Com `EXPO_PUBLIC_MOCK_AUTH=true`, a eliminação limpa apenas dados locais sem chamada ao servidor.

---

## Limpeza de dados locais (`clearLocalAccountData`)

Executada na eliminação de conta e parcialmente no logout de sessão.

### Chaves SecureStore removidas explicitamente

| Chave | Finalidade |
|-------|------------|
| `centflow_biometric_enabled` | Flag Face ID / biometria |
| `centflow_app_pin_hash` | Hash do PIN da app |
| `centflow_migration_version` | Versão de migrações locais |
| `centflow_privacy_consent_v1` | Registo de consentimento de privacidade |

### Sessão e cache

- `clearSession()` — remove token em memória e apaga `centflow_auth_token` do SecureStore.
- `queryClient.clear()` — invalida cache React Query.

### Tokens Supabase

O adapter SecureStore do cliente Supabase gere chaves de sessão próprias; o sign-out do SDK remove a sessão activa.

### Nota sobre dados por utilizador

Chaves scoped por `userId` (onboarding, preferências, créditos locais, subscrições pendentes) **não são apagadas** por `clearLocalAccountData`. Podem permanecer no dispositivo até reinstalação. Os dados no servidor são removidos pela RPC de eliminação de conta.

---

## Terminar sessão (logout)

**Caminho:** Definições → Segurança → Terminar sessão

### Comportamento (`logout`)

1. `supabaseAuth.logout()` — termina sessão no Supabase.
2. `clearSession()` — remove token local (`centflow_auth_token`).

### Terminar em todos os dispositivos (`logoutAllDevices`)

Chama `logoutAllSessions()` no Supabase e depois `clearSession()`. Não apaga consentimentos nem flags de biometria.

---

## Contacto

Questões sobre privacidade e eliminação de dados: privacy@centflow.app
