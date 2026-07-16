# Privacy Nutrition Labels — Apple App Store

Mapeamento para o questionário **App Privacy** da App Store Connect, baseado na implementação actual da CentFlow.

> **Aviso legal:** Declarações finais devem ser validadas por advogado antes da submissão.

---

## Resumo

| Campo | Valor |
|-------|-------|
| Tracking | **Não** — sem SDK de publicidade nem tracking cross-app |
| Dados ligados ao utilizador | Sim (conta e dados financeiros) |
| Dados usados para tracking | Não |

---

## Tipos de dados recolhidos

### Informação de contacto

| Tipo | Recolhido | Ligado à identidade | Tracking | Finalidade |
|------|-----------|---------------------|----------|------------|
| Email | Sim | Sim | Não | Funcionalidade da app (conta) |
| Nome | Sim | Sim | Não | Funcionalidade da app (perfil) |

### Informação financeira

| Tipo | Recolhido | Ligado à identidade | Tracking | Finalidade |
|------|-----------|---------------------|----------|------------|
| Informação financeira | Sim | Sim | Não | Funcionalidade da app |

_Inclui movimentos, contas, créditos, objectivos, subscrições, inventário introduzidos pelo utilizador e movimentos importados via Open Banking._

### Conteúdo do utilizador

| Tipo | Recolhido | Ligado à identidade | Tracking | Finalidade |
|------|-----------|---------------------|----------|------------|
| Fotos ou vídeos | Sim (opcional) | Sim | Não | Funcionalidade da app |

_Imagens de talões enviadas para OCR; anexos a movimentos._

### Identificadores

| Tipo | Recolhido | Ligado à identidade | Tracking | Finalidade |
|------|-----------|---------------------|----------|------------|
| ID de utilizador | Sim | Sim | Não | Funcionalidade da app |

_Inclui ID Supabase e identificadores Google/Apple em login social._

### Dados de utilização (opcional)

| Tipo | Recolhido | Ligado à identidade | Tracking | Finalidade |
|------|-----------|---------------------|----------|------------|
| Interacção com o produto | Sim (opt-in) | Sim | Não | Analytics |

_Eventos em `analytics_events` (ex.: onboarding, talão digitalizado, definições abertas) — apenas com consentimento «Analytics de produto»._

### Diagnósticos (opcional)

| Tipo | Recolhido | Ligado à identidade | Tracking | Finalidade |
|------|-----------|---------------------|----------|------------|
| Dados de crash | Sim (opt-in) | Pseudónimo | Não | Desempenho da app |

_Sentry com scrubbing de PII; activo apenas com consentimento «Relatórios de crash» e `EXPO_PUBLIC_SENTRY_DSN` configurado._

---

## Dados **não** recolhidos (confirmado no código)

- Localização
- Contactos da agenda
- Histórico de navegação
- Dados de saúde
- Dados de fitness
- Áudio / microfone (`RECORD_AUDIO` removido)
- Publicidade ou tracking de terceiros

---

## Terceiros que processam dados

| Serviço | Dados | Notas |
|---------|-------|-------|
| Supabase | Conta, financeiros, analytics (opt-in) | Backend principal (UE) |
| GoCardless | Ligações e movimentos bancários | Open Banking; tokens no backend |
| Google Cloud Vision | Imagens OCR | Via Edge Function `process-receipt` |
| Google / Apple | Login social | Identificador e email conforme provider |
| Sentry | Crash reports (opt-in) | Pseudónimo, scrubbing activo |

---

## Práticas de privacidade na app

- Consentimento inicial (`PrivacyConsentModal`) para analytics e crash reporting.
- Gestão posterior em Definições → Privacidade.
- Opt-in separado para benchmarks em Definições → Gerir consentimento.
- Exportação JSON e eliminação de conta disponíveis.

## Contacto

privacy@centflow.app
