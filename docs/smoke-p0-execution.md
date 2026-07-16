# Smoke P0 — Execução em dispositivo

> Campanha RC2 — **não marcar PASS sem device real**  
> Build canónico: `eb472165-c9e8-4f92-99e1-f5b98f33fb9f` (perfil `beta` · canal `preview` · runtime `1.0.0`)

---

## Estado do build RC2

| Campo | Valor |
|-------|-------|
| Build ID | `eb472165-c9e8-4f92-99e1-f5b98f33fb9f` |
| Estado EAS | **FINISHED** (13/07/2026 19:00 UTC+1) |
| Duração total | ~1h 40 min (fila ~78 min + build ~21 min) |
| versionCode | 2 |
| Artefacto | **APK disponível** |
| APK directo | https://expo.dev/artifacts/eas/4YqtC3B0u4qObg4grQiIZwVKFAR3PRMWYLsu7bZmDt4.apk |
| URL instalação | https://expo.dev/accounts/manuc98/projects/centflow/builds/eb472165-c9e8-4f92-99e1-f5b98f33fb9f |

| Build | Estado QA |
|-------|-----------|
| `eb472165` | Canónico RC2 — **finished** — READY FOR DEVICE INSTALL |
| `607cc31c` | Substituído — errored (lockfile) |
| `7dc46d04` | ⛔ **OBSOLETO — NÃO TESTAR** (pré expo-video) |
| `96a2f729` | ⛔ **NÃO USAR** (APK antigo, pré RC2) |

**Smoke bloqueado** até confirmação humana de instalação do APK `eb472165`.

---

## Sessão

| Campo | Valor |
|-------|-------|
| Data | — |
| Responsável | — |
| Build Android ID | `eb472165` |
| Dispositivo | — |
| Instalação confirmada | **Não** — APK disponível, aguarda tester |

---

## Resultados — Android RC2 (20 P0)

| # | Teste | Dispositivo | Build | Resultado | Notas |
|---|-------|-------------|-------|-----------|-------|
| 1 | Instalação limpa | — | eb472165 | **BLOCKED** | Aguarda confirmação instalação |
| 2 | Primeiro arranque | — | eb472165 | **BLOCKED** | |
| 3 | Consentimento privacidade | — | eb472165 | **BLOCKED** | |
| 4 | Política + termos | — | eb472165 | **BLOCKED** | |
| 5 | Onboarding | — | eb472165 | **BLOCKED** | |
| 6 | Registo email | — | eb472165 | **BLOCKED** | |
| 7 | Login email | — | eb472165 | **BLOCKED** | |
| 8 | Google Sign-In | — | eb472165 | **BLOCKED** | |
| 9 | Logout + novo login | — | eb472165 | **BLOCKED** | |
| 10 | Criar movimento | — | eb472165 | **BLOCKED** | |
| 11 | Editar movimento | — | eb472165 | **BLOCKED** | |
| 12 | Eliminar movimento | — | eb472165 | **BLOCKED** | |
| 13 | Movimento com cartão | — | eb472165 | **BLOCKED** | |
| 14 | OCR imagem real | — | eb472165 | **BLOCKED** | |
| 15 | Offline → online | — | eb472165 | **BLOCKED** | |
| 16 | Deep link Quick Expense | — | eb472165 | **BLOCKED** | |
| 17 | Background / kill / reopen | — | eb472165 | **BLOCKED** | |
| 18 | Delete account (conta teste) | — | eb472165 | **BLOCKED** | |
| 19 | Doctor erro controlado | — | eb472165 | **BLOCKED** | |
| 20 | Sentry erro controlado | — | eb472165 | **BLOCKED** | Consent + DSN necessários |

| — | Apple Sign-In | — | — | **NOT APPLICABLE — ANDROID** | Não conta na matriz Android |

Legenda: `PASS` · `FAIL` · `BLOCKED` · `NOT RUN` · `NOT APPLICABLE — ANDROID`

**Regra:** após confirmação de instalação, todos passam de `BLOCKED` → `NOT RUN` (excepto Apple).

---

## Guia teste-a-teste (após APK RC2 instalado)

Quando confirmares instalação do APK RC2 **finished**, reporta por teste: PASS / FAIL / BLOCKED.

