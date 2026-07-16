# Plano de Validação em Dispositivos Reais — CentFlow RC1

> **Sprint:** preparação de campanha QA em hardware — Julho 2026  
> **Âmbito:** documentação apenas — **nenhum teste em dispositivo executado**  
> **Código:** sem alterações (nenhum bug crítico encontrado que impeça validação)

---

## 1. Estado do projecto (referência)

| Métrica | Valor | Verificado |
|---------|-------|------------|
| Versão app | 1.0.0 | `package.json` / `app.json` |
| Expo SDK | 56 | `package.json` |
| Testes unitários | **487/487 PASS** | `npm test` — executado neste sprint |
| TypeScript | **0 erros** | `npx tsc --noEmit` — executado neste sprint |
| Financial Core | 95/100 | Auditoria estática RC |
| Architecture | 95/100 | Auditoria estática RC |
| Type Safety | 100/100 | tsc verde |
| RC técnico | Concluído | `RELEASE_CANDIDATE_REPORT.md` |
| Compliance código | Implementado | `COMPLIANCE_RELEASE_REPORT.md` |
| Compliance jurídico | Pendente | Revisão externa + URL pública |
| Runtime móvel | **Não validado** | Nenhum smoke em device |

---

## 2. Objectivo da campanha

Validar em hardware real tudo o que **não pode** ser confirmado localmente:

- Comportamento nativo (Face ID, biometria, câmara, notificações, Apple Sign-In)
- OAuth redirects (Google, Open Banking)
- OTA em build EAS real
- Performance (cold/warm start, FPS, memória, ANRs)
- Acessibilidade (VoiceOver, TalkBack, Dynamic Type)
- Crash recovery e Sentry em produção beta
- Metadata e fluxos de submissão às lojas

**Princípio:** nada assumido. Tudo `Pendente` até preenchimento explícito.

---

## 3. Documentação da campanha

| Documento | Conteúdo |
|-----------|----------|
| [`docs/device-test-matrix.md`](docs/device-test-matrix.md) | Matriz mínima 8 dispositivos |
| [`docs/smoke-test-checklist.md`](docs/smoke-test-checklist.md) | 50+ casos smoke P0/P1/P2 |
| [`docs/crash-matrix.md`](docs/crash-matrix.md) | Riscos crash por fluxo |
| [`RC1_RELEASE_GATE.md`](RC1_RELEASE_GATE.md) | Porta de decisão distribuição |
| [`RC1_VALIDATION_REPORT.md`](RC1_VALIDATION_REPORT.md) | Auditoria estática pré-device |
| [`docs/store/app-review-checklist.md`](docs/store/app-review-checklist.md) | Checklist lojas |

---

## 4. Matriz de dispositivos

Ver [`docs/device-test-matrix.md`](docs/device-test-matrix.md).

**Mínimo obrigatório RC1 interno:**

| Plataforma | Dispositivos | Estado |
|------------|--------------|--------|
| iOS | iPhone SE + iPhone 15 | Pendente |
| Android | Pequeno + Médio | Pendente |
| Opcional | iPhone 16, Android topo, Tablet | N/A / Pendente |

**Pré-requisito:** build EAS perfil `beta` (IPA + APK) — **não criado neste sprint**.

---

## 5. Smoke tests

Ver [`docs/smoke-test-checklist.md`](docs/smoke-test-checklist.md).

### Cobertura obrigatória (todos `—` / não executados)

| Área | Itens chave | P0 |
|------|-------------|-----|
| Instalação | Fresh install, primeiro arranque | ✓ |
| Onboarding | 17 passos + consentimento | ✓ |
| Auth | Email, Google, Apple (iOS), logout, reset password | ✓ |
| Movimentos | CRUD completo | ✓ |
| OCR | Câmara, sucesso, falha sem crash | ✓ |
| Tabs | Home, Análises, Créditos, Ativos, Perfil | ✓ |
| Assistente / Calendário / Open Banking | Fluxos principais | P1 |
| Export | PDF, JSON | ✓ |
| Delete Account | Conta de teste | ✓ |
| Ciclo de vida | Background, kill, OTA, deep links | ✓ |
| Biometria | Face ID (iOS), Android | P1 |
| Rede | Offline, lenta, erros Supabase/OCR/OB | ✓ |

