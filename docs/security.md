# Segurança CentFlow

Documento de referência para princípios de segurança, storage, logs e preparação para open banking.

## Princípios

1. **Defesa em profundidade** — validação no cliente, políticas no Supabase Auth, RLS na base de dados.
2. **Minimização de dados** — guardar apenas o necessário; nunca passwords ou tokens bancários em texto claro.
3. **Fail-safe** — erros em produção mostram mensagens genéricas; detalhes técnicos só em dev/Doctor.
4. **Compatibilidade** — migrações idempotentes; defaults seguros para dados antigos.

## O que NUNCA guardar localmente

| Dado | Onde guardar |
|------|----------------|
| Password | Nunca persistir |
| Access/refresh tokens bancários | Backend seguro apenas |
| OTP / magic links | Memória transitória |
| IBAN / números de conta completos | Backend cifrado |
| Dados de cartão | Nunca na app (PCI) |

## Storage permitido

- **SecureStore / Keychain / Keystore** — tokens de sessão Supabase, preferências, flags de biometria, versão de migração.
- **Não usar AsyncStorage** para dados sensíveis (CentFlow não usa AsyncStorage).

Chaves centralizadas em `lib/security/secureStorage.ts`.

## Passwords

Política em `lib/security/passwordPolicy.ts`:

- Mínimo 12 caracteres
- Maiúsculas, minúsculas, número, símbolo
- Bloqueio de passwords comuns
- Não permitir password igual ao email/nome

Registo e reset obrigam política forte. Login mantém compatibilidade com contas antigas até reset.

## Sessão

- Refresh automático via SDK Supabase (`autoRefreshToken: true`)
- Listener `onAuthStateChange` limpa estado local em expiração
- Logout manual não mostra "sessão expirada"
- Mensagem ao utilizador: *"A tua sessão expirou. Inicia sessão novamente."*

## Logs (CentFlow Doctor)

Registar:

- Falhas de auth/reset/update
- Sessão expirada
- Force update / integridade

Nunca registar:

- Passwords, tokens, OTP, links mágicos, IBAN

Ver `lib/security/securityLogger.ts`.

## Open Banking (futuro)

Preparação em `lib/security/openBankingPrep.ts`:

- Consentimentos explícitos e revogáveis
- Tokens de instituições **apenas no backend**
- Logs de acesso auditáveis
- Nenhum token bancário em SecureStore/AsyncStorage

Fluxo previsto:

```
App → Backend CentFlow → Agregador/Open Banking API
         ↑
    consentimento + audit log
```

## OTA Updates

- `expo-updates` com `runtimeVersion` = versão da app
- Canais: `development`, `preview`, `production`
- Updates JS/TS via EAS Update; alterações nativas exigem novo build
- `lib/updates/` — verificação ao arranque, reload seguro

## Force Update

Tabela Supabase `app_config`:

- `minimum_supported_version` — bloqueia versões inferiores
- `maintenance_mode` — mensagem global
- `force_update_required` — override manual
- Defaults permissivos (`1.0.0`) para não bloquear utilizadores legítimos

## Migrações locais

`lib/migrations/` — adapta perfil, onboarding e settings antigos sem crash.

## Biometria

- `expo-local-authentication` + preferência `biometricsEnabled`
- Fallback: logout seguro (PIN local planeado)
- Opcional — nunca bloquear quem não tem biometria

## Auditoria futura

Checklist preparatório:

- [ ] Pen test externo
- [ ] Revisão RLS Supabase
- [ ] Política de password no dashboard Supabase (≥12 chars)
- [ ] Rate limiting em auth endpoints
- [ ] Certificação open banking (quando aplicável)
