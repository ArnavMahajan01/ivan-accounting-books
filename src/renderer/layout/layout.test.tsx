import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { routeFromHash, ROUTES } from '../routes';
import { AppLayout } from './AppLayout';
import { PageToolbar } from './PageToolbar';
import { Sidebar } from './Sidebar';

afterEach(cleanup);
beforeEach(() => {
  window.localStorage.clear();
});

describe('routes', () => {
  it('reads the page from the address, and falls back to Home', () => {
    expect(routeFromHash('#/bank')).toBe('bank');
    expect(routeFromHash('#/accountant-changes')).toBe('accountant-changes');
    expect(routeFromHash('')).toBe('home');
    expect(routeFromHash('#/nowhere')).toBe('home');
    expect(routeFromHash('#components')).toBe('home');
  });

  it('lists the wireframe sidebar, with Settings and Help at the bottom', () => {
    expect(ROUTES.map((r) => r.label)).toEqual([
      'Home',
      'To review',
      'Bank',
      'Transactions',
      'Accounts',
      'Reports',
      'Rules',
      'Shared sheets',
      'Accountant changes',
      'Settings',
      'Help',
    ]);
    expect(ROUTES.filter((r) => r.place === 'bottom').map((r) => r.id)).toEqual([
      'settings',
      'help',
    ]);
  });
});

describe('Sidebar', () => {
  it('links every page, marks the current one, and shows counts above zero', () => {
    render(
      <Sidebar
        title="Harbour Lane Joinery"
        current="bank"
        collapsed={false}
        onToggle={() => undefined}
        counts={{ 'to-review': 37, 'accountant-changes': 0 }}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('a')).toHaveLength(11);
    expect(screen.getByRole('link', { name: 'Bank' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Bank' }).getAttribute('href')).toBe('#/bank');
    expect(screen.getByRole('link', { name: /To review/ }).textContent).toContain('37');
    expect(screen.getByRole('link', { name: 'Accountant changes' }).textContent).not.toContain('0');
  });

  it('keeps an accessible name for each item when collapsed', () => {
    render(
      <Sidebar
        title="x"
        current="home"
        collapsed
        onToggle={() => undefined}
        counts={{ 'to-review': 37 }}
      />,
    );
    expect(screen.getByRole('link', { name: 'To review, 37' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Show sidebar' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });
});

describe('AppLayout', () => {
  it('collapses the sidebar by button and by Control-Command-S, and remembers it', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <AppLayout title="Accounting Books" current="home">
        <p>Page</p>
      </AppLayout>,
    );
    await user.click(screen.getByRole('button', { name: 'Hide sidebar' }));
    expect(screen.getByRole('button', { name: 'Show sidebar' })).not.toBeNull();
    expect(window.localStorage.getItem('sidebar-collapsed')).toBe('true');
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', ctrlKey: true, metaKey: true }),
      );
    });
    expect(screen.getByRole('button', { name: 'Hide sidebar' })).not.toBeNull();
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', ctrlKey: true, metaKey: true }),
      );
    });
    unmount();
    render(
      <AppLayout title="Accounting Books" current="home">
        <p>Page</p>
      </AppLayout>,
    );
    expect(screen.getByRole('button', { name: 'Show sidebar' })).not.toBeNull();
  });
});

describe('page shortcuts', () => {
  const press = (init: KeyboardEventInit) => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }));
    });
  };

  it('opens each of the first nine pages with Command and its number, Home first', () => {
    render(
      <AppLayout title="Accounting Books" current="home">
        <p>Page</p>
      </AppLayout>,
    );
    ROUTES.slice(0, 9).forEach((route, index) => {
      window.location.hash = '#/somewhere-else';
      press({ key: String(index + 1), metaKey: true });
      expect(window.location.hash, route.id).toBe(`#/${route.id}`);
    });
  });

  it('opens Help with Command-?', () => {
    render(
      <AppLayout title="Accounting Books" current="home">
        <p>Page</p>
      </AppLayout>,
    );
    window.location.hash = '#/home';
    press({ key: '?', metaKey: true, shiftKey: true });
    expect(window.location.hash).toBe('#/help');
  });

  it('leaves other key presses alone', () => {
    render(
      <AppLayout title="Accounting Books" current="home">
        <p>Page</p>
      </AppLayout>,
    );
    window.location.hash = '#/bank';
    const event = new KeyboardEvent('keydown', { key: '1', cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(window.location.hash).toBe('#/bank');
    expect(event.defaultPrevented).toBe(false);
  });

  it('shows each shortcut in the sidebar tooltips', () => {
    render(<Sidebar title="x" current="home" collapsed={false} onToggle={() => undefined} />);
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('title')).toBe('Home (⌘1)');
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('title')).toBe(
      'Settings (⌘,)',
    );
    expect(screen.getByRole('link', { name: 'Help' }).getAttribute('title')).toBe('Help (⌘?)');
    expect(screen.getByRole('button', { name: 'Hide sidebar' }).getAttribute('title')).toBe(
      'Hide sidebar (⌃⌘S)',
    );
  });
});

describe('PageToolbar', () => {
  it('has the title as the page heading, with actions on the right', () => {
    render(<PageToolbar title="Bank" mainAction={<button type="button">Import file</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bank' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Import file' })).not.toBeNull();
  });
});
