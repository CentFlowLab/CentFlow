# Smoke Test Checklist — CentFlow RC1

> **Nenhum item abaixo foi executado em dispositivo** nesta data de criação.  
> Preencher colunas `Resultado`, `Dispositivo`, `Data`, `Notas` durante a campanha.

Legenda **Prioridade**: **P0** = bloqueador RC1 · **P1** = importante · **P2** = nice-to-have  
Legenda **Resultado**: `—` · `Pass` · `Fail` · `Blocked` · `N/A`

**Build alvo:** perfil EAS `beta` · variante `CentFlow Beta` · canal OTA `preview`  
**Versão app:** 1.0.0 · `runtimeVersion` = appVersion

---

## 1. Instalação e arranque

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 1.1 | Instalação fresh (APK/IPA beta) | P0 | ✓ | ✓ | — | | | |
| 1.2 | Primeiro arranque — modal consentimento privacidade | P0 | ✓ | ✓ | — | | | Analytics/crash toggles |
| 1.3 | Primeiro arranque — aceitar termos via modal | P0 | ✓ | ✓ | — | | | Links /legal/* |
| 1.4 | Onboarding completo (17 passos) | P0 | ✓ | ✓ | — | | | Gate até concluir |
| 1.5 | Onboarding — botão voltar | P1 | ✓ | ✓ | — | | | |
| 1.6 | Chegada às tabs após onboarding | P0 | ✓ | ✓ | — | | | |

---

## 2. Autenticação

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 2.1 | Registo email + password (política 12+ chars) | P0 | ✓ | ✓ | — | | | Supabase confirm email? |
| 2.2 | Login email | P0 | ✓ | ✓ | — | | | |
| 2.3 | Google Login | P0 | ✓ | ✓ | — | | | Android: SHA-1 EAS |
| 2.4 | Apple Login | P0 | ✓ | — | — | | | Requer build nativo recente |
| 2.5 | Logout | P0 | ✓ | ✓ | — | | | Perfil ou Definições → Segurança |
| 2.6 | Recuperação password (email) | P1 | ✓ | ✓ | — | | | `centflow://reset-password` |
| 2.7 | Sessão expirada — banner no login | P1 | ✓ | ✓ | — | | | Forçar expiração se possível |
| 2.8 | Login após logout — dados não misturados | P0 | ✓ | ✓ | — | | | |

---

## 3. Movimentos

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 3.1 | Lista movimentos carrega | P0 | ✓ | ✓ | — | | | |
| 3.2 | Adicionar movimento manual | P0 | ✓ | ✓ | — | | | |
| 3.3 | Editar movimento | P0 | ✓ | ✓ | — | | | Optimistic update |
| 3.4 | Eliminar movimento | P0 | ✓ | ✓ | — | | | |
| 3.5 | Filtros (Todos/Despesas/Receitas) | P1 | ✓ | ✓ | — | | | |
| 3.6 | Pesquisa | P1 | ✓ | ✓ | — | | | |
| 3.7 | Pull-to-refresh | P1 | ✓ | ✓ | — | | | |

---

## 4. OCR / Talão

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 4.1 | Abrir fluxo OCR (câmara) | P0 | ✓ | ✓ | — | | | Permissão câmara |
| 4.2 | OCR galeria (fotos) | P1 | ✓ | ✓ | — | | | |
| 4.3 | OCR sucesso → confirmar movimento | P0 | ✓ | ✓ | — | | | Edge Function Vision |
| 4.4 | OCR falha — mensagem humana | P0 | ✓ | ✓ | — | | | Simular sem rede / key |
| 4.5 | Cancelar OCR sem crash | P1 | ✓ | ✓ | — | | | |

---

## 5. Tabs principais

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 5.1 | Home — skeleton → dados | P0 | ✓ | ✓ | — | | | |
| 5.2 | Análises — 4 sub-tabs | P0 | ✓ | ✓ | — | | | Resumo, Gastos, Dívida, Património |
| 5.3 | Créditos — lista + novo crédito | P0 | ✓ | ✓ | — | | | Deep link `?action=new-credit` |
| 5.4 | Cartões (tab créditos) | P1 | ✓ | ✓ | — | | | |
| 5.5 | Ativos — objetivos CRUD | P0 | ✓ | ✓ | — | | | |
| 5.6 | Perfil — hub + definições | P0 | ✓ | ✓ | — | | | |

---

## 6. Funcionalidades transversais

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 6.1 | Assistente — enviar pergunta | P1 | ✓ | ✓ | — | | | Edge Function |
| 6.2 | Calendário — grelha + detalhe | P1 | ✓ | ✓ | — | | | `/calendar` |
| 6.3 | Open Banking — listar bancos | P1 | ✓ | ✓ | — | | | |
| 6.4 | Open Banking — ligar conta | P1 | ✓ | ✓ | — | | | Browser OAuth |
| 6.5 | Open Banking — sync manual | P1 | ✓ | ✓ | — | | | |
| 6.6 | Open Banking — revogar | P1 | ✓ | ✓ | — | | | |
| 6.7 | Export PDF | P1 | ✓ | ✓ | — | | | Definições |
| 6.8 | Export JSON | P0 | ✓ | ✓ | — | | | Definições → Privacidade |
| 6.9 | Delete Account (conta teste) | P0 | ✓ | ✓ | — | | | Password ou `ELIMINAR` |

---

## 7. Ciclo de vida e sistema

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 7.1 | Background 30s → foreground | P0 | ✓ | ✓ | — | | | Refetch AppState |
| 7.2 | Kill app → reopen (sessão) | P0 | ✓ | ✓ | — | | | |
| 7.3 | OTA — publicar update preview | P1 | ✓ | ✓ | — | | | Mesmo canal do build |
| 7.4 | OTA — app recebe e reload | P1 | ✓ | ✓ | — | | | |
| 7.5 | Deep link email `centflow://movimentos` | P1 | ✓ | ✓ | — | | | |
| 7.6 | Quick Expense `centflow://quick-expense` | P1 | ✓ | ✓ | — | | | |
| 7.7 | Notificação local (orçamento/garantia) | P2 | ✓ | ✓ | — | | | Permissão push |
| 7.8 | Face ID — activar e desbloquear | P1 | ✓ | — | — | | | Definições → Segurança |
| 7.9 | Biometria Android | P1 | — | ✓ | — | | | |
| 7.10 | Force update (se activado em app_config) | P2 | ✓ | ✓ | — | | | Opcional staging |

---

## 8. Rede e erros

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 8.1 | Sem internet — Home ErrorState + retry | P0 | ✓ | ✓ | — | | | Modo avião |
| 8.2 | Internet lenta — loading visível | P1 | ✓ | ✓ | — | | | Throttle rede |
| 8.3 | Recuperação após rede volta | P0 | ✓ | ✓ | — | | | |
| 8.4 | Erro Supabase — mensagem humana | P0 | ✓ | ✓ | — | | | |
| 8.5 | Erro OCR — não crash | P0 | ✓ | ✓ | — | | | |
| 8.6 | Erro Open Banking — toast/estado | P1 | ✓ | ✓ | — | | | |

---

## 9. Compliance (smoke)

| # | Teste | Prio | iOS | Android | Resultado | Dispositivo | Data | Notas |
|---|-------|------|-----|---------|-----------|-------------|------|-------|
| 9.1 | Política in-app `/legal/privacy` | P0 | ✓ | ✓ | — | | | |
| 9.2 | Termos in-app `/legal/terms` | P0 | ✓ | ✓ | — | | | |
| 9.3 | Toggle analytics OFF — sem eventos backend | P1 | ✓ | ✓ | — | | | Verificar Supabase |
| 9.4 | Toggle crash OFF — Sentry inactivo | P1 | ✓ | ✓ | — | | | Requer DSN no build |

---

## Critério de pass global

| Nível | Regra |
|-------|-------|
| **RC1 interno** | 100% P0 = Pass ou Pass c/ ressalvas documentadas |
| **TestFlight Internal** | Idem + Apple Login Pass em 1 iPhone |
| **Closed Testing** | Idem + Google Login Pass em 1 Android |

---

## Referências

- [`docs/device-test-matrix.md`](device-test-matrix.md)
- [`docs/crash-matrix.md`](crash-matrix.md)
- [`docs/beta.md`](beta.md) — troubleshooting OAuth
