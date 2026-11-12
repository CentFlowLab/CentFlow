# Ambientes e testes sem publicar

Três ambientes, sempre separados:

| Ambiente     | Supabase               | Onde aparece                              | Quem o usa                                            |
| ------------ | ---------------------- | ----------------------------------------- | ----------------------------------------------------- |
| **Local**    | nenhum (`web:local`)   | só no computador                          | testes rápidos de ecrãs, dados de teste locais        |
| **Staging**  | `qlimqcgrgaqzwjmafora` | `npm run web`, "Miven Teste", preview web | testar alterações e sincronização com contas de teste |
| **Produção** | `slfgslfzolfvqavuccom` | miven.pt/app, SideStore, `android-latest` | pessoas reais                                         |

Regras: credenciais de produção nunca entram num ambiente de teste; migrações vão primeiro ao
staging e só com autorização à produção (`docs/release-producao.md`); nada é aplicado
automaticamente à produção.

## Desenvolvimento local (hot reload)

```bash
npm run web          # web contra o staging (por omissão)
npm run web:local    # web sem servidor: só dados de teste no browser
npm run web:production   # dados REAIS: só quando é mesmo preciso
npm start            # Expo (Android/iOS) contra o staging
npm run check        # tipos, lint, formatação e testes
```

- `npm run web` e `npm start` leem `.env.staging` (fora do git; só a chave **publicável** do
  staging) através de `scripts/start-env.mjs`, que recusa um ficheiro que aponte para outro projeto
  ou que tenha uma chave secreta. Para criar o ficheiro: copiar `.env.staging.example` e preencher
  com o URL e a chave publicável do staging (painel do Supabase → Settings → API keys).
- Fora da produção, a app corre como **"Miven Teste"** (`APP_VARIANT=preview`, `app.config.js`):
  outro identificador (`app.centflow.mobile.preview`) e outro esquema de links (`miven-preview://`).
- Contas de teste: criar no staging (registo normal). O ensaio de sincronização real
  (`src/data/sync/__tests__/live-sync-test.ts`) cria e apaga o seu próprio utilizador.

## Web de pré-visualização

Workflow **"Preview web"** (`.github/workflows/preview-web.yml`): corre em cada pull request e à
mão, faz `npm run check`, compila a web contra o staging e guarda o resultado como artefacto
(`miven-web-preview-<commit>`, 14 dias). **Não publica em miven.pt.** Para abrir: descarregar o
artefacto, extrair para `dist/` e correr `npm run serve:web`.

O workflow "Site miven.pt" continua a publicar a produção a cada push para `master`. Por isso,
alterações por testar devem ir para um ramo e um pull request, não para `master`.

## Android

Workflow **"Android APK"** com o campo `environment`:

- `production`: o APK publicado (`android-build-N` e `android-latest`), como até agora.
- `preview`: **"Miven Teste"** contra o staging, na release `android-preview` (pré-lançamento).
  Instala-se ao lado da app real, não a substitui e nunca toca em `android-latest`.

## iOS

- Expo Go não serve: a app usa módulos nativos (SQLite, câmara, Apple, partilha).
- Workflow **"iOS IPA"** com `environment: preview` gera o IPA de "Miven Teste" contra o staging
  **só como artefacto** do workflow (não é publicado na Release nem na fonte do SideStore).
  Instala-se pelo SideStore a partir do ficheiro, ao lado da app real.
- TestFlight exige uma conta Apple Developer paga; quando existir, o mesmo IPA pode ir para lá.

## Windows

Ver `docs/windows.md`: o pacote MSIX de teste instala-se localmente com um certificado de teste,
sem passar pela Microsoft Store.

## O que falta configurar (passo do responsável)

O ambiente EAS **`preview`** existe mas está vazio. Os workflows de teste precisam de duas
variáveis **públicas** do staging (nunca a chave secreta):

```bash
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://qlimqcgrgaqzwjmafora.supabase.co --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <chave publicável do staging> --visibility plaintext
```

Sem elas, os workflows de teste param no passo "Obter as variáveis públicas" com uma mensagem
clara, sem compilar nada.
