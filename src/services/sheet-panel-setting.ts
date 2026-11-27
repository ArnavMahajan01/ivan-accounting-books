// Whether published sheets open inside the app (spec 118): a choice in Settings, off until he turns
// it on, because Google may refuse the sign-in there. Kept with the other choices in `app_meta`.

import { getAppMeta, setAppMeta } from '@data/app-meta-repository';
import type { ReadContext } from './context';

export const SHEET_PANEL_KEY = 'sheet_panel';

export function sheetPanelOn(ctx: ReadContext): boolean {
  return getAppMeta(ctx.db, SHEET_PANEL_KEY) === 'on';
}

export function setSheetPanelOn(ctx: ReadContext, on: boolean): void {
  setAppMeta(ctx.db, SHEET_PANEL_KEY, on ? 'on' : 'off');
}
