import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ROUTES } from '../routes';
import { HOME, installBridge, settle } from '../test-bridge';
import { ok } from '@shared/result';
import { Page } from './pages';

afterEach(cleanup);
beforeEach(() => {
  // The screens reach the main process only through the bridge. A stand-in answers here.
  installBridge();
});

describe('every page', () => {
  it.each(ROUTES.map((r) => [r.id, r.label] as const))(
    '%s opens with its title as the heading',
    (id, label) => {
      render(<Page route={id} />);
      expect(screen.getByRole('heading', { level: 1, name: label })).not.toBeNull();
    },
  );

  it.each(
    ROUTES.filter(
      (r) => !['home', 'settings', 'help', 'accounts', 'transactions'].includes(r.id),
    ).map((r) => r.id),
  )('%s says in plain words that it is coming in a later version', (id) => {
    render(<Page route={id} />);
    expect(screen.getByText('Coming in a later version.')).not.toBeNull();
  });
});

describe('keyboard and screen readers', () => {
  // Every control in a page has a name a screen reader can say, and is reachable by Tab.
  it.each(ROUTES.map((r) => r.id))('%s has a name on every control', async (id) => {
    render(<Page route={id} />);
    await settle();
    await screen.findAllByRole('heading');
    for (const role of ['button', 'link', 'textbox', 'searchbox', 'combobox'] as const) {
      const all = screen.queryAllByRole(role);
      const named = screen.queryAllByRole(role, { name: /\S/ });
      expect(named.length, `${id}: a ${role} has no name`).toBe(all.length);
      for (const control of all) {
        // A control inside a table row is reached with the row (arrow keys, then Enter), as in the
        // Table's own selection checkboxes, so it is not another stop in the Tab order.
        if (control.closest('tr.table__row') !== null) continue;
        expect(control.getAttribute('tabindex')).not.toBe('-1');
      }
    }
  });
});

describe('Home', () => {
  it('shows the Getting started list from the wireframe, and one main action, for brand-new books', async () => {
    installBridge({ 'home.getSummary': () => Promise.resolve(ok({ ...HOME, brandNew: true })) });
    render(<Page route="home" />);
    await settle();
    expect(screen.getByRole('heading', { name: 'Getting started' })).not.toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(
      screen.getByText(/Download a statement file \(OFX or CSV\) from Westpac Online Banking/),
    ).not.toBeNull();
    expect(document.querySelectorAll('.button--main')).toHaveLength(1);
  });
});

describe('Settings', () => {
  it('shows the version and the books status in the About card', async () => {
    render(<Page route="settings" />);
    expect((await screen.findByTestId('app-info')).textContent).toBe('Version 1.2.3');
    expect((await screen.findByTestId('data-status')).textContent).toBe(
      'Schema version 1, integrity: ok',
    );
  });
});