### 1 — Instalação limpa
- Desinstalar versões anteriores CentFlow Beta
- Instalar APK do build `eb472165` (ou sucessor RC2)
- **Esperado:** app abre sem crash
- **Validar:** nome «CentFlow Beta»

### 2 — Primeiro arranque
- Abrir app fresh install
- **Esperado:** splash → sem crash

### 3 — Consentimento privacidade
- **Esperado:** modal com toggles analytics/crash
- Aceitar para continuar

### 4 — Política + termos
- Links no modal abrem `/legal/privacy` e `/legal/terms`
- **Esperado:** conteúdo legível, sem crash

### 5 — Onboarding
- Completar 17 passos
- **Esperado:** chegada às tabs

### 6 — Registo email
- Conta teste dedicada, password 12+ chars
- **Esperado:** sessão criada ou email confirm (conforme Supabase)

### 7 — Login email
- Entrar com conta criada
- **Esperado:** Home com dados reais (não mock)

### 8 — Google Sign-In
- Botão Google no login
- **Esperado:** OAuth completa → tabs
- **FAIL comum:** redirect_uri_mismatch (Dashboard)

### 9 — Logout + novo login
- Perfil/Definições → Sair
- Login outra vez
- **Esperado:** dados não misturados

### 10 — Criar movimento
- Movimentos → + → despesa manual
- **Esperado:** aparece na lista + Home actualiza

### 11 — Editar movimento
- Editar valor/categoria
- **Esperado:** optimistic update + persistência

### 12 — Eliminar movimento
- Eliminar movimento de teste
- **Esperado:** removido da lista

### 13 — Movimento com cartão
- Créditos → cartão → compra no cartão
- **Esperado:** dívida cartão aumenta, sem dupla contagem

### 14 — OCR imagem real
- Movimentos → talão → câmara ou galeria
- **Validar:** pedido **câmara/fotos** OK; **sem pedido microfone**
- Fotografar talão real
- **Esperado:** upload + confirm ou fallback manual sem crash

### 15 — Offline → online
- Modo avião ON → abrir Home
- **Esperado:** ErrorState + retry
- Avião OFF → retry
- **Esperado:** dados voltam

### 16 — Deep link Quick Expense
- Browser ou adb: `centflow://quick-expense?amount=1&category=other&note=Teste`
- **Esperado:** toast confirmação (logado)

### 17 — Background / kill / reopen
- Background 30s → foreground
- Kill app → reopen
- **Esperado:** sessão preservada, dados intactos

### 18 — Delete account
- **Só conta teste** — Definições → Privacidade → Eliminar conta
- **Esperado:** conta removida + redirect login

### 19 — Doctor erro controlado
- Definições → Diagnóstico (se visível) ou fluxo que gera evento Doctor
- Forçar erro controlado (ex. OCR sem rede / botão diagnóstico)
- **Esperado:** evento Doctor registado; app não crasha

### 20 — Sentry erro controlado
- **Pré:** consentimento crash reporting activo + `EXPO_PUBLIC_SENTRY_DSN` no build
- Forçar erro não fatal controlado (se exposto na UI beta)
- **Esperado:** evento Sentry (se configurado); caso contrário marcar **BLOCKED** com nota «DSN ausente»

---

## Validações específicas RC2 (Android)

| Item | Como verificar | Resultado |
|------|----------------|-----------|
| Sem pedido microfone | OCR + arranque — nenhum diálogo microfone | BLOCKED |
| Câmara funcional | OCR → câmara abre | BLOCKED |
| Galeria funcional | OCR → galeria abre | BLOCKED |
| Consentimento | Teste #3 | BLOCKED |
| Autenticação | Testes #6–9 | BLOCKED |
| CRUD movimentos | Testes #10–12 | BLOCKED |
| Persistência kill/reopen | Teste #17 | BLOCKED |
| Offline/reconnect | Teste #15 | BLOCKED |
| Deep link | Teste #16 | BLOCKED |
| Delete account | Teste #18 | BLOCKED |
| Doctor | Teste #19 | BLOCKED |
| Sentry | Teste #20 | BLOCKED |

---

## Critério de saída

- Build RC2 `finished` + APK instalado
- 100% P0 = PASS ou PASS c/ ressalvas em ≥1 Android
- Zero P0 FAIL abertos
- **RC2 não aprovado só porque APK compilou** — smoke obrigatório
