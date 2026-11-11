# Preparação para a App Store (auditoria de 2026-11-11)

Estado verificado no código, na configuração resolvida (`expo config`), no IPA 0.1.11 (compilação
17, sem assinatura) e no Supabase da produção **só em leitura**. Nada foi testado num iPhone
físico. A aprovação depende sempre da revisão da Apple.

**Decisão: NÃO PRONTA PARA SUBMISSÃO.** Pode ir para o TestFlight assim que houver uma compilação
assinada (bloqueio 1); a submissão para revisão precisa também dos bloqueios 2 a 5.

## A. Estado por requisito

| Requisito                               | Estado                  | Notas                                                                                                                                               |
| --------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle id, versão, iOS mínimo           | APROVADO                | `app.centflow.mobile`, 0.1.11, iOS 16.4, iPhone e iPad (`supportsTablet`). Não mudar o id depois da primeira submissão (D-3).                       |
| Número de compilação                    | APROVADO (corrigido)    | EAS com `appVersionSource: "remote"` e `autoIncrement` (ADR-050).                                                                                   |
| Compilação assinada e envio             | BLOQUEADOR DE SUBMISSÃO | Só há IPA sem assinatura (SideStore). Falta Apple Developer Program, certificado, perfil e EAS Submit.                                              |
| Entitlements / Sign in with Apple       | PENDENTE DE VALIDAÇÃO   | `usesAppleSignIn: true` exige a capacidade no perfil. O botão só aparece com `EXPO_PUBLIC_AUTH_APPLE_ENABLED=true`; o fornecedor está desligado.    |
| Variáveis de desenvolvimento            | APROVADO                | Builds usam o ambiente EAS `production`; sem URLs locais no binário; ATS sem exceções.                                                              |
| Permissões (Info.plist)                 | APROVADO                | Nenhuma descrição de uso; sem câmara, fotos, localização, Face ID nem ATT.                                                                          |
| Manifesto de privacidade da app         | APROVADO                | No IPA: tracking `false`, 9 tipos recolhidos, UserDefaults `CA92.1`, datas de ficheiros `C617.1`, arranque `35F9.1`.                                |
| Manifesto/assinatura do Hermes          | PENDENTE DE VALIDAÇÃO   | `hermesvm.framework` sem `PrivacyInfo` no IPA atual. Confirmar no processamento do envio (aviso ITMS-91061) e atualizar o Expo/RN se aparecer.      |
| Exportação (criptografia)               | APROVADO                | `ITSAppUsesNonExemptEncryption = false`.                                                                                                            |
| Sentry                                  | PENDENTE DE VALIDAÇÃO   | Falhas e desempenho sem dados pessoais; a gravação de 10 % das sessões (mascarada) corre sem consentimento. Decisão do responsável.                 |
| PostHog                                 | APROVADO                | Só com chave e consentimento; sem código nativo no IPA.                                                                                             |
| Superwall / compras (3.1)               | APROVADO                | Incluído mas desligado; sem compras nem conteúdo pago.                                                                                              |
| IA (registo por texto, 2.1 e 5.1.2(i))  | APROVADO (corrigido)    | Escondida até `EXPO_PUBLIC_AI_ENTRY_ENABLED=true` (sem `ANTHROPIC_API_KEY` falhava à frente do revisor). Antes de ativar: política e consentimento. |
| Registo, confirmação e recuperação      | PENDENTE DE VALIDAÇÃO   | Fluxo analisado no código e testado na web; no iPhone, a recuperação passa por `miven.pt/auth` → `miven://`. Testar num aparelho.                   |
| Eliminação de conta (5.1.1(v))          | APROVADO (código)       | Definições › Zona de perigo › Eliminar conta, com palavra-passe; Edge Function `delete-account`. Ponta a ponta num iPhone por fazer.                |
| Conta obrigatória (5.1.1)               | APROVADO                | Justificada pela sincronização entre aparelhos (ADR-034); explicar nas notas da revisão.                                                            |
| Offline e sincronização                 | PENDENTE DE VALIDAÇÃO   | SQLite local com fila; testes automáticos e PGlite passam. Sem ensaio offline num aparelho real.                                                    |
| Erros, estados vazios e de carregamento | APROVADO (código e web) | Ecrãs com estados vazios/erro e Sentry; percorridos na web. Não verificado num iPhone.                                                              |
| Tamanhos de ecrã e iPad                 | PENDENTE DE VALIDAÇÃO   | Layout responsivo verificado na web; iPhone em paisagem e iPad por testar. Com `supportsTablet` são precisas capturas de iPad.                      |
| 2.1 Completude / conta de demonstração  | BLOQUEADOR DE SUBMISSÃO | Falta conta de demonstração na produção (precisa de autorização para escrever).                                                                     |
| 2.2 Beta                                | BLOQUEADOR DE SUBMISSÃO | Site, política e termos falam de "fase de testes" (a app não). Texto legal: decisão do responsável.                                                 |
| 2.3 Metadados                           | PENDENTE DE VALIDAÇÃO   | Capturas e descrição por fazer, só com o que existe.                                                                                                |
| 4.0 Design                              | APROVADO                | Design próprio, nativo, sem webview a fazer de app.                                                                                                 |
| 4.8 Início de sessão                    | APROVADO                | Só contas próprias: isento. Se o botão Apple for ativado, já cumpre.                                                                                |
| 5.1 Privacidade: identificação legal    | BLOQUEADOR DE SUBMISSÃO | Falta o nome do responsável pelo tratamento (D-4); tem de coincidir com o vendedor na App Store.                                                    |
| URL de privacidade                      | APROVADO                | `https://miven.pt/privacidade/`, ligada no registo e em Definições.                                                                                 |
| URL de suporte                          | APROVADO (corrigido)    | Nova `https://miven.pt/suporte/`, ligada no site e em Definições › Ajuda.                                                                           |
| Classificação etária                    | PENDENTE DE VALIDAÇÃO   | Sem conteúdo sensível; termos exigem 16 anos. Responder ao questionário na App Store Connect.                                                       |
| Supabase (RLS, funções, segredos)       | APROVADO (só leitura)   | Produção = staging; 14 tabelas com RLS; `private` não exposto; funções com `search_path` vazio.                                                     |
| Testes num iPhone físico                | BLOQUEADOR DE SUBMISSÃO | Não feitos (não há acesso a um aparelho nesta auditoria).                                                                                           |

