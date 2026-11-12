# Miven para Windows

Aplicação Windows a sério (janela própria, ícone e nome Miven, entrada no Menu Iniciar), feita com
**Electron** a partir da mesma app web (ADR-063). Pasta `desktop/`, com dependências próprias.

## Como funciona

- A app web exportada é servida por um protocolo próprio e seguro (`app://miven`), sem servidor
  local nem browser. Não é uma PWA nem um separador do Chrome.
- Dados: a base de dados SQLite da web (sql.js no IndexedDB, ADR-060) fica no perfil da app
  (`%APPDATA%\Miven`). Atualizar a app mantém os dados; a sincronização é a mesma de sempre.
- Uma só janela de cada vez; links `miven://` (emails de autenticação) abrem a app.
- Links externos (site, email) abrem no browser; a janela nunca sai da app.
- Lembra o tamanho, a posição e se estava maximizada; respeita a escala do Windows, o modo
  claro/escuro do sistema, rato, teclado e ecrãs táteis (Chromium). Zoom: Ctrl + / Ctrl −.

## Testar no PC (sem instalar)

```bash
cd desktop
npm ci
node scripts/build-web.mjs      # "Miven Teste" contra o staging (--production para a real)
node scripts/make-assets.mjs    # ícones
npm start                       # abre a janela
```

## Instalador de teste (.exe)

```bash
cd desktop
npx electron-builder --win nsis   # release/Miven-Setup-<versão>.exe
```

Sem assinatura (ou com o certificado de teste em `desktop/cert/`, fora do git), o Windows mostra
o aviso do SmartScreen: "Mais informações" → "Executar mesmo assim".

## Pacote MSIX

O `makeappx.exe` que o electron-builder descarrega não arranca neste PC ("configuração lado-a-lado
incorreta"); o MSIX precisa do **Windows SDK** oficial. Duas formas:

1. **GitHub Actions** (sem instalar nada): workflow **"Windows MSIX"** (`windows-latest`, que já
   traz o SDK). Escolher `preview` (staging) ou `production`. O resultado são artefactos: o `.appx`
   (MSIX), o instalador `.exe` e o `.cer` do certificado de teste descartável dessa execução.
2. **Localmente**, depois de instalar o Windows SDK (passo do responsável, altera o sistema):
   `npx electron-builder --win appx` em `desktop/`.

Instalar o MSIX de teste: confiar no certificado (PowerShell **como administrador**, passo do
responsável), e abrir o `.appx`:

```powershell
Import-Certificate -FilePath .\miven-teste.cer -CertStoreLocation Cert:\LocalMachine\TrustedPeople
```

## Microsoft Store (não submetido)

- Na submissão, a Store volta a assinar o pacote: não é preciso comprar um certificado.
- Antes de submeter: criar a app no Partner Center e copiar para `desktop/package.json`
  (`build.appx`) o `identityName`, o `publisher` (CN=…) e o `publisherDisplayName` atribuídos.
- Política de privacidade: já existe (`https://miven.pt/privacidade`).
- **Nada foi submetido.** A submissão precisa de autorização própria.

## Limitações

- Atualizações: pela Store (quando publicada) ou instalando a nova versão por cima; ainda não há
  atualização automática fora da Store.
- Notificações do Windows: a app ainda não tem notificações em nenhuma plataforma.
- A janela usa o mesmo Supabase do ambiente com que foi compilada (staging ou produção).