**Critério RC1 interno:** 100% P0 = Pass ou Pass c/ ressalvas documentadas.

---

## 6. Casos críticos (prioridade máxima)

Estes bloqueiam qualquer distribuição se falharem:

| ID | Caso | Porquê crítico | Estado |
|----|------|----------------|--------|
| C-01 | Login + sessão persistente | Base de toda a app | Pendente |
| C-02 | Criar/editar/eliminar movimento | Core financeiro | Pendente |
| C-03 | Motor financeiro após mutação | Património/orçamento | Pendente |
| C-04 | Offline → retry → dados correctos | Sem NetInfo no código | Pendente |
| C-05 | Apple Sign-In (iOS) | Guideline 4.8 + compliance | Pendente |
| C-06 | Google Login (Android) | SHA-1 EAS vs Console | Pendente |
| C-07 | Delete Account + signOut | Obrigatório lojas | Pendente |
| C-08 | Privacy consent gate | Bloqueia analytics/Sentry | Pendente |
| C-09 | OCR falha → manual entry (sem crash) | Fluxo frequente | Pendente |
| C-10 | OTA reload sem perda de sessão | Fluxo principal updates | Pendente |
| C-11 | Face ID sem loop infinito | Hotfix recente — validar device | Pendente |
| C-12 | Deep link quick-expense cold start | Integração Shortcuts | Pendente |

---

## 7. Performance real (preencher em dispositivo)

**Não estimar.** Medir com cronómetro + ferramentas nativas.

### Metodologia

| Métrica | Como medir |
|---------|------------|
| Tempo | Cronómetro manual ou Xcode Instruments / Android Profiler |
| FPS aproximado | Performance Monitor RN (dev menu) ou olho humano em scroll |
| Memória | Xcode Memory Gauge / Android Studio Memory Profiler |
| ANRs | `adb logcat` (Android) — filtrar `ANR` |
| Jank | Frame drops visíveis em scroll FlashList |

### Tabela — Cold / Warm Start

| Cenário | Dispositivo | Build | Tempo (s) | FPS | Memória (MB) | ANRs | Jank | Notas |
|---------|-------------|-------|-----------|-----|--------------|------|------|-------|
| Cold start → Home | — | — | — | — | — | — | — | Kill + reopen |
| Warm start → Home | — | — | — | — | — | — | — | Background 30s |

### Tabela — Ecrãs

| Ecrã | Dispositivo | Tempo TTFP (s) | FPS scroll | Memória (MB) | Jank | Notas |
|------|-------------|----------------|------------|--------------|------|-------|
| Home | — | — | — | — | — | Skeleton → dados |
| Movimentos (500+ tx) | — | — | — | — | — | FlashList |
| OCR (upload→confirm) | — | — | — | — | — | Inclui rede |
| Análises (4 tabs) | — | — | — | — | — | Lazy tabs |
| Assistente | — | — | — | — | — | Edge Function |
| Perfil | — | — | — | — | — | |
| Créditos | — | — | — | — | — | |
| Calendário | — | — | — | — | — | Grelha mensal |
| Open Banking | — | — | — | — | — | OAuth browser |

### Baselines alvo (orientação — não validados)

| Métrica | Alvo soft | Bloqueador |
|---------|-----------|------------|
| Cold start | < 3s | > 6s |
| TTFP Home | < 2s | > 4s |
| Scroll Movimentos | ≥ 55 FPS | Jank visível constante |
| OCR end-to-end | < 15s | > 30s ou crash |

---

## 8. Acessibilidade (preencher em dispositivo)

