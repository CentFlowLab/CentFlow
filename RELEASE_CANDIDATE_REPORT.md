# Release Candidate Report — CentFlow

> Auditoria de release para TestFlight e Google Play Closed Testing  
> **Julho 2026** · Sem commit · sem push · sem OTA · sem build EAS

---

## Resumo executivo

A CentFlow está **tecnicamente pronta para gerar builds** e distribuir via **TestFlight interno** ou **Closed Testing** a testers conhecidos, desde que se aceitem ressalvas de **compliance legal** e **submissão à revisão das lojas**.

O núcleo técnico é sólido: Expo SDK 56, EAS configurado, pipeline CI com OTA + IPA, force update, crash boundary, exportação de dados, Google OAuth, Open Banking com revogação, e motor financeiro com 481 testes verdes.

Os **bloqueadores para submissão pública às lojas** (não para builds internos) são principalmente **legais e de política Apple/Google**: política de privacidade publicada, termos de utilização, eliminação de conta in-app, e potencialmente **Sign in with Apple** dado que existe Google Sign-In.

**Recomendação global: 🟡 BETA PÚBLICA CONTROLADA** — builds e closed testing possíveis; **não** Release Candidate nem beta pública ampla sem resolver compliance.

---

## Pontuação

| Dimensão | Score | Δ vs beta audit | Evidência |
|----------|-------|-----------------|-----------|
| Financial Core | **92/100** | — | 481 testes, motor 135ms/10k tx |
| UX | **82/100** | — | `BETA_PUBLIC_READINESS_REPORT.md` |
| Performance | **72/100** | ↓3 | Bundle 12MB; tempos de ecrã **não medidos** |
| Security | **82/100** | — | SecureStore, biometria, scrubbing Sentry |
| Compliance | **55/100** | novo | Privacidade/termos/delete/analytics |
| Release Readiness | **70/100** | ↓14 | Config OK; metadata e compliance incompletos |
| **Beta Readiness** | **78/100** | ↓6 | Média ponderada release + compliance |

---

## Recomendação

| Nível | Veredicto |
|-------|-----------|
| ❌ BLOQUEAR BETA | **Não** — app funcional para cohort controlado |
| 🟡 BETA PÚBLICA CONTROLADA | **Sim** — testers convidados, ressalvas legais documentadas |
| 🟢 PRONTO PARA TESTFLIGHT | **Parcial** — build possível; **metadata App Store incompleta** para revisão externa |
| 🟢 PRONTO PARA GOOGLE PLAY CLOSED TESTING | **Parcial** — build possível; **Data Safety + política** em falta |
| 🟢 PRONTO PARA RELEASE CANDIDATE | **Não** |

---

## Bloqueadores críticos

Impeditivos de **submissão à revisão** App Store / Play Store (não de build interno):

| ID | Bloqueador | Evidência | Impacto |
|----|------------|-----------|---------|
| C1 | **Política de privacidade** não publicada | `app/settings/privacy.tsx` L40–41: "Disponível em breve" | App Store 5.1.1, Play Data Safety, GDPR |
| C2 | **Termos de utilização** ausentes | Sem ecrã/ficheiro/link no repo | Requisito lojas + RGPD |
| C3 | **Eliminar conta in-app** não implementada | UI placeholder L78–81; RPC `delete_own_account()` existe mas não é chamada | **App Store Guideline 5.1.1(v)** — rejeição provável |
| C4 | **Sign in with Apple** ausente com Google activo | `package.json` sem `expo-apple-authentication`; login só email + Google | **App Store Guideline 4.8** — rejeição provável em revisão |
| C5 | **Analytics sem consentimento** | `lib/analytics/analytics.service.ts` — insert automático em `analytics_events` | RGPD / ePrivacy — risco legal UE |

---

## Bloqueadores médios

Não impedem build interno; impedem confiança em escala ou revisão sem fricção:

