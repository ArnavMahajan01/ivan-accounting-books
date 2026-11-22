// Electron main process: one hardened window (context/rules/desktop-app.md, spec 008).

import { app, BrowserWindow, ipcMain, Menu, net, protocol, screen, session } from 'electron';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  BOOKS_FILE_NAME,
  bundledMigrations,
  openStore,
  type OpenError,
  type Store,
} from '@data/database';
import { consoleSink, createLogger } from '@shared/logger';
import { err, type Result } from '@shared/result';
import { dataFolder, runName } from './app-identity';
import { APP_ENTRY_URL, APP_SCHEME, resolveAppFile } from './app-protocol';
import { registerBridge } from './bridge';
import { contentSecurityPolicy } from './csp';
import { createHandlers } from './handlers';
import { systemClock } from './clock';
import { debuggingFlags } from './launch-guard';
import { logFileSink, teeSinks } from './log-file';
import { packagedMenuTemplate } from './menu';
import { loadWindowBounds, MIN_HEIGHT, MIN_WIDTH, saveWindowBounds } from './window-state';
import {
  parseSelfCheckArg,
  READ_STATUS_SCRIPT,
  SELF_CHECK_FILE,
  type SelfCheckReport,
} from './self-check';
import { isAppUrl } from './navigation';

// The name decides the data folder and the instance lock, so it is set before anything else.
const name = runName(app.getName(), app.isPackaged);
app.setName(name);
const selfCheck = parseSelfCheckArg(process.argv, (dir) => {
  try {
    return readdirSync(dir);
  } catch {
    return null;
  }
});
app.setPath(
  'userData',
  selfCheck.kind === 'run' ? selfCheck.dir : dataFolder(app.getPath('appData'), name),
);

const refusedFlags = app.isPackaged ? debuggingFlags(process.argv) : [];

// A refused self-check writes nothing anywhere, so it can never touch the real data folder.
const fileSink =
  selfCheck.kind === 'invalid'
    ? null
    : logFileSink({ dir: join(app.getPath('userData'), 'logs'), clock: systemClock });
const log = createLogger(
  'main',
  fileSink === null ? consoleSink : app.isPackaged ? fileSink : teeSinks(fileSink, consoleSink),
);

// Only a development run may load from the Vite dev server.
const devServerUrl =
  !app.isPackaged && process.env.ELECTRON_RENDERER_URL !== undefined
    ? process.env.ELECTRON_RENDERER_URL
    : null;
const rendererDir = join(import.meta.dirname, '../renderer');
const preloadPath = join(import.meta.dirname, '../preload/index.cjs');
const packagedCsp = contentSecurityPolicy({ development: false });

let mainWindow: BrowserWindow | null = null;

/** Opens the books in the data folder and applies any new migrations. */
function openBooks(): Result<Store, OpenError> {
  const migrations = bundledMigrations();
  if (!migrations.ok)
    return err({ code: migrations.error.code, message: migrations.error.message });
  const store = openStore(join(app.getPath('userData'), BOOKS_FILE_NAME), migrations.value, () =>
    systemClock.now(),
  );
  if (store.ok) {
    log.info('books.opened', { schemaVersion: store.value.schemaVersion });
  } else {
    // The message can name a file, so only the code is logged.
    log.error('books.not-opened', { code: store.error.code });
  }
  return store;
}

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveAppFiles(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveAppFile(rendererDir, request.url);
    if (file === null) return new Response('Not found', { status: 404 });
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', packagedCsp);
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, { status: response.status, headers });
  });
}

function denyAllPermissions(): void {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  ses.setPermissionCheckHandler(() => false);
  ses.setDevicePermissionHandler(() => false);
}

function lockDownContents(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event, url) => {
      if (!isAppUrl(url, devServerUrl)) event.preventDefault();
    });
    contents.on('will-redirect', (event, url) => {
      if (!isAppUrl(url, devServerUrl)) event.preventDefault();
    });
    contents.on('will-frame-navigate', (event) => {
      if (!event.isMainFrame) event.preventDefault();
    });
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}

function createWindow(): void {
  const dataDir = app.getPath('userData');
  const saved = loadWindowBounds(
    dataDir,
    screen.getAllDisplays().map((d) => d.workArea),
  );
  const window = new BrowserWindow({
    ...(saved ?? { width: 1280, height: 800 }),
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    title: 'Accounting Books',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });
  window.once('ready-to-show', () => {
    window.show();
  });
  if (selfCheck.kind === 'run') {
    const { dir } = selfCheck;
    window.webContents.once('did-finish-load', () => {
      void (
        window.webContents.executeJavaScript(READ_STATUS_SCRIPT) as Promise<
          Omit<SelfCheckReport, 'packaged'>
        >
      ).then((status) => {
        const report: SelfCheckReport = { ...status, packaged: app.isPackaged };
        writeFileSync(join(dir, SELF_CHECK_FILE), `${JSON.stringify(report, null, 2)}\n`);
        log.info('app.self-check-finished');
        app.exit(0);
      });
    });
  }
  window.on('close', () => {
    if (!window.isMinimized() && !window.isFullScreen()) {
      saveWindowBounds(dataDir, window.getNormalBounds());
    }
  });
  window.on('closed', () => {
    mainWindow = null;
  });
  void window.loadURL(devServerUrl ?? APP_ENTRY_URL);
  mainWindow = window;
}

function focusMainWindow(): void {
  if (mainWindow === null) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

if (refusedFlags.length > 0) {
  log.error('app.debugging-refused', { flags: refusedFlags.length });
  app.exit(1);
} else if (selfCheck.kind === 'invalid') {
  log.error('app.self-check-refused', { code: selfCheck.reason });
  app.exit(2);
} else if (!app.requestSingleInstanceLock()) {
  log.info('app.second-instance-quit');
  app.quit();
} else {
  // Closing the window quits the app (client question 17, safe assumption).
  app.on('window-all-closed', () => {
    log.info('app.quit-on-close');
    app.quit();
  });
  app.on('second-instance', () => {
    log.info('app.second-instance-focused');
    focusMainWindow();
  });
  lockDownContents();
  void app.whenReady().then(() => {
    if (app.isPackaged) Menu.setApplicationMenu(Menu.buildFromTemplate(packagedMenuTemplate));
    denyAllPermissions();
    serveAppFiles();
    const store = openBooks();
    app.on('will-quit', () => {
      if (store.ok) store.value.close();
    });
    registerBridge(
      ipcMain,
      createHandlers({ app, store }),
      (url) => isAppUrl(url, devServerUrl),
      log,
    );
    createWindow();
    log.info('app.started', { devServer: devServerUrl !== null });
  });
}
