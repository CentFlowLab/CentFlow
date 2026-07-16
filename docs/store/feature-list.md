# Lista de funcionalidades — CentFlow v1.0.0

Lista factual baseada na implementação actual. Sem funcionalidades inventadas.

> **Aviso legal:** Textos legais requerem revisão jurídica.

---

## Navegação principal (5 tabs visíveis)

| Tab | Funcionalidades |
|-----|-----------------|
| **Início** | Património líquido, gasto disponível mensal, alertas, recomendações, cartão assistente, acções rápidas (movimento, talão, ativo), simulador de decisões (host global), badge demo (só dev) |
| **Movimentos** | Lista de transacções, filtros, pesquisa, resumo mensal, subscrições, detecção de subscrições pendentes, criar/editar/eliminar movimentos, reembolsos |
| **Análises** | Resumo, gastos por categoria, dívida, património; períodos (semana, mês, trimestre, ano, personalizado) |
| **Créditos** | Gestão de créditos e cartões, pagamentos, lembretes (`CreditPaymentReminderGate`) |
| **Ativos** | Objectivos de poupança, garantias, inventário, subscrições |

**Perfil** (`/(tabs)/perfil`) — acessível via menu do avatar; não aparece na tab bar.

---

## Autenticação e conta

- Registo e login com email/password (Supabase Auth)
- Login com Google (`expo-auth-session`)
- Sign in with Apple (iOS, `expo-apple-authentication`)
- Recuperação de password
- Logout e logout em todos os dispositivos
- Eliminação de conta com confirmação

---

## Onboarding e personalização

- Fluxo multi-passo (nome, objectivo, perfil, áreas de vida, ambições, revelação)
- Activação de áreas funcionais: gastos, objectivos, património, talões, subscrições, créditos
- Gate de consentimento de privacidade (`PrivacyConsentGate`)
- Repetir onboarding (Definições)

---

## Movimentos e OCR

- Criar receitas/despesas/transferências
- Categorias e contas
- Digitalização de talões (`expo-ocr-kit` + Edge Function)
- Captura câmara ou selecção galeria (`expo-image-picker`)
- Anexos a movimentos

---

## Open Banking

- Ligação a bancos via GoCardless
- Callback `centflow://open-banking/callback`
- Gestão e revogação em Definições → Ligações bancárias
- Notificação de sync (`OpenBankingSyncNotificationGate`)

---

## Análises e inteligência

- Motor financeiro unificado (`lib/domain/financial/engine`)
- CentFlow Score e perfil financeiro
- Assistente financeiro (`/assistant`, Edge Function Supabase)
- Simulador de decisões (`DecisionSimulatorHost`)
- Projeção de cashflow (`useCashflowProjection`)
- Calendário financeiro (`/calendar`) com alertas de risco
- Benchmarks de gastos (opt-in separado)
- Sugestões financeiras configuráveis

---

## Orçamento e metas

- Gasto disponível mensal (`MonthlySpendableCard`)
- Orçamentos por categoria
- Objectivos de poupança com progresso

---

## Ativos e passivos

- Inventário de bens
- Garantias com validade
- Subscrições e despesas recorrentes
- Créditos (hipoteca, auto, pessoal, cartão)

---

## Definições

- Dados pessoais, moeda e região
- Segurança (PIN, Face ID/biometria)
- Notificações
- Sugestões financeiras
- Aparência (tema)
- Atalhos rápidos
- Ligações bancárias
- Privacidade (consentimentos, exportação, eliminação)
- Exportar PDF e JSON
- CentFlow Doctor (beta/dev — diagnóstico local)

---

## Privacidade e dados

- Consentimento analytics de produto (opt-in)
- Consentimento crash reporting / Sentry (opt-in)
- Consentimento benchmarks agregados (opt-in separado)
- Política de Privacidade e Termos in-app (`/legal/privacy`, `/legal/terms`)
- Exportação JSON v2 e PDF configurável
- Eliminação de conta

---

## Infraestrutura

- Backend Supabase (auth, dados, Edge Functions)
- OTA via Expo Updates (canais `preview` / `production`)
- Sentry opcional (com consentimento + DSN)
- Analytics opcional (tabela `analytics_events`)

---

## **Não** incluído nesta versão

- Compras in-app / subscrição Premium activa
- Aconselhamento de investimento regulado
- Conta bancária CentFlow / cartões emitidos pela app
- Widgets iOS/Android em produção (ver `docs/widgets.md` — estado separado)