| ID | Bloqueador | Evidência |
|----|------------|-----------|
| M1 | `eas submit` com placeholders | `eas.json` L77–79 — Apple ID/ASC fictícios |
| M2 | `EXPO_PUBLIC_SENTRY_DSN` não em `eas.json` | Crash reporting depende de secret EAS manual |
| M3 | `RECORD_AUDIO` declarada sem uso | `app.json` L40 — grep sem referências no código |
| M4 | Sem detecção offline proactiva | Sem NetInfo; só erros de rede reactivos |
| M5 | Screenshots App Store 720×1280 | `assets/brand/marketing/ios-appstore-screenshot.png` — pode não cumprir tamanhos 2026 |
| M6 | Onboarding 17 passos | `app/onboarding.tsx` `STEPS.length = 17` — abandono elevado |
| M7 | OTA rollback só operacional | Sem lógica in-app; depende EAS Dashboard |
| M8 | `docs/onboarding.md` desactualizado | Descreve 8 passos; código tem 17 |

---

## Melhorias opcionais (pós-closed testing)

- Banner offline global (NetInfo)
- Skeleton em `AnalysisDebtTab`
- Medições Flipper/Reactotron por tab
- Apple Sign-In mesmo sem obrigatoriedade futura
- Remover `RECORD_AUDIO` se não necessária
- Atualizar `docs/onboarding.md`
- Preencher `eas submit` com credenciais reais
- Privacy Nutrition Labels / Data Safety form pré-preenchido
- Pen test externo (checklist em `docs/security.md`)

---

## FASE 1 — Release Audit

Documento completo: [`docs/release-readiness.md`](docs/release-readiness.md)

### Verificações executadas

| Verificação | Resultado |
|-------------|-----------|
| `npm test` | 481/481 pass |
| `npx tsc --noEmit` | 0 erros |
| `npm ci --dry-run` | OK |
| `npm run assets:validate-icons` | ✅ transparência PNG |
| `npx expo config --type public` | ✅ SDK 56, scheme, plugins |
| `npx expo export --platform ios` | 28.6s, bundle HBC 12MB |

### Configuração validada

- **Versão:** 1.0.0
- **iOS:** bundle `com.everyft1me.centflow`, deployment **16.4**
- **Android:** package `com.everyft1me.centflow`, APK em perfil beta
- **OTA:** projectId `4014cf35-...`, canais preview/production
- **CI:** `.github/workflows/release.yml` — validate + OTA + IPA unsigned

---

## FASE 2 — Compliance

| Requisito | Estado | Detalhe |
|-----------|--------|---------|
| Política Privacidade | ❌ | Placeholder UI |
| Termos Utilização | ❌ | Ausente |
| Eliminar conta | ❌ | RPC backend ✅, UI ❌ |
| Exportar dados | ✅ | `export-data.tsx` + JSON v2 |
| Apagar dados | ⚠️ | Só via eliminar conta (não exposto) |
| Consentimentos | ⚠️ | Benchmarks ✅; analytics ❌ |
| Open Banking | ✅ | Consentimento + revogação |
| Google Login | ✅ | `lib/supabase/auth.ts` |
| Apple Login | ❌ | Não implementado |
| Benchmark opt-in | ✅ | Default OFF, `benchmark-consent.tsx` |
| Analytics | ⚠️ | Auto-track Supabase |
| Doctor | ✅ | beta/dev only, sem PII |
| Emails | ✅ | Resend + opt-out (`docs/email-lifecycle.md`) |
| Cookies | N/A | App nativa |

### Impedimentos de publicação

1. URL pública de política de privacidade
2. URL pública de termos
3. Fluxo eliminar conta (confirmação + chamada RPC)
4. Apple Sign-In (se Google permanecer)
5. Consentimento analytics (UE)
6. Play Data Safety form completo
7. App Privacy Details (Apple) alinhados com dados reais

---

## FASE 3 — App Stores

### Google Play

