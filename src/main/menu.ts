// The Mac menu: App, File, Edit, View, Window and Help. View lists the pages with their shortcuts
// from @shared/shortcuts. The packaged app has no reload or developer tools item
// (context/rules/desktop-app.md); a development run adds them.

import type { MenuItemConstructorOptions } from 'electron';
import { PAGES, type PageId } from '@shared/pages';
import { shortcutForPage, toAccelerator } from '@shared/shortcuts';

export interface MenuOptions {
  /** True for an unpackaged run: adds Reload and Developer Tools to View. */
  readonly development: boolean;
  readonly openPage: (page: PageId) => void;
}

function pageItem(page: PageId, label: string, openPage: (p: PageId) => void) {
  const shortcut = shortcutForPage(page);
  return {
    id: `page-${page}`,
    label,
    ...(shortcut === undefined ? {} : { accelerator: toAccelerator(shortcut) }),
    click: () => {
      openPage(page);
    },
  } satisfies MenuItemConstructorOptions;
}

export function menuTemplate({ development, openPage }: MenuOptions): MenuItemConstructorOptions[] {
  const pages = PAGES.filter((p) => p.id !== 'help').map((p) => pageItem(p.id, p.label, openPage));
  const help = PAGES.find((p) => p.id === 'help');
  return [
    { role: 'appMenu' },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        ...pages,
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(development
          ? ([
              { type: 'separator' },
              { role: 'reload' },
              { role: 'toggleDevTools' },
            ] satisfies MenuItemConstructorOptions[])
          : []),
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: help === undefined ? [] : [pageItem(help.id, 'Accounting Books Help', openPage)],
    },
  ];
}
