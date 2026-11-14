# Play Store e entrar com Google (ADR-055)

Estado em 2026-11-11: **preparado no código, por ativar.** Nada foi criado na Play Console, no
Google Cloud nem no painel do Supabase: são contas e credenciais do responsável.

## O que já está feito

- Cada execução do workflow "Android APK" publica, na release `android-build-N`, o APK (para quem
  instala pelo site) **e** o AAB (`miven-<versão>-<N>.aab`) para a Play Store. Os dois têm o mesmo
  `versionCode` e são assinados com a mesma chave (`ANDROID_KEYSTORE_*`); o AAB é verificado com
  `jarsigner`.
- "Continuar com a Google" no ecrã de entrada, escondido até `EXPO_PUBLIC_AUTH_GOOGLE_ENABLED=true`.
  Usa OAuth com PKCE do Supabase e volta por `https://miven.pt/auth/callback` (o mesmo caminho dos
  emails), sem módulos nativos novos.
- Eliminar a conta sem palavra-passe (só Google): confirma-se com uma entrada nos últimos 10
  minutos; depois disso, a app pede para terminar sessão e voltar a entrar.
- A política de privacidade já diz que dados a Google partilha quando se escolhe esta entrada.

## Entrar com Google — passos do responsável

1. **Google Cloud Console** (conta do responsável): criar um projeto "Miven".
2. **Ecrã de consentimento OAuth**: externo; nome "Miven"; email de suporte `mivenapp@gmail.com`;
   domínio `miven.pt`; política `https://miven.pt/privacidade/`; termos
   `https://miven.pt/termos/`; âmbitos `openid`, `email`, `profile` (não precisam de verificação).
3. **Credenciais › ID de cliente OAuth › Aplicação Web**, com os URIs de redirecionamento
   autorizados:
   - `https://slfgslfzolfvqavuccom.supabase.co/auth/v1/callback` (produção)
   - `https://qlimqcgrgaqzwjmafora.supabase.co/auth/v1/callback` (staging)
4. **Painel do Supabase** (produção e staging) › Authentication › Sign In / Providers › Google:
   ligar e colar o Client ID e o Client Secret. O segredo fica só no painel: nunca no repositório
   nem na conversa.
5. Confirmar em Authentication › URL Configuration que `https://miven.pt/auth/callback` e
   `https://miven.pt/app/auth/callback` estão na lista de redirects (já usados pelos emails e pela
   web).
6. **EAS**: variável `EXPO_PUBLIC_AUTH_GOOGLE_ENABLED=true` no ambiente `production` (pública, não
   é segredo). Publicar uma versão nova (iPhone, Android e web leem a variável na compilação).
7. Testar: criar conta com Google, terminar sessão, voltar a entrar, eliminar a conta.

**App Store (futuro):** a diretriz 4.8 obriga a oferecer "Iniciar sessão com a Apple" quando há
Google no iPhone. No SideStore não se aplica; antes de submeter à App Store, ligar também a Apple
(ver `app-store-readiness.md`).

## Play Store — passos do responsável

1. **Conta de programador** na Play Console (taxa única de 25 USD, verificação de identidade). O
   nome do programador é público: tem de coincidir com o responsável pelo tratamento na política
   (pendente D-4).
2. **Contas pessoais recentes** têm de fazer um teste fechado com pelo menos 12 testadores durante
   14 dias seguidos antes de poderem publicar em produção (regra da Google; confirmar na consola,
   que mostra o requisito exato da conta).
3. **Criar a app**: nome "Miven", gratuita, categoria Finanças, pacote `app.centflow.mobile`.
4. **Assinatura da app** (decidir antes do primeiro carregamento):
   - **Recomendado:** "Usar a minha chave" e exportar a chave atual (`ANDROID_KEYSTORE_*`) com a
     ferramenta PEPK que a consola indica. Assim, quem tem o APK do site pode atualizar pela Play
     Store e vice-versa.
   - Alternativa: deixar a Google gerar a chave. Nesse caso, o APK do site e a versão da Play têm
     assinaturas diferentes: quem mudar tem de desinstalar (e perde os dados locais não
     sincronizados).
5. **Carregar o AAB** da release `android-build-N` mais recente para o teste interno, depois para
   o teste fechado.
6. **Ficha da loja**: descrição só com o que existe (ver texto abaixo); ícone 512×512
   (`assets/images/icon.png` redimensionado); gráfico de destaque 1024×500; pelo menos 2 capturas
   de telemóvel com proporção até 2:1 (as do site, `site/assets/screens/`, têm 780×1688 (390×844 a 2×) e são
   demasiado altas: tirar novas a 1080×1920 ou cortar a 2:1).
7. **Conteúdo da app**:
   - Política de privacidade: `https://miven.pt/privacidade/`.
   - Eliminação de conta: dentro da app (Definições › Conta › Gerir conta › Eliminar conta) e na web,
     `https://miven.pt/suporte/#eliminar` (a app web em `miven.pt/app` também elimina).
   - Segurança dos dados: igual à tabela de `app-store-readiness.md` (email, identificador,
     informação financeira e conteúdo do utilizador ligados à pessoa, só para funcionalidade;
     diagnóstico pelo Sentry; estatísticas pelo PostHog só com consentimento; dados cifrados em
     trânsito; eliminação a pedido). Sem anúncios.
   - Classificação de conteúdo: questionário; sem conteúdo sensível.
   - Público-alvo: 16 anos ou mais (como nos termos).
   - Funcionalidades financeiras: gestão de finanças pessoais; não empresta dinheiro, não liga a
     bancos, não faz pagamentos.
8. **"Fase de testes"**: na Play, usar o teste fechado/aberto enquanto o texto do site e dos termos
   disser "fase de testes" (decisão do responsável).

### Texto curto (80 caracteres)

As tuas finanças, finalmente claras: contas, orçamentos, património e veículos.

### Descrição

O Miven junta as tuas contas, cartões e poupanças num só sítio e mostra para onde vai o dinheiro.

- Registo rápido de despesas e rendimentos, com categorias e ícones à tua medida.
- Orçamentos por categoria, previsão para o fim do mês e quanto podes gastar por dia.
- Subscrições, objetivos de poupança e património líquido, com créditos e o que já pagaste.
- Veículos: combustível, seguro, IUC, inspeção e revisões, com os dias que faltam para cada prazo
  e o custo por quilómetro.
- Importação de extratos CSV, com revisão de cada linha e dos duplicados.
- Funciona sem rede e sincroniza com a tua conta quando volta.

Os teus dados são teus: só a tua conta lhes acede, e podes eliminar a conta na app.