| # | Critério | iOS (VoiceOver) | Android (TalkBack) | Resultado | Notas |
|---|----------|-----------------|--------------------|-----------|-------|
| A1 | VoiceOver / TalkBack navega tabs | — | — | — | Ordem lógica |
| A2 | Labels em botões principais | — | — | — | accessibilityLabel |
| A3 | Dynamic Type / font scaling | — | — | — | iOS Settings → Larger Text |
| A4 | Contraste texto/fundo | — | — | — | WCAG AA visual |
| A5 | Botões ≥ 44pt tap target | — | — | — | Especialmente chips |
| A6 | Focus visível (TalkBack) | — | — | — | |
| A7 | Landscape | — | — | N/A | App portrait-only |
| A8 | Safe areas (notch/SE) | — | — | — | iOS-SE obrigatório |
| A9 | Modais (FormSheet) anunciados | — | — | — | |
| A10 | Erros lidos por leitor | — | — | — | ErrorState |

---

## 9. App Store QA

Integrado de [`docs/store/app-review-checklist.md`](docs/store/app-review-checklist.md).

### Apple

| Item | Estado campanha |
|------|-----------------|
| Metadata (nome, subtítulo, keywords) | Pendente |
| Ícone 1024×1024 | OK (asset existe) |
| Screenshots dimensões 2026 | Pendente |
| Privacy Nutrition Labels | Pendente |
| Terms + Privacy in-app | OK (código) |
| Privacy URL pública | Pendente — bloqueador produção |
| Delete Account | OK (código) — validar device |
| Apple Login | OK (código) — validar device |
| Review Notes + conta demo | Pendente |
| Support URL | Pendente |

### Google

| Item | Estado campanha |
|------|-----------------|
| Metadata Play Console | Pendente |
| Ícone feature graphic | Pendente |
| Screenshots phone/tablet | Pendente |
| Data Safety form | Pendente |
| Privacy URL | Pendente |
| Delete Account | OK (código) — validar device |
| Review Notes + conta demo | Pendente |

---

## 10. Crash matrix

Ver [`docs/crash-matrix.md`](docs/crash-matrix.md).

**Resumo:** mapeamento estático de 40+ fluxos com Doctor/Sentry/recuperação. Coluna «Validado device» = `—` em todos.

**Riscos código conhecidos (não reproduzidos):**

- C1: Race auth listener (`auth.context.tsx`)
- C2: Race realtime subscribe (`RemoteDataSyncEffect.tsx`)
- C3: OAuth polling pós-unmount (`auth/callback.tsx`)
- C4: Sem NetInfo — UX offline tardia

---

## 11. Release Gate

Ver [`RC1_RELEASE_GATE.md`](RC1_RELEASE_GATE.md).

| Destino | Veredicto |
|---------|-----------|
| TestFlight Internal | **PENDENTE** |
| Google Closed Testing | **PENDENTE** |
| TestFlight External | **NÃO** |
| App Store Review | **NÃO** |
| Google Play Production | **NÃO** |

---

## 12. Riscos conhecidos

| ID | Risco | Severidade | Mitigação campanha |
|----|-------|------------|-------------------|
| R1 | Nenhum teste device executado | Crítico | Executar smoke P0 antes de qualquer build distribuído |
| R2 | URL política pública ausente | Alto | Bloqueia external/production |
| R3 | Revisão jurídica pendente | Alto | Não submeter a review público |
| R4 | GOOGLE_VISION_API_KEY pode faltar | Médio | Testar OCR; fallback manual |
| R5 | expo-ocr-kit ausente em IPA unsigned | Médio | Usar build EAS beta oficial |
| R6 | Google OAuth SHA-1 mismatch | Alto | Confirmar fingerprint EAS no Console |
| R7 | Apple Sign-In requer build nativo recente | Alto | `eas:build:beta:ios` com plugin |
| R8 | Sentry só com consent + DSN | Baixo | Testar toggle em Privacidade |
| R9 | Open Banking depende secrets GoCardless | Médio | Testar listagem; OAuth opcional P1 |
| R10 | Notificações locais requerem IPA nativo | Baixo | P2 na campanha |

