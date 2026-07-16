# Checklist de revisão — App Store e Play Store

Estado para submissão CentFlow v1.0.0 beta RC.  
Legenda: **OK** · **Pendente** · **Bloqueador**

> **Aviso legal:** Documentos legais são rascunhos — revisão jurídica **Bloqueador** antes de publicação.

---

## Apple App Store

| Item | Estado | Notas |
|------|--------|-------|
| Bundle ID `com.everyft1me.centflow` | OK | `app.json` |
| Versão 1.0.0 alinhada | OK | `app.json` + `package.json` |
| Sign in with Apple | OK | Plugin + `usesAppleSignIn` |
| Política de Privacidade in-app | OK | `/legal/privacy` |
| Termos in-app | OK | `/legal/terms` |
| Política de Privacidade URL pública | Pendente | Publicar após revisão jurídica |
| Privacy Nutrition Labels | Pendente | Ver `privacy-labels.md`; preencher no ASC |
| Eliminação de conta na app | OK | Definições → Privacidade → Eliminar conta |
| Exportação de dados | OK | JSON + PDF |
| Conta de teste para revisores | Pendente | Criar e incluir em `review-notes.md` |
| Screenshots (dimensões actuais) | Pendente | Validar requisitos 2026 |
| Ícone 1024×1024 | OK | `assets/images/icon.png` |
| ITSAppUsesNonExemptEncryption | OK | `false` |
| Permissões justificadas (câmara, fotos, Face ID) | OK | Ver `permissions.md` |
| RECORD_AUDIO | OK | Não declarado |
| IAP / subscrições | OK | Nenhuma activa |
| Guideline 4.8 (login alternativo) | OK | Apple + Google + email |
| Crash reporting (Sentry) declarado | Pendente | Opt-in; configurar labels |
| Testes em dispositivo físico | Pendente | Não auditado automaticamente |
| Revisão jurídica textos legais | Bloqueador | Rascunho in-app |
| `eas submit` production iOS | Pendente | Credenciais ASC em `eas.json` placeholder |
| Build production EAS | Pendente | `npm run eas:build:production:ios` |

---

## Google Play Store

| Item | Estado | Notas |
|------|--------|-------|
| Package `com.everyft1me.centflow` | OK | `app.json` |
| Versão 1.0.0 | OK | |
| Política de Privacidade | Pendente | URL pública + in-app |
| Data safety form | Pendente | Alinhar com `privacy-labels.md` |
| Eliminação de conta | OK | Mesmo fluxo iOS |
| Permissões Android | OK | Só `CAMERA` explícito + biometria |
| RECORD_AUDIO removido | OK | Sem entrada em `app.json` |
| Conta de teste | Pendente | |
| Screenshots / feature graphic | Pendente | |
| Classificação de conteúdo (questionário) | Pendente | Finanças, sem IAP |
| Target API level | Pendente | Default Expo SDK 56 — confirmar no build |
| Service account (`google-service-account.json`) | Pendente | Placeholder em `eas.json` |
| Build production EAS (AAB) | Pendente | `npm run eas:build:production:android` |
| Revisão jurídica | Bloqueador | |
| Closed testing track | Pendente | `submit.production.android.track: internal` |

---

## Compliance transversal

| Item | Estado | Notas |
|------|--------|-------|
| RGPD — base legal documentada | Pendente | Secção placeholder na política |
| Consentimento analytics opt-in | OK | `PrivacyConsentModal` + Definições |
| Consentimento crash opt-in | OK | Sentry só com consentimento |
| Open Banking consentimento revogável | OK | Definições → Ligações bancárias |
| Benchmarks opt-in separado | OK | `/settings/benchmark-consent` |
| OTA documentado para revisores | OK | `review-notes.md` |
| `npm test` | OK | Suite domain/tests |
| TypeScript sem erros | OK | Última auditoria release-readiness |
| GitHub Actions CentFlow Release | OK | OTA + IPA beta em push main |

---

## Bloqueadores antes de submissão pública

1. **Revisão jurídica** de Política de Privacidade e Termos.
2. **URL pública** da política de privacidade (obrigatória nas duas lojas).
3. **Conta de teste** documentada para revisores.
4. **Build production** assinado (iOS + Android) com credenciais reais.
5. **Screenshots e metadata** finais nas dimensões exigidas.

---

## Próximos passos sugeridos

1. Advogado revê `docs/legal/*.md` e versão in-app.
2. Publicar política em URL estável (ex.: `https://centflow.app/privacy`).
3. Criar conta `reviewer@centflow.app` e actualizar `review-notes.md`.
4. `npm run eas:build:production:ios` + `eas:build:production:android`.
5. Preencher App Privacy + Data safety com base em `privacy-labels.md`.
6. Submeter via `eas submit` ou upload manual.

## Contacto

privacy@centflow.app