| Item | Estado |
|------|--------|
| Ícone 512 | ⚠️ derivar de `icon.png` 1024 |
| Feature graphic | ✅ `playstore-feature-graphic.png` |
| Screenshots | ⚠️ existem, verificar resoluções |
| Descrição | ❌ não no repo |
| Keywords | ❌ não no repo |
| Data Safety | ❌ não preenchido |
| Content rating | ❌ não feito |
| Permissões | ⚠️ RECORD_AUDIO a rever |
| Versão mínima Android | Expo default SDK 56 |

### App Store

| Item | Estado |
|------|--------|
| App Icon 1024 | ✅ |
| Screenshots | ⚠️ 720×1280 — verificar requisitos actuais |
| Descrição | ❌ |
| Keywords | ❌ |
| Privacy Nutrition Labels | ❌ |
| Content rating | ❌ |
| Permissões | ✅ copy Face ID/câmara/fotos |
| Versão mínima iOS | **16.4** |

---

## FASE 4 — Crash Safety

| Mecanismo | Estado | Validação |
|-----------|--------|-----------|
| Sentry | ⚠️ Condicional | `init.ts` — DSN obrigatório; testes unitários passam |
| Doctor | ✅ | Só beta/dev |
| Unhandled Promise | ⚠️ | Sentry se activo |
| Fatal Error | ✅ | `ErrorBoundary` em `_layout.tsx` |
| Startup Error | ✅ | `StartupErrorScreen` + retry |
| OTA rollback | ⚠️ | Manual via EAS |
| Force Update | ✅ | `versionGuard.ts` + `ForceUpdateScreen` |
| Versões incompatíveis | ✅ | `runtimeVersion: appVersion` |

---

## FASE 5 — Onboarding Real (simulação estática)

Fluxo utilizador novo (código, não cronometrado em dispositivo):

```
1. Abrir app → AuthLoadingScreen
2. Registo (nome, email, password 12+ chars) OU Google
3. Redirect /(tabs) → OnboardingGateEffect bloqueia
4. Overlay "A preparar a tua experiência..."
5. Redirect /onboarding — 17 passos interactivos
6. build + result + first_run
7. Chegada às tabs
```

| Métrica | Valor medido |
|---------|--------------|
| Tempo até primeira acção | **Não medido** (dispositivo ausente) |
| Passos onboarding | **17** (estático) |
| Campos registo obrigatórios | 4 (nome, email, password, confirmar) |
| Password policy | 12+ chars, complexidade |
| Primeira recompensa | `first_run` + insights personalizados |
| Abandono provável | **Alto** — 17 passos antes da app |

**Fricção identificada:** onboarding longo; registo com password forte; confirmação email Supabase pode bloquear (rate limit documentado em `docs/beta.md`).

---

## FASE 6 — Permissões

| Permissão | Explica porquê | Quando pede | Fallback |
|-----------|----------------|-------------|----------|
| Câmara | ✅ copy PT | OCR/talão | Galeria |
| Fotos | ✅ copy PT | Anexar talão | Câmara |
| Face ID | ✅ copy PT | Settings opt-in | Password |
| Notificações | ⚠️ implícito | Settings / gates | Continua sem |
| Open Banking | ✅ texto privacy | Ligação banco | Entrada manual |
| Deep links | N/A | Email/OAuth | Navegação normal |
| RECORD_AUDIO | ❌ | Declarada Android | — |

---

## FASE 7 — Recuperação

| Cenário | Recuperação verificada no código |
|---------|----------------------------------|
| Token expirado | ✅ banner + redirect login |
| Sessão inválida | ✅ limpa estado |
| Internet perdida | ⚠️ ErrorState/retry; sem banner |
| Edge Function indisponível | ✅ toast humanizado |
| Supabase indisponível | ✅ ErrorState por ecrã |
| OCR falha | ✅ mensagem + retry |
| Open Banking falha | ✅ toast + estado erro |
| Google Login falha | ✅ `getAuthErrorMessage` |

---

## FASE 8 — Performance

### Medido (comandos executados)

