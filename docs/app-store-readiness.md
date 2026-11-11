# Preparação para a App Store (2026-11-11)

Estado verificado no código, no IPA da compilação 15 e nas definições públicas do Supabase da
produção. **Não submeter ainda:** faltam os quatro blocos da secção 1.

## 1. Bloqueios

| Bloco                 | Estado                                                                                                                                                                                                                                                                                                                     | Quem                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Compilação assinada   | O workflow "iOS IPA" gera um IPA **sem assinatura** para o SideStore; não serve para a App Store Connect. É preciso o Apple Developer Program (99 $/ano) em nome de quem publica, certificado de distribuição, perfil App Store com a capacidade Sign in with Apple e envio (EAS Build + EAS Submit ou Xcode/Transporter). | Responsável (conta Apple)  |
| Identificação legal   | A política diz "pessoa singular em Portugal" sem nome (D-4). A App Store mostra o nome do vendedor; tem de coincidir com o responsável pelo tratamento. O Miven não presta serviços financeiros regulados (não movimenta dinheiro nem liga a bancos); manter assim até haver Open Banking (D-5).                           | Responsável                |
| Testes num iPhone     | Secção 5 de `release-plan-0.1.9.md` por fazer.                                                                                                                                                                                                                                                                             | Responsável (com aparelho) |
| Conta de demonstração | Criar na produção uma conta só para a revisão, com dados fictícios claramente de exemplo, e pôr o utilizador e a palavra-passe nas notas da revisão. Escrever na produção precisa de autorização.                                                                                                                          | Responsável + autorização  |

## 2. Corrigido nesta revisão

- **Sign in with Apple:** o fornecedor Apple está **desligado** na produção (`/auth/v1/settings`:
  `apple: false`), mas o iPhone mostrava o botão sempre que o sistema o suportava. A entrada falharia
  à frente do revisor (diretriz 2.1). Agora o botão só aparece com
  `EXPO_PUBLIC_AUTH_APPLE_ENABLED=true` (igual à web). Para o ativar: fornecedor Apple no painel da
  produção, a variável no EAS e a capacidade na assinatura.
- **Face ID:** o `Info.plist` tinha `NSFaceIDUsageDescription` (vinda do `expo-secure-store`) sem a
  app usar biometria. Removida (`faceIDPermission: false`). Não há outras permissões.
- **Manifesto de privacidade:** já declarava `NSPrivacyTracking = false` e as APIs de razão
  obrigatória (UserDefaults `CA92.1`, datas de ficheiros `C617.1`, arranque `35F9.1`), mas nenhum
  tipo de dado recolhido. Declarados em `app.json` (`ios.privacyManifests`), alinhados com a
  política (tabela abaixo). Confirmar no próximo IPA.
- **Política de privacidade:** o endereço IP guardado até um dia para os limites contra abuso
  (ADR-045, na produção desde 2026-11-10) não estava na política. Acrescentado.

## 3. Declaração de privacidade (App Store Connect)

Nenhum dado é usado para rastreio (tracking).

| Tipo (App Store Connect)       | Ligado à pessoa | Finalidade     | Origem                                                           |
| ------------------------------ | --------------- | -------------- | ---------------------------------------------------------------- |
| Email                          | Sim             | Funcionalidade | Conta (Supabase)                                                 |
| Identificador de utilizador    | Sim             | Funcionalidade | Conta e sincronização                                            |
| Outras informações financeiras | Sim             | Funcionalidade | Contas, movimentos, orçamentos, património                       |
| Outro conteúdo do utilizador   | Sim             | Funcionalidade | Descrições, notas, documentos; texto da IA (se ativa)            |
| Outros tipos de dados          | Sim             | Funcionalidade | Data de nascimento (idade mínima), nome de utilizador            |
| Dados de falhas                | Não             | Funcionalidade | Sentry                                                           |
| Dados de desempenho            | Não             | Funcionalidade | Sentry (20 % das sessões)                                        |
| Outros dados de diagnóstico    | Não             | Funcionalidade | Sentry: gravação de 10 % das sessões, texto e imagens mascarados |
| Interação com o produto        | Não             | Estatísticas   | PostHog, só com consentimento, só nomes de ecrãs                 |

O Superwall está incluído no binário mas desligado (`EXPO_PUBLIC_PAYWALL_ENABLED`): não recolhe
nada. Se for ativado, rever esta tabela, a política e as compras dentro da app.

## 4. Metadados e revisão

- **Capturas reais** de um iPhone com a conta de demonstração (sem dados pessoais).
- **Descrição** só com o que existe: sem OCR, Open Banking, IA (enquanto não estiver configurada)
  nem pagamentos.
- **URLs:** suporte `https://miven.pt` e `mivenapp@gmail.com`; privacidade
  `https://miven.pt/privacidade/`.
- **Eliminação de conta** dentro da app: Definições › Zona de perigo › Eliminar conta (diretriz
  5.1.1(v)); testar de ponta a ponta antes de submeter.
- **Classificação etária:** sem conteúdo sensível; os termos exigem 16 anos para criar conta.
- **Exportação:** `usesNonExemptEncryption: false` já está no `app.json`.
- **Categoria:** Finanças.
