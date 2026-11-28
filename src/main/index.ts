// Electron main process: one hardened window (context/rules/desktop-app.md, spec 008).

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  net,
  protocol,
  screen,
  session,
  shell,
} from 'electron';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bundledMigrations, openStore, type OpenError, type Store } from '@data/database';
import { consoleSink, createLogger } from '@shared/logger';
import { pageHash, type PageId } from '@shared/pages';
import { err, type Result } from '@shared/result';
import { dataFolder, parseDataDirArg, runName } from './app-identity';
import { APP_ENTRY_URL, APP_SCHEME, resolveAppFile } from './app-protocol';
import { registerBridge } from './bridge';
import { SAMPLE_DATA_SWITCH } from './build-flags';
import { createBooksSession } from './books-session';
import { contentSecurityPolicy } from './csp';
import { createHandlers } from './handlers';
import { loadAppearance, saveAppearance } from './appearance';
import { loadHelpPrefs, saveHelpPrefs } from './help-prefs';
import { systemClock } from './clock';
import { systemRandom } from './random';
import { readStatementFile } from './statement-files';
import { createReportExports } from './report-exports';
import { checkBooks } from '@services/check-books';
import { debuggingFlags } from './launch-guard';
import { logFileSink, teeSinks } from './log-file';
import { menuTemplate } from './menu';
import { loadWindowBounds, MIN_HEIGHT, MIN_WIDTH, saveWindowBounds } from './window-state';
import {
  parseSelfCheckArg,
  parseSelfCheckStatements,
  selfCheckScript,
  SELF_CHECK_FILE,
  type SelfCheckReport,
} from './self-check';
import { isAppUrl, isGooglePageUrl } from './navigation';
import { createGoogleAccess } from './google-setup';
import { createSheetCheck } from './sheet-check';
import { createSheetPanel } from './sheet-panel';
import { listInvoiceFiles, readInvoiceFile } from './invoice-files';
import { loadEnv } from '@shared/env';

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
const dataDirOverride = parseDataDirArg(process.argv, app.isPackaged);
// Files a self-check "chooses" in turn, instead of the Mac's file chooser. Empty for any normal launch.
const selfCheckStatements = selfCheck.kind === 'run' ? parseSelfCheckStatements(process.argv) : [];
let nextSelfCheckStatement = 0;
app.setPath(
  'userData',
  selfCheck.kind === 'run'
    ? selfCheck.dir
    : (dataDirOverride ?? dataFolder(app.getPath('appData'), name)),
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
const sheetPanel = createSheetPanel(() => mainWindow);

/** Opens a books file and applies any new migrations. */
function openBooksAt(path: string): Result<Store, OpenError> {
  const migrations = bundledMigrations();
  if (!migrations.ok)
    return err({ code: migrations.error.code, message: migrations.error.message });
  const store = openStore(path, migrations.value, () => systemClock.now());
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
    // The sheet panel alone may also go to Google's own pages (spec 118).
    const allowed = (url: string) =>
      sheetPanel.isPanel(contents) ? isGooglePageUrl(url) : isAppUrl(url, devServerUrl);
    contents.on('will-navigate', (event, url) => {
      if (!allowed(url)) event.preventDefault();
    });
    contents.on('will-redirect', (event, url) => {
      if (!allowed(url)) event.preventDefault();
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
        window.webContents.executeJavaScript(
          selfCheckScript(selfCheckStatements.length),
        ) as Promise<Omit<SelfCheckReport, 'packaged'>>
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

/** Changing only the address hash moves the page without a reload, so nothing is lost. */
function openPageInWindow(page: PageId): void {
  if (mainWindow === null) return;
  const entry = new URL(devServerUrl ?? APP_ENTRY_URL);
  entry.hash = pageHash(page);
  void mainWindow.loadURL(entry.toString());
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
    Menu.setApplicationMenu(
      Menu.buildFromTemplate(
        menuTemplate({ development: !app.isPackaged, openPage: openPageInWindow }),
      ),
    );
    denyAllPermissions();
    serveAppFiles();
    nativeTheme.themeSource = loadAppearance(app.getPath('userData'));
    // The real books, or the sample books if they were loaded last time (spec 047).
    const books = createBooksSession({
      dir: app.getPath('userData'),
      openBooks: openBooksAt,
      clock: systemClock,
      log,
      sampleSwitch: SAMPLE_DATA_SWITCH,
    });
    const store = books.store();
    if (store.ok) {
      // Counts and codes only: the log never holds anything from the books.
      const health = checkBooks({ db: store.value.db });
      const fields = {
        entries: health.entries,
        lines: health.lines,
        problems: health.problems.length,
      };
      if (health.problems.length === 0) log.info('books.checked', fields);
      else log.error('books.check-failed', { ...fields, first: health.problems[0] ?? 'none' });
    }
    app.on('will-quit', () => {
      books.close();
    });
    // The Google client id comes from the build (spec 106); GOOGLE_FAKE from the shell.
    const env = loadEnv({
      ...process.env,
      MAIN_VITE_GOOGLE_CLIENT_ID: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID,
      MAIN_VITE_GOOGLE_CLIENT_SECRET: import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET,
    });
    if (!env.ok) log.error('env.invalid', { problems: env.error.problems.length });
    const google = createGoogleAccess({
      dataDir: app.getPath('userData'),
      packaged: app.isPackaged,
      env: env.ok ? env.value : {},
      random: systemRandom,
      now: () => systemClock.now(),
      log,
      onStatus: (status) => {
        log.info('google.status', { kind: status.kind });
      },
    });
    const sheetCheck = createSheetCheck({
      books,
      google,
      clock: systemClock,
      random: systemRandom,
      log,
    });
    sheetCheck.start();
    app.on('will-quit', () => {
      sheetCheck.stop();
    });
    registerBridge(
      ipcMain,
      createHandlers({
        google,
        clipboard,
        checkSheets: () => sheetCheck.run(),
        sheetPanel,
        invoiceFiles: {
          choose: async () => {
            const options = {
              title: 'Bring in invoices from the Admin Dashboard',
              properties: ['openFile' as const],
              filters: [{ name: 'Admin Dashboard invoices', extensions: ['json'] }],
            };
            const result =
              mainWindow === null
                ? await dialog.showOpenDialog(options)
                : await dialog.showOpenDialog(mainWindow, options);
            return result.canceled ? null : (result.filePaths[0] ?? null);
          },
          read: readInvoiceFile,
          chooseFolder: async () => {
            const options = {
              title: 'Choose the folder the Admin Dashboard writes invoices to',
              properties: ['openDirectory' as const],
            };
            const result =
              mainWindow === null
                ? await dialog.showOpenDialog(options)
                : await dialog.showOpenDialog(mainWindow, options);
            return result.canceled ? null : (result.filePaths[0] ?? null);
          },
          list: listInvoiceFiles,
          // Only a PDF in the linked folder is ever opened, with the Mac's own app for it.
          openFile: async (path) =>
            path.toLowerCase().endsWith('.pdf') && (await shell.openPath(path)) === '',
        },
        app,
        books,
        system: {
          appearance: () => loadAppearance(app.getPath('userData')),
          setAppearance: (choice) => {
            saveAppearance(app.getPath('userData'), choice);
            nativeTheme.themeSource = choice;
          },
          helpPrefs: () => loadHelpPrefs(app.getPath('userData')),
          saveHelpPrefs: (prefs) => {
            saveHelpPrefs(app.getPath('userData'), prefs);
          },
          // Finder shows the folder; the path itself never goes to the screens.
          showBooksFolder: () => {
            void shell.openPath(app.getPath('userData'));
            return true;
          },
        },
        clock: systemClock,
        random: systemRandom,
        files: {
          choose: async () => {
            if (selfCheck.kind === 'run') {
              const next = selfCheckStatements[nextSelfCheckStatement];
              nextSelfCheckStatement += 1;
              return next ?? null;
            }
            const options = {
              title: 'Import a bank statement file',
              properties: ['openFile' as const],
              filters: [
                { name: 'Westpac statement (OFX)', extensions: ['ofx', 'qbo'] },
                { name: 'All files', extensions: ['*'] },
              ],
            };
            const result =
              mainWindow === null
                ? await dialog.showOpenDialog(options)
                : await dialog.showOpenDialog(mainWindow, options);
            return result.canceled ? null : (result.filePaths[0] ?? null);
          },
          read: readStatementFile,
        },
        exports: createReportExports(() => mainWindow),
        // Counts only: what a file holds is never logged.
        onImport: (event, counts) => {
          log.info(`import.${event}`, counts);
        },
      }),
      (url) => isAppUrl(url, devServerUrl),
      log,
    );
    createWindow();
    log.info('app.started', { devServer: devServerUrl !== null });
  });
}