## B. Problemas

| #   | Onde                                                               | Problema e risco Apple                                                                                   | Correção                                                                                | Corrigido         |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------- |
| 1   | `src/features/entries/AiSuggestion.tsx`                            | Registo por texto visível sem `ANTHROPIC_API_KEY` no servidor: falha à frente do revisor (2.1).          | Flag `EXPO_PUBLIC_AI_ENTRY_ENABLED`; teste novo.                                        | Sim               |
| 2   | `eas.json`                                                         | Perfil `production` sem incremento do número de compilação: segundo envio rejeitado por número repetido. | `appVersionSource: "remote"` + `autoIncrement`.                                         | Sim               |
| 3   | `site/` (sem página)                                               | Sem página de suporte para o campo obrigatório "Support URL".                                            | `site/suporte/index.html`, rodapés, `sitemap.xml`, linha "Ajuda" nas Definições.        | Sim               |
| 4   | `site/index.html` (108, rodapé), `site/privacidade`, `site/termos` | "Fase de testes" / "grátis durante a fase de testes": a 2.2 não aceita betas na App Store.               | Rever o texto legal e comercial antes de submeter (TestFlight não é afetado).           | Não (responsável) |
| 5   | `site/privacidade/index.html`                                      | Responsável pelo tratamento sem nome (D-4).                                                              | Nome real do responsável, igual ao vendedor.                                            | Não (responsável) |
| 6   | Workflow "iOS IPA"                                                 | IPA sem assinatura: não serve para a App Store Connect.                                                  | EAS Build `production` + EAS Submit com a conta Apple.                                  | Não (conta Apple) |
| 7   | `app.json` (`usesAppleSignIn: true`)                               | Capacidade obrigatória no perfil; se não for usada, entitlement sem função.                              | Ativar o fornecedor Apple ou pôr `usesAppleSignIn: false` antes da compilação assinada. | Não (decisão)     |
| 8   | `hermesvm.framework`                                               | Sem `PrivacyInfo`; pode gerar ITMS-91061 no envio.                                                       | Ver o email do processamento; atualizar o React Native se necessário.                   | Por validar       |
| 9   | `src/lib/sentry.ts:15` (gravação 10 %)                             | Gravação de sessões sem consentimento; declarada e mascarada, mas discutível na 5.1.                     | Ligar ao consentimento de estatísticas ou desligar (decisão).                           | Não (decisão)     |
| 10  | Produção                                                           | Sem conta de demonstração para a revisão (2.1).                                                          | Criar com dados de exemplo, com autorização.                                            | Não (autorização) |

