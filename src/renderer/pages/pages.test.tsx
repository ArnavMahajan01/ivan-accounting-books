import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ok } from '@shared/result';
import { ROUTES } from '../routes';
import { Page } from './pages';

afterEach(cleanup);
beforeEach(() => {
  // The screens reach the main process only through the bridge. A stand-in answers here.
  Object.defineProperty(window, 'bridge', {
    configurable: true,
    value: {
      'app.getInfo': () => Promise.resolve(ok({ version: '1.2.3', development: false })),
      'app.getDataStatus': () =>
        Promise.resolve(ok({ schemaVersion: 1, integrity: 'ok', problem: null })),
    },
  });
});

describe('every page', () => {
  it.each(ROUTES.map((r) => [r.id, r.label] as const))(
    '%s opens with its title as the heading',
    (id, label) => {
      render(<Page route={id} />);
      expect(screen.getByRole('heading', { level: 1, name: label })).not.toBeNull();
    },
  );

  it.each(ROUTES.filter((r) => !['home', 'settings'].includes(r.id)).map((r) => r.id))(
    '%s says in plain words that it is coming in a later version',
    (id) => {
      render(<Page route={id} />);
      expect(screen.getByText('Coming in a later version.')).not.toBeNull();
    },
  );
});

describe('Home', () => {
  it('shows the Getting started list from the wireframe, and one main action', () => {
    render(<Page route="home" />);
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
