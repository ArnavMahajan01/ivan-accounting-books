import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { PAGES, type PageId } from '@shared/pages';
import { menuTemplate } from './menu';

function build(development: boolean, openPage: (page: PageId) => void = () => undefined) {
  return menuTemplate({ development, openPage });
}

function submenu(
  template: MenuItemConstructorOptions[],
  label: string,
): MenuItemConstructorOptions[] {
  const menu = template.find((m) => m.label === label);
  return (menu?.submenu ?? []) as MenuItemConstructorOptions[];
}

describe('the Mac menu', () => {
  it('has App, File, Edit, View, Window and Help, in that order', () => {
    const names = build(false).map((m) => m.role ?? m.label);
    expect(names).toEqual(['appMenu', 'fileMenu', 'editMenu', 'View', 'windowMenu', 'help']);
  });

  it('lists the pages in View with Command-1 to Command-9, Home first, and Settings on Command-comma', () => {
    const items = submenu(build(false), 'View').filter((i) => i.id?.startsWith('page-'));
    const pages = PAGES.filter((p) => p.id !== 'help' && p.id !== 'settings');
    expect(items.map((i) => [i.label, i.accelerator])).toEqual([
      ...pages.map((p, index) => [p.label, `Cmd+${String(index + 1)}`]),
      ['Settings', 'Cmd+,'],
    ]);
  });

  it('opens the page when a page item is chosen', () => {
    const openPage = vi.fn();
    const home = submenu(build(false, openPage), 'View').find((i) => i.id === 'page-home');
    (home?.click as () => void)();
    expect(openPage).toHaveBeenCalledWith('home');
  });

  it('puts Help in the Help menu with Command-?', () => {
    const openPage = vi.fn();
    const template = build(false, openPage);
    const help = (template.find((m) => m.role === 'help')?.submenu ??
      []) as MenuItemConstructorOptions[];
    expect(help.map((i) => [i.label, i.accelerator])).toEqual([['Accounting Books Help', 'Cmd+?']]);
    (help[0]?.click as () => void)();
    expect(openPage).toHaveBeenCalledWith('help');
  });

  it('has no reload or developer tools in the packaged app, and both in development', () => {
    const roles = (dev: boolean) => submenu(build(dev), 'View').map((i) => i.role);
    expect(roles(false)).not.toContain('reload');
    expect(roles(false)).not.toContain('toggleDevTools');
    expect(roles(true)).toContain('reload');
    expect(roles(true)).toContain('toggleDevTools');
  });
});
