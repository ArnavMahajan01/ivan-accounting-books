// The real Google Sheet in a panel inside the app (spec 118; W07a, Option 2; risk G7), an option
// he turns on in Settings. It is a separate view with its own session, no preload and no bridge,
// sandboxed, with every permission denied, and it may only go to Google's own pages. If Google
// refuses or the page does not load, the screen shows the plain fallback with Open in Chrome. No
// tricks to get past Google's block (decisions/google-sheets-approach.md).

import { session, WebContentsView, type BrowserWindow, type WebContents } from 'electron';
import { isGooglePageUrl } from './navigation';

export const SHEET_PANEL_PARTITION = 'persist:google-sheet';

export interface PanelBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SheetPanel {
  /** Shows the sheet at these bounds of the window. `failed` when it did not load. */
  open(url: string, bounds: PanelBounds): Promise<'opened' | 'failed'>;
  move(bounds: PanelBounds): void;
  close(): void;
  /** Forgets the panel's sign-in and cookies: on Disconnect. */
  clearSession(): Promise<void>;
  /** Whether these web contents are the panel's, which may go to Google's pages. */
  isPanel(contents: WebContents): boolean;
}

export function createSheetPanel(getWindow: () => BrowserWindow | null): SheetPanel {
  let view: WebContentsView | null = null;
  let denied = false;

  const panelSession = () => {
    const ses = session.fromPartition(SHEET_PANEL_PARTITION);
    if (!denied) {
      ses.setPermissionRequestHandler((_contents, _permission, callback) => {
        callback(false);
      });
      ses.setPermissionCheckHandler(() => false);
      ses.setDevicePermissionHandler(() => false);
      denied = true;
    }
    return ses;
  };

  const close = () => {
    const window = getWindow();
    if (view !== null) {
      window?.contentView.removeChildView(view);
      view.webContents.close();
    }
    view = null;
  };

  return {
    async open(url, bounds) {
      const window = getWindow();
      if (window === null || !isGooglePageUrl(url)) return 'failed';
      close();
      const next = new WebContentsView({
        webPreferences: {
          session: panelSession(),
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          nodeIntegrationInSubFrames: false,
          webSecurity: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
          webviewTag: false,
          devTools: false,
        },
      });
      view = next;
      window.contentView.addChildView(next);
      next.setBounds(bounds);
      try {
        await next.webContents.loadURL(url);
        return 'opened';
      } catch {
        close();
        return 'failed';
      }
    },
    move(bounds) {
      view?.setBounds(bounds);
    },
    close,
    async clearSession() {
      close();
      await panelSession().clearStorageData();
    },
    isPanel: (contents) => view !== null && contents === view.webContents,
  };
}