---

## 13. Critérios de saída por fase

### RC2 (próximo marco técnico)

| Critério | Estado |
|----------|--------|
| Matriz device ≥4 dispositivos Pass | Pendente |
| 100% smoke P0 Pass | Pendente |
| Zero crashes Críticos reproduzidos | Pendente |
| Performance baseline preenchida | Pendente |
| Acessibilidade A1–A6 Pass | Pendente |
| Jurídico aprovado + URL pública | Pendente |
| Builds beta estáveis (mesmo commit) | Pendente |

### TestFlight Internal

| Critério | Estado |
|----------|--------|
| Build EAS beta iOS instalado | Pendente |
| Smoke P0 iOS Pass (≥1 device) | Pendente |
| Apple Login Pass | Pendente |
| Conta teste documentada | Pendente |
| RC1_RELEASE_GATE → SIM | Pendente |

### Google Closed Testing

| Critério | Estado |
|----------|--------|
| Build EAS beta Android instalado | Pendente |
| Smoke P0 Android Pass (≥2 devices) | Pendente |
| Google Login Pass | Pendente |
| Data Safety rascunho | Pendente |
| RC1_RELEASE_GATE → SIM | Pendente |

### TestFlight External

| Critério | Estado |
|----------|--------|
| TestFlight Internal completo | Pendente |
| URL privacidade pública live | Pendente |
| Jurídico aprovado | Pendente |
| App Privacy Details preenchido | Pendente |
| Screenshots validados | Pendente |
| Conta demo para revisores | Pendente |
| ≤2 bugs P1 abertos | Pendente |

### Release Público (App Store + Play Production)

| Critério | Estado |
|----------|--------|
| TestFlight External + Closed Testing estáveis | Pendente |
| Crash-free sessions > 99% (Sentry, 7 dias) | Pendente |
| Jurídico + URLs + metadata completos | Pendente |
| `eas submit` credenciais reais | Pendente |
| Review Apple + Google aprovado | Pendente |
| OTA production canal alinhado | Pendente |

---

## 14. Sequência de execução recomendada

```
Fase 0 — Preparação (1 dia)
  ├── Criar builds: eas:build:beta:ios + eas:build:beta:android
  ├── Criar conta teste Supabase dedicada
  └── Documentar credenciais testers internos

Fase 1 — Smoke P0 (2–3 dias)
  ├── iOS-SE + iOS-15: docs/smoke-test-checklist.md §1–9 P0
  └── AND-S + AND-M: idem (exceto Apple Login)

Fase 2 — Crashes + rede (1 dia)
  ├── docs/crash-matrix.md — validar coluna device
  └── §8 smoke: offline, erros, kill app

Fase 3 — Performance (1 dia)
  ├── Preencher §7 deste documento
  └── Dispositivo topo de gama como baseline

Fase 4 — Acessibilidade (0.5 dia)
  └── §8 — iOS-SE + AND-M

Fase 5 — Gate review
  ├── Actualizar RC1_RELEASE_GATE.md
  └── Decidir TestFlight Internal / Closed Testing
```

---

## 15. Validação local executada (este sprint)

```bash
npm test          # 487/487 PASS
npx tsc --noEmit  # 0 erros
npm run handoff   # HANDOFF.md regenerado
```

**Não executado (conforme instruções):**

- Commit, push, OTA, EAS build
- Qualquer teste em dispositivo físico

---

## 16. Referências

- `RELEASE_CANDIDATE_REPORT.md`
- `COMPLIANCE_RELEASE_REPORT.md`
- `RC1_VALIDATION_REPORT.md`
- `docs/beta.md`
- `docs/build.md`
- `eas.json` — perfil `beta`, canal `preview`
