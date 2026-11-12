/* global __dirname */
// Miven para Windows (docs/windows.md): a app web exportada, numa janela nativa do Electron.
// - A app é servida por um protocolo próprio e seguro (app://miven), sem servidor nem browser.
// - A base de dados (sql.js no IndexedDB, ADR-060) fica no perfil da app e sobrevive a atualizações.
// - Uma só instância; links miven:// (emails de autenticação) abrem esta janela.
// - Links externos abrem no browser; a janela nunca navega para fora da app.
const { app, BrowserWindow, Menu, nativeTheme, net, protocol, screen, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app';
const HOST = 'miven';
const ORIGIN = `${SCHEME}://${HOST}`;
const WEB_ROOT = path.join(__dirname, 'web');
const DEEP_LINK = 'miven';

// Origem padrão e segura: IndexedDB, fetch, Web Crypto e localStorage funcionam como em https.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let window = null;
  let pendingLink = process.argv.find((arg) => arg.startsWith(`${DEEP_LINK}://`)) ?? null;

  /** miven://auth/callback?x → app://miven/auth/callback?x (a rota equivalente da app web). */
  const routeOf = (link) => {
    try {
      const url = new URL(link);
      return `${ORIGIN}/${url.host}${url.pathname}${url.search}${url.hash}`;
    } catch {
      return `${ORIGIN}/`;
    }
  };

  const boundsFile = path.join(app.getPath('userData'), 'window.json');
  const loadBounds = () => {
    try {
      const saved = JSON.parse(fs.readFileSync(boundsFile, 'utf8'));
      // Só se ainda couber num ecrã ligado (ex.: monitor externo desligado).
      const visible = screen
        .getAllDisplays()
        .some(
          ({ workArea: area }) =>
            saved.x >= area.x - 50 &&
            saved.y >= area.y - 50 &&
            saved.x < area.x + area.width &&
            saved.y < area.y + area.height,
        );
      return visible ? saved : null;
    } catch {
      return null;
    }
  };
  const saveBounds = () => {
    if (!window || window.isMinimized()) return;
    try {
      fs.writeFileSync(
        boundsFile,
        JSON.stringify({ ...window.getNormalBounds(), maximized: window.isMaximized() }),
      );
    } catch {
      // Sem permissão de escrita: a janela abre no tamanho por omissão da próxima vez.
    }
  };

  const createWindow = () => {
    const saved = loadBounds();
    window = new BrowserWindow({
      title: 'Miven',
      width: saved?.width ?? 1280,
      height: saved?.height ?? 820,
      x: saved?.x,
      y: saved?.y,
      minWidth: 380,
      minHeight: 560,
      // Cor de fundo do tema enquanto a página carrega (sem clarão branco no modo escuro).
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#0B1220' : '#F6F8FB',
      icon: path.join(__dirname, 'build', 'icon.png'),
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: true,
      },
    });
    if (saved?.maximized) window.maximize();
    window.once('ready-to-show', () => window.show());
    window.on('close', saveBounds);

    // Links para fora da app abrem no browser; dentro da janela só a própria app.
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (/^(https?:|mailto:)/.test(url)) void shell.openExternal(url);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith(ORIGIN)) {
        event.preventDefault();
        if (/^(https?:|mailto:)/.test(url)) void shell.openExternal(url);
      }
    });

    void window.loadURL(pendingLink ? routeOf(pendingLink) : `${ORIGIN}/`);
    pendingLink = null;
  };

  app.on('second-instance', (_event, argv) => {
    const link = argv.find((arg) => arg.startsWith(`${DEEP_LINK}://`));
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
    if (link) void window.loadURL(routeOf(link));
  });

  app.whenReady().then(() => {
    // Ficheiros da app web; rotas sem ficheiro devolvem o index.html (a app decide a página).
    protocol.handle(SCHEME, (request) => {
      const { pathname } = new URL(request.url);
      const relative = decodeURIComponent(pathname).replace(/^\/+/, '');
      const file = path.normalize(path.join(WEB_ROOT, relative));
      const inside = file.startsWith(WEB_ROOT);
      const target =
        inside && fs.existsSync(file) && fs.statSync(file).isFile()
          ? file
          : path.join(WEB_ROOT, 'index.html');
      return net.fetch(pathToFileURL(target).toString());
    });

    if (!app.isDefaultProtocolClient(DEEP_LINK)) app.setAsDefaultProtocolClient(DEEP_LINK);
    // Sem barra de menus (a app tem a sua navegação); os atalhos de edição continuam a funcionar.
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: 'editMenu' },
        {
          role: 'viewMenu',
          submenu: [
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { role: 'togglefullscreen' },
          ],
        },
      ]),
    );
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
