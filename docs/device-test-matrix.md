# Matriz de dispositivos — CentFlow RC1

> **Campanha de validação em hardware real** — Julho 2026  
> Build canónico RC2: `eb472165` — **FINISHED** (APK) · Smoke **bloqueado** até instalação confirmada

Legenda de **Estado**: `Pendente` · `Em curso` · `Concluído` · `Bloqueado` · `N/A`  
Legenda de **Resultado**: `—` (não testado) · `Pass` · `Fail` · `Pass c/ ressalvas`

---

## Builds EAS — registo QA

| Build ID | Profile | Estado EAS | QA | Notas |
|----------|---------|------------|-----|-------|
| **eb472165** | beta | **FINISHED** | **Canónico RC2** | APK RC2 — expo-video removido + blockedPermissions |
| 607cc31c | beta | ERRORED | Substituído | lockfile npm 10 — ver `docs/android-build-607cc31c-failure.md` |
| 7dc46d04 | beta | ERRORED | ⛔ **OBSOLETO** | Pré remoção expo-video — **NÃO TESTAR** |
| 96a2f729 | preview | finished | ⛔ **NÃO USAR** | APK antigo, pré RC2 |

---

## Pré-requisitos antes de testar

| Item | Estado código | Estado campanha |
|------|---------------|-----------------|
| Build EAS perfil `beta` | Scripts prontos | **PASS** — build `eb472165` finished |
| Canal OTA `preview` alinhado | ✅ `eas.json` | Validar no dispositivo |
| Conta Supabase real (mock off) | ✅ perfil beta | Usar conta de teste dedicada |
| Google OAuth SHA-1 Android | Documentado em `docs/beta.md` | **Pendente** — confirmar no device |
| Apple Sign-In Supabase + build nativo | Código ✅ | **Pendente** — requer IPA com plugin |
| Conta de teste documentada | — | Criar antes de distribuir |

**Comandos de build (não executados neste sprint):**
```bash
npm run eas:build:beta:ios
npm run eas:build:beta:android
```

---

## Matriz mínima

| ID | Dispositivo | SO mínimo | Arquitetura | Build | Estado | Responsável | Resultado | Notas |
|----|-------------|-----------|-------------|-------|--------|-------------|-----------|-------|
| iOS-SE | iPhone SE (3ª gén. ou equivalente) | iOS 16.4+ | arm64 | IPA beta | Pendente | — | — | Ecrã pequeno; validar safe areas e teclado |
| iOS-13 | iPhone 13 | iOS 17.x | arm64 | IPA beta | Pendente | — | — | Referência média Apple |
| iOS-15 | iPhone 15 | iOS 18.x | arm64 | IPA beta | Pendente | — | — | Dynamic Island / notch |
| iOS-16 | iPhone 16 | iOS 18.x | arm64 | IPA beta | Pendente | — | — | Hardware mais recente |
| AND-S | Android pequeno (ex. 5.5"–6") | Android 12+ | arm64-v8a | eb472165 | Pendente | — | — | APK disponível — aguarda instalação |
| AND-M | Android médio (ex. Pixel 6a / Samsung A) | Android 13+ | arm64-v8a | eb472165 | Pendente | — | — | Dispositivo primário smoke |
| AND-F | Android topo de gama (ex. Pixel 8 / S24) | Android 14+ | arm64-v8a | APK beta | Pendente | — | — | Performance baseline |
| AND-T | Tablet Android (opcional) | Android 13+ | arm64-v8a | APK beta | N/A | — | — | App `portrait` only — validar letterboxing |

**Deployment target iOS:** 16.4 (`app.json` / `expo-build-properties`)  
**Orientação:** `portrait` apenas — landscape não é suportado por design.

---

## Cobertura por plataforma

| Plataforma | Dispositivos mínimos | Smoke obrigatório |
|------------|---------------------|-------------------|
| iOS | iOS-SE + iOS-15 (mín. 2) | Todos os itens `docs/smoke-test-checklist.md` marcados iOS |
| Android | AND-S + AND-M (mín. 2) | Todos exceto Apple Login |
| Opcional | iOS-16 + AND-F | Performance + crash matrix completa |

---

## Sessão Android RC2 — instalação (Fase 1)

> Build canónico: `eb472165-c9e8-4f92-99e1-f5b98f33fb9f`  
> APK: https://expo.dev/accounts/manuc98/projects/centflow/builds/eb472165-c9e8-4f92-99e1-f5b98f33fb9f

| Campo | Valor |
|-------|-------|
| Data sessão | — |
| Tester | — |
| Dispositivo ID | — (ex. AND-M) |
| Modelo | — |
| Versão Android | — |
| Arquitetura | arm64-v8a (assumido) |
| Build ID | `eb472165` |
| Version / versionCode | 1.0.0 / 2 |
| Instalação concluída | **Não confirmada** |
| App aberta após install | — |
| Crash no arranque | — |
| Pedido permissão microfone | — (esperado: **não**) |
| Versão visível na app | — |
| Método instalação | QR / link expo.dev / APK directo |

**Instruções instalação:**
1. Desinstalar qualquer CentFlow Beta anterior (incl. builds `96a2f729`, pré-RC2).
2. Abrir link de instalação no dispositivo Android ou transferir APK.
3. Permitir «fontes desconhecidas» se necessário.
4. Confirmar nome **CentFlow Beta** no launcher.

---

Preencher após cada sessão:

| Campo | Valor |
|-------|-------|
| Data | |
| Dispositivo ID | ex. iOS-15 |
| Build | ex. CentFlow Beta 1.0.0 (build EAS #) |
| OTA channel | preview / production |
| Commit / update ID | |
| Tester | |
| Duração | |
| Bugs encontrados | IDs ou links |
| Resultado global | Pass / Fail / Pass c/ ressalvas |

---

## Critério de saída da matriz

A matriz considera-se **suficiente para RC1 interno** quando:

1. **Mínimo 2 iOS** (incluindo ecrã pequeno) — resultado `Pass` ou `Pass c/ ressalvas` documentado
2. **Mínimo 2 Android** (incluindo pequeno) — idem
3. Todos os smoke tests **P0** em `docs/smoke-test-checklist.md` executados em pelo menos 1 dispositivo por plataforma
4. Zero crashes bloqueadores não documentados
5. Apple Login validado em **pelo menos 1 iPhone** com build nativo recente

---

## Referências

- [`docs/smoke-test-checklist.md`](smoke-test-checklist.md)
- [`docs/crash-matrix.md`](crash-matrix.md)
- [`REAL_DEVICE_VALIDATION_PLAN.md`](../REAL_DEVICE_VALIDATION_PLAN.md)
- [`RC1_VALIDATION_REPORT.md`](../RC1_VALIDATION_REPORT.md)