## C. Ficheiros alterados (por fazer commit)

- `src/features/entries/AiSuggestion.tsx`, `__tests__/ai-suggestion-test.tsx`: problema 1.
- `eas.json`, `.env.example`: problema 2 e nota da flag da IA.
- `site/suporte/index.html` (novo), `site/index.html`, `site/privacidade/index.html`,
  `site/termos/index.html`, `site/sitemap.xml`: problema 3 (só ligação no rodapé nas páginas legais).
- `src/features/account/legal-links.ts`, `src/features/settings/SettingsScreen.tsx`,
  `__tests__/settings-screen-test.tsx`, `src/i18n/locales/{pt-PT,en,es}.ts`: linha "Ajuda".
- `docs/decisions.md` (ADR-050) e este documento.

## D. Comandos e resultados

| Comando                                                  | Resultado                                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                          | Typecheck, lint e Prettier sem erros; 617 testes passam, 1 ignorado (ensaio real).                                      |
| `npx expo-doctor`                                        | 20/20.                                                                                                                  |
| `EXPO_NO_DOTENV=1 npx expo config --json`                | 0.1.11, `app.centflow.mobile`, `supportsTablet`, `usesAppleSignIn`, `usesNonExemptEncryption: false`, 9 tipos de dados. |
| Inspeção do IPA 0.1.11 (17)                              | Ver secção A (Info.plist, manifestos, frameworks).                                                                      |
| Consultas só de leitura ao Supabase (produção e staging) | Ver secção A.                                                                                                           |

## E. Lista final antes de submeter

1. Inscrever no Apple Developer Program em nome do responsável; criar a app na App Store Connect
   com `app.centflow.mobile`.
2. Decidir Sign in with Apple (ativar tudo ou `usesAppleSignIn: false`).
3. `eas build --platform ios --profile production` e `eas submit` (custos e credenciais: só com
   autorização). Ver o email do processamento (ITMS-91061).
4. TestFlight: secção 5 de `release-plan-0.1.9.md` num iPhone e num iPad, incluindo registo,
   recuperação, offline, sincronização entre dois aparelhos e eliminação de conta.
5. Nome do responsável na política e nos termos; retirar "fase de testes" do site e dos termos.
6. Decidir a gravação de sessões do Sentry.
7. Conta de demonstração na produção (com autorização), dados de exemplo, credenciais nas notas.
8. Declaração de privacidade (tabela abaixo), classificação etária, categoria Finanças.
9. Capturas de iPhone (6,9" e 6,5") e iPad (13") com a conta de demonstração; descrição só com o
   que existe; URLs de suporte e privacidade.

## F. Decisão

**1 — NÃO PRONTA PARA SUBMISSÃO.** O código e a configuração estão em condições para uma
compilação de TestFlight assim que houver conta Apple e assinatura; os bloqueios restantes são do
responsável (conta Apple, identificação legal, texto "fase de testes", conta de demonstração,
testes em aparelho).

## Declaração de privacidade (App Store Connect)

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

O endereço IP é guardado até um dia para os limites contra abuso (na política). O Superwall está
no binário mas desligado: se for ativado, rever esta tabela, a política e as compras.
