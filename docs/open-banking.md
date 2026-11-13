# Open banking — ativar (ADR-069)

O Miven liga contas bancárias através da **Enable Banking**, um agregador PSD2 supervisionado pela FIN-FSA (só
leitura). A pessoa autoriza no próprio banco; o Miven nunca vê credenciais bancárias. Os movimentos
entram nas contas da app como numa importação de extrato (sem duplicados, com a categoria
habitual), e o saldo do banco aparece ao lado do saldo da app.

Estado em 2026-11-13: código, migração `20261121000100_open_banking.sql` e função `open-banking` no
**staging**. Sem a aplicação da Enable Banking, a app diz "A ligação a bancos ainda não está
disponível". Produção: por aplicar (passos 3 e 4).

## 1. Criar a aplicação na Enable Banking (só a pessoa responsável)

1. Criar conta em <https://enablebanking.com/sign-in/> e abrir o **Control Panel**.
2. **Applications › Register new application**:
   - Environment: **Production** (o modo gratuito "restricted" lê dados reais, mas só das contas
     que ligares tu no Control Panel; para abrir a todas as pessoas é preciso o contrato
     comercial da Enable Banking).
   - Name: `Miven`.
   - Allowed redirect URLs: `https://miven.pt/auth/bank/`
   - Privacy policy / Terms: `https://miven.pt/privacidade/` e `https://miven.pt/termos/`.
   - Gerar o par de chaves no browser: descarrega um ficheiro `.pem` (chave privada) e mostra o
     **Application ID**. Guardar o `.pem` fora do repositório e de pastas sincronizadas.
3. Em modo restrito, ativar a aplicação ligando as tuas contas no Control Panel (Revolut, Moey,
   Santander…), como a Enable Banking indicar. Confirmar aí que o banco aparece para Portugal.

Se o `.pem` começar por `-----BEGIN RSA PRIVATE KEY-----`, convertê-lo primeiro (a função só
aceita PKCS#8):

```bash
openssl pkcs8 -topk8 -nocrypt -in chave.pem -out chave-pkcs8.pem
```

## 2. Segredos da função (staging e produção)

Na pasta do repositório, numa shell **bash** (Git Bash), com o caminho do `.pem`:

```bash
npx supabase secrets set ENABLE_BANKING_APP_ID=<application-id> ENABLE_BANKING_PRIVATE_KEY="$(cat /caminho/chave-pkcs8.pem)" --project-ref qlimqcgrgaqzwjmafora
```

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
```

```bash
npx supabase secrets set ENABLE_BANKING_APP_ID=<application-id> ENABLE_BANKING_PRIVATE_KEY="$(cat /caminho/chave-pkcs8.pem)" --project-ref slfgslfzolfvqavuccom
```

Os valores não ficam em ficheiros do projeto nem no histórico do git.

## 3. Produção: migração e funções

```bash
npm run production:guard -- --remote=slfgslfzolfvqavuccom CONFIRMO-PRODUCAO
```

```bash
npx supabase db push --skip-vault --remote=slfgslfzolfvqavuccom
```

```bash
npx supabase functions deploy open-banking --project-ref slfgslfzolfvqavuccom --no-verify-jwt
```

O dry-run (`db push --dry-run`) deve listar só `20261121000100_open_banking.sql`.

## 4. Trading 212 na produção (ADR-064)

```bash
npx supabase functions deploy t212 --project-ref slfgslfzolfvqavuccom --no-verify-jwt
```

Segredo `INTEGRATIONS_KEY` (32 bytes aleatórios; o comando gera-o e não o mostra):

```bash
npx supabase secrets set INTEGRATIONS_KEY="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))")" --project-ref slfgslfzolfvqavuccom
```

Ativar o ecrã nas apps (ambiente `production` do EAS) e gerar a versão seguinte (APK e IPA):

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_T212_ENABLED --value true --visibility plaintext
```

Os bancos não precisam desta variável: a app pergunta ao servidor se estão disponíveis.

## 5. Ligar um banco na app

Definições › Integrações › **Bancos** › Ligar um banco › Portugal › escolher o banco › autorizar no
banco › voltar ao Miven. Depois, tocar em cada conta do banco e escolher:

- **Criar conta nova**: começa com o saldo atual do banco; os movimentos entram a partir de
  amanhã (os de hoje já estão no saldo).
- **Uma conta da app que já existe**: os movimentos entram a partir de hoje e os que já
  registaste à mão não se repetem (mesma data, valor e tipo).

Com a app aberta, cada banco é lido no máximo a cada 15 minutos (os bancos limitam as leituras
sem a pessoa presente). "Atualizar" força uma leitura. A autorização dura até 90 dias; depois o
banco aparece como "Expirado" e basta autorizar de novo.

## Limitações conhecidas

- **Robinhood** não é um banco PSD2 e não tem API oficial para isto: fica como item de património
  manual.
- A cobertura exata (Moey, Revolut em Portugal) depende da Enable Banking: confirmar no passo 1.
- Movimentos pendentes não entram até serem contabilizados.
- Nenhum movimento fica no servidor por esta via; se a app não estiver aberta, os movimentos
  entram na abertura seguinte (até 90 dias para trás).
