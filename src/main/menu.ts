// The packaged app's menu: the standard app, Edit and Window menus, with no View menu,
// so there is no reload or developer tools item (context/rules/desktop-app.md).

import type { MenuItemConstructorOptions } from 'electron';

export const packagedMenuTemplate: MenuItemConstructorOptions[] = [
  { role: 'appMenu' },
  { role: 'editMenu' },
  { role: 'windowMenu' },
];