| Métrica | Resultado | Comando |
|---------|-----------|---------|
| Suite testes | **1445 ms** | `npm test` |
| `calculateFinancialState` 10k tx | **135.8 ms** | `engine-performance.test.ts` |
| `recalculateFinancialState` 10k tx | **219.3 ms** | idem |
| Export bundle iOS | **28.6 s** | `npx expo export --platform ios` |
| Tamanho bundle HBC | **12 MB** | idem |

### Não medido — dispositivo ausente

| Métrica | Estado |
|---------|--------|
| Cold Start | ⏳ |
| Warm Start | ⏳ |
| Tempo Home | ⏳ |
| Tempo Movimentos | ⏳ |
| Tempo Análises | ⏳ |
| Tempo OCR | ⏳ |
| Tempo Dashboard | ⏳ |
| Tempo Login | ⏳ |
| Tempo Onboarding | ⏳ |
| Tempo Assistente | ⏳ |

**Nota:** Não foram estimados. Requer profiling em iPhone/Android com build preview instalado.

---

## FASE 9 — Checklist Final

| Item | Estado |
|------|--------|
| Build Android | ⚠️ pronto, não executado |
| Build iOS | ⚠️ pronto, não executado |
| OTA | ✅ |
| Sentry | ⚠️ DSN em build |
| Analytics | ⚠️ sem opt-in |
| Privacy | ❌ |
| Terms | ❌ |
| Delete Account | ❌ |
| Export Data | ✅ |
| Google Login | ✅ |
| Apple Login | ❌ |
| Emails | ✅ |
| Deep Links | ✅ |
| Versionamento | ✅ |
| Crash Recovery | ✅ |
| Splash | ✅ |
| App Icon | ✅ |

---

## Riscos restantes

1. **Rejeição App Store** por delete account + Apple Sign-In + privacy URL
2. **Rejeição Play Store** por Data Safety + permissão áudio não justificada
3. **RGPD** — analytics sem base legal documentada
4. **Abandono onboarding** — 17 passos sem medição de conversão
5. **OTA silencioso** — reload ao arranque pode surpreender utilizador mid-session (mitigado por `criticalActionInProgress`)
6. **Sentry inactivo** em builds sem DSN — crashes não reportados
7. **Performance desconhecida** em dispositivos reais com 10k+ movimentos

---

## Próximos passos recomendados (ordem)

1. Publicar política + termos (URL externa + link na app)
2. Implementar eliminar conta → `supabase.rpc('delete_own_account')`
3. Adicionar Sign in with Apple OU remover Google até Apple estar pronto
4. Consentimento analytics ou desactivar persistência até opt-in
5. Remover `RECORD_AUDIO` ou documentar uso
6. Gerar build production + TestFlight internal
7. Medir cold start e tab switches em dispositivo físico
8. Preencher App Store Connect / Play Console metadata

---

## Comandos executados nesta auditoria

```bash
npm test
npx tsc --noEmit
npm ci --dry-run --no-audit --fund=false
npm run assets:validate-icons
npx expo config --type public
npx tsx --test lib/domain/financial/engine-performance.test.ts
npx expo export --platform ios --output-dir .perf-export-ios  # depois removido
node -e "sharp metadata icon + screenshot"
```

**Não executado:** `eas build`, `eas update`, `eas submit`, profiling mobile.

---

## Documentos relacionados

- [`docs/release-readiness.md`](docs/release-readiness.md) — auditoria técnica detalhada
- [`docs/beta-screen-audit.md`](docs/beta-screen-audit.md) — inventário 38 ecrãs
- [`BETA_PUBLIC_READINESS_REPORT.md`](BETA_PUBLIC_READINESS_REPORT.md) — auditoria UX beta
- [`docs/build.md`](docs/build.md) — fluxo EAS
- [`docs/security.md`](docs/security.md) — princípios segurança
- [`docs/beta.md`](docs/beta.md) — config beta + OAuth troubleshooting

---

*Auditoria concluída sem alterações de código, commit, push, OTA ou build.*
