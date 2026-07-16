# RC1 Release Gate — CentFlow

> Porta de decisão para distribuição — Julho 2026  
> Baseado em: código + testes locais + documentação RC1. **Sem testes em dispositivo executados.**

**Validação local executada neste sprint:**
```
npm test        → 487/487 PASS
npx tsc --noEmit → 0 erros
npm run handoff  → HANDOFF.md gerado
```

---

## Actualização RC2 — 16 Jul 2026

| Destino | Veredicto | Alteração |
|---------|-----------|-----------|
| TestFlight Internal | **PENDENTE** | Perfil beta = internal Ad Hoc (não TestFlight) |
| Google Play Closed Testing | **PENDENTE** | Sem alteração — perfil beta ≠ Play |
| EAS Internal Android | **EM QA** | APK `eb472165` — smoke P0 Android aguarda instalação |
| EAS Internal iOS | **BLOQUEADO** | Sem Apple Team no EAS — IPA RC2 **não iniciado** |

Ver [`IOS_RC2_BUILD_REPORT.md`](IOS_RC2_BUILD_REPORT.md) · [`RC2_NATIVE_BUILD_REPORT.md`](RC2_NATIVE_BUILD_REPORT.md).

---

## Pode seguir para?

### □ TestFlight Internal

**PENDENTE**

| Critério | Estado |
|----------|--------|
| Código compila (tsc 0) | ✅ Verificado |
| Testes unitários 487/487 | ✅ Verificado |
| Build EAS beta iOS criado | ❌ Bloqueado — sem Apple Team / Ad Hoc |
| Smoke P0 iOS em ≥1 dispositivo | ⏳ Não executado |
| Apple Login em build nativo | ⏳ Código OK; App ID + Dashboard pendentes |
| Conta teste documentada | ⏳ Pendente |
| Revisão jurídica | ⏳ Não bloqueia interno; recomendado |

**Justificação:** Não há bloqueador técnico no repositório. Falta **build nativo** + **smoke test em iPhone** antes de distribuir a testers internos. Compliance in-app está implementado (`COMPLIANCE_RELEASE_REPORT.md`).

---

### □ Google Play Closed Testing

**PENDENTE**

| Critério | Estado |
|----------|--------|
| Código compila | ✅ Verificado |
| Testes 487/487 | ✅ Verificado |
| Build EAS beta Android (APK/AAB) | ⏳ Não executado |
| Smoke P0 Android em ≥2 dispositivos | ⏳ Não executado |
| Google OAuth SHA-1 no Cloud Console | ⏳ Confirmar em device |
| Data Safety form Play Console | ⏳ Pendente preenchimento |
| Política URL pública | ⏳ Pendente (bloqueador produção, não closed interno) |

**Justificação:** Mesma situação que iOS — código pronto, **campanha device não iniciada**. Closed Testing interno pode prosseguir após build + smoke Android.

---

### □ TestFlight External

**NÃO**

| Bloqueador | Motivo |
|------------|--------|
| Smoke tests não executados | Zero validação hardware |
| URL política pública | Obrigatória Apple para external |
| Revisão jurídica textos | Rascunho in-app apenas |
| App Privacy Details (ASC) | Não preenchido |
| Screenshots dimensões 2026 | Não validados |
| Conta demo revisores | Não criada |

**Justificação:** External testing expõe a app fora da org Apple — exige compliance e QA completos. Estado actual: **NÃO**.

---

### □ App Store Review (submissão pública)

**NÃO**

| Bloqueador | Motivo |
|------------|--------|
| TestFlight External não validado | Pré-requisito implícito |
| Revisão jurídica | Bloqueador explícito |
| URL privacidade pública | Bloqueador Apple |
| `eas submit` placeholders | Credenciais ASC fictícias |
| Build production + metadata | Não executado |
| Matriz dispositivos completa | 0% executada |

**Justificação:** Submissão pública **NÃO** até RC2+ com jurídico, URL, QA device e metadata.

---

### □ Google Play Production

**NÃO**

| Bloqueador | Motivo |
|------------|--------|
| Closed Testing não concluído | Pré-requisito |
| Data Safety + política URL | Bloqueadores |
| Revisão jurídica | Bloqueador |
| `google-service-account.json` | Placeholder |
| Classificação conteúdo | Não feita |

**Justificação:** Produção Play **NÃO** no estado actual.

---

## Resumo visual

| Destino | Veredicto |
|---------|-----------|
| TestFlight Internal | **PENDENTE** (código OK; falta build + device) |
| Google Closed Testing | **PENDENTE** (código OK; falta build + device) |
| TestFlight External | **NÃO** |
| App Store Review | **NÃO** |
| Google Play Production | **NÃO** |

---

## Próximos passos (ordem)

1. `npm run eas:build:beta:ios` + `eas:build:beta:android`
2. Distribuir a testers internos (máx. 100 iOS / closed track Android)
3. Executar `docs/smoke-test-checklist.md` P0 em `docs/device-test-matrix.md`
4. Preencher performance em `REAL_DEVICE_VALIDATION_PLAN.md` §4
5. Se P0 Pass → marcar TestFlight Internal / Closed Testing como **SIM**
6. Iniciar revisão jurídica + URL pública em paralelo (não bloqueia passo 1–5)

---

## Referências

- [`REAL_DEVICE_VALIDATION_PLAN.md`](REAL_DEVICE_VALIDATION_PLAN.md)
- [`RC1_VALIDATION_REPORT.md`](RC1_VALIDATION_REPORT.md)
- [`COMPLIANCE_RELEASE_REPORT.md`](COMPLIANCE_RELEASE_REPORT.md)
- [`docs/smoke-test-checklist.md`](docs/smoke-test-checklist.md)
