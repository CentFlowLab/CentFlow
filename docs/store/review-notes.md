# Notas para revisores — App Store / Play Store

Informação para o campo **Notes for Review** (Apple) e **Instruções para o revisor** (Google).

> **Aviso legal:** Textos legais in-app são rascunhos sujeitos a revisão jurídica.

---

## Conta de teste

**Não existe conta de teste pré-configurada no repositório.** Os revisores devem:

1. **Registar nova conta** com email e password em `/register`, ou
2. **Iniciar sessão com Google** (OAuth Supabase + `expo-auth-session`), ou
3. **Iniciar sessão com Apple** (iOS — `expo-apple-authentication` + Supabase).

> Se a Apple/Google exigir credenciais fixas, criar conta dedicada `reviewer@centflow.app` e fornecer password no campo de notas da submissão (fora do repo).

### Requisitos de autenticação

- Builds **beta/production** usam Supabase real (`EXPO_PUBLIC_MOCK_AUTH=false`).
- Builds **development** podem usar mock auth — **não submeter** esse perfil às lojas.

---

## Como navegar na app

1. Abrir a app → ecrã de login/registo.
2. Completar ou saltar onboarding (gate de consentimento de privacidade no primeiro arranque).
3. **Tabs principais:** Início, Movimentos, Análises (centro), Créditos, Ativos.
4. **Perfil e Definições:** tocar no avatar (canto superior) → «Definições» ou «Ver perfil».

---

## Funcionalidades a testar

| Funcionalidade | Como aceder |
|----------------|-------------|
| Adicionar movimento | Início → + ou Movimentos → adicionar |
| OCR de talão | Ao criar movimento → digitalizar talão (câmara/galeria) |
| Open Banking | Definições → Ligações bancárias → ligar banco (GoCardless) |
| Exportar JSON | Definições → Exportar dados |
| Exportar PDF | Definições → Exportar PDF |
| Privacidade / consentimentos | Definições → Privacidade |
| Face ID / PIN | Definições → Segurança |
| Assistente financeiro | Início → cartão assistente ou `/assistant` |
| Eliminar conta | Definições → Privacidade → Eliminar conta |

---

## Eliminar conta (obrigatório para revisão)

**Caminho:** Avatar → Definições → Privacidade → **Eliminar conta**

1. Marcar checkbox de confirmação.
2. **Email/password:** introduzir password da conta.
3. **Google/Apple only:** escrever `ELIMINAR`.
4. Confirmar no alert «Eliminar conta permanentemente?».

A conta e dados no servidor são removidos via RPC `delete_own_account`. Dados locais sensíveis (token, biometria, consentimento) são apagados.

---

## Login social

### Google

- Botão «Continuar com Google» no login/registo.
- Redirect: `centflow://auth/callback` (configurado no Supabase Auth).
- Requer ligação à Internet.

### Apple (iOS)

- Botão nativo Sign in with Apple.
- `usesAppleSignIn: true` em `app.json`.
- Contas Apple-only usam frase `ELIMINAR` na eliminação (sem password).

---

## Open Banking

- Integração GoCardless Bank Account Data.
- Redirect: `centflow://open-banking/callback`.
- **Nota:** ligação real requer conta bancária suportada pelo aggregator; em sandbox, seguir fluxo GoCardless de teste se disponível.
- Tokens bancários **não** são guardados no dispositivo.

---

## Permissões pedidas em runtime

- **Câmara / Fotos** — ao digitalizar talão (não no arranque).
- **Face ID** — ao activar biometria em Segurança.
- **Notificações** — ao activar lembretes (créditos, calendário, sync).

**Microfone:** não utilizado; permissão `RECORD_AUDIO` removida.

---

## Pagamentos / IAP

Nenhuma compra in-app activa na v1.0.0. Secção Premium nos Termos é placeholder para funcionalidades futuras.

---

## OTA (Expo Updates)

A app verifica updates JS ao abrir. Não altera permissões nativas sem novo build. Canal depende do perfil de build (`preview` ou `production`).

---

## Contacto do developer

privacy@centflow.app

Para questões durante a revisão, responder no prazo indicado pela loja.
