import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@shared/result';
import { App } from '../App';
import { ROUTES } from '../routes';
import { CLEAN_PREVIEW, installBridge, REAL_STATE, SAMPLE_STATE, settle } from '../test-bridge';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/home';
  window.localStorage.clear();
});

const START = { ...REAL_STATE, needsStartChoice: true };

describe('the first-launch choice', () => {
  it('offers sample data or his own books, and nothing else, on the first launch with empty books', async () => {
    installBridge({ 'app.getBooksState': () => Promise.resolve(ok(START)) });
    render(<App />);
    await settle();
    expect(
      screen.getByRole('heading', { level: 1, name: 'How would you like to start?' }),
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Start with sample data' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Start my own books' })).not.toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
  });

  it('draws nothing at all while it finds out which books are open, so the choice never flashes', () => {
    installBridge({ 'app.getBooksState': () => new Promise(() => undefined) });
    const { container } = render(<App />);
    expect(container.querySelector('.app-loading')?.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('starts with sample data: loads it, then shows the app with the label and the business name', async () => {
    const user = userEvent.setup();
    const api = installBridge({ 'app.getBooksState': () => Promise.resolve(ok(START)) });
    render(<App />);
    await settle();
    await user.click(screen.getByRole('button', { name: 'Start with sample data' }));
    await settle();
    expect(vi.mocked(api['sample.load'])).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toBeNull();
    expect(screen.getByText('Harbour Lane Joinery Pty Ltd')).not.toBeNull();
    expect(screen.getByText('Sample data')).not.toBeNull();
  });

  it('starts with his own books: remembers the choice, and shows the app with no label', async () => {
    const user = userEvent.setup();
    const api = installBridge({
      'app.getBooksState': () => Promise.resolve(ok(START)),
      'home.getSummary': () => Promise.resolve(ok({ ...HOME_BRAND_NEW })),
    });
    render(<App />);
    await settle();
    await user.click(screen.getByRole('button', { name: 'Start my own books' }));
    await settle();
    expect(vi.mocked(api['app.startOwnBooks'])).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toBeNull();
    expect(screen.queryByText('Sample data')).toBeNull();
  });

  it('says in plain words when starting did not work, and lets him try again', async () => {
    const user = userEvent.setup();
    installBridge({
      'app.getBooksState': () => Promise.resolve(ok(START)),
      'sample.load': () => Promise.resolve(err({ code: 'internal' })),
    });
    render(<App />);
    await settle();
    await user.click(screen.getByRole('button', { name: 'Start with sample data' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toContain('That did not work');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Start with sample data' }).disabled,
    ).toBe(false);
  });
});

describe('the "Sample data" label', () => {
  it('is in the toolbar of every page while sample data is loaded', async () => {
    installBridge();
    render(<App />);
    await settle();
    for (const route of ROUTES) {
      window.location.hash = `#/${route.id}`;
      await settle();
      expect(screen.getByRole('heading', { level: 1, name: route.label }), route.id).not.toBeNull();
      expect(within(screen.getByRole('main')).getByText('Sample data'), route.id).not.toBeNull();
    }
  });

  it('is on a Help guide’s page too, and on the not-found page', async () => {
    installBridge();
    render(<App />);
    window.location.hash = '#/help/getting-started';
    await settle();
    expect(within(screen.getByRole('main')).getByText('Sample data')).not.toBeNull();
    window.location.hash = '#/help/no-such-guide';
    await settle();
    expect(within(screen.getByRole('main')).getByText('Sample data')).not.toBeNull();
  });

  it('is nowhere when the books are his own', async () => {
    installBridge({
      'app.getBooksState': () => Promise.resolve(ok(REAL_STATE)),
      'home.getSummary': () => Promise.resolve(ok(HOME_BRAND_NEW)),
    });
    render(<App />);
    await settle();
    for (const route of ROUTES) {
      window.location.hash = `#/${route.id}`;
      await settle();
      expect(screen.queryByText('Sample data'), route.id).toBeNull();
    }
  });

  it('names the business at the top of the sidebar, or the app until there is one', async () => {
    installBridge();
    const { unmount } = render(<App />);
    await settle();
    expect(
      within(screen.getByRole('complementary', { name: 'Sidebar' })).getByText(
        'Harbour Lane Joinery Pty Ltd',
      ),
    ).not.toBeNull();
    unmount();
    installBridge({
      'app.getBooksState': () => Promise.resolve(ok(REAL_STATE)),
      'home.getSummary': () => Promise.resolve(ok(HOME_BRAND_NEW)),
    });
    render(<App />);
    await settle();
    expect(
      within(screen.getByRole('complementary', { name: 'Sidebar' })).getByText('Accounting Books'),
    ).not.toBeNull();
  });

  it('still shows the app, with each page saying what is wrong, if the books state cannot be read', async () => {
    installBridge({ 'app.getBooksState': () => Promise.resolve(err({ code: 'internal' })) });
    render(<App />);
    await settle();
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toBeNull();
  });
});

describe('loading and clearing sample data', () => {
  it('loading from Settings puts the label on every page and refreshes the figures', async () => {
    const user = userEvent.setup();
    let state = REAL_STATE;
    const api = installBridge({
      'app.getBooksState': () => Promise.resolve(ok(state)),
      'sample.load': () => {
        state = SAMPLE_STATE;
        return Promise.resolve(ok(state));
      },
      'home.getSummary': () =>
        Promise.resolve(ok(state === SAMPLE_STATE ? HOME_SAMPLE : HOME_BRAND_NEW)),
    });
    window.location.hash = '#/settings';
    render(<App />);
    await settle();
    expect(screen.queryByText('Sample data')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Load sample data' }));
    await settle();
    expect(vi.mocked(api['sample.load'])).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole('main')).getByText('Sample data')).not.toBeNull();
    window.location.hash = '#/home';
    await settle();
    expect(screen.getByRole('link', { name: /Bank balance/ }).textContent).toContain('$43,642.35');
  });

  it('clearing from Settings asks first, then removes the label and shows empty pages', async () => {
    const user = userEvent.setup();
    let state = SAMPLE_STATE;
    const api = installBridge({
      'app.getBooksState': () => Promise.resolve(ok(state)),
      'sample.clear': () => {
        state = REAL_STATE;
        return Promise.resolve(ok(state));
      },
    });
    window.location.hash = '#/settings';
    render(<App />);
    await settle();
    await user.click(screen.getByRole('button', { name: 'Clear sample data' }));
    expect(screen.getByRole('alertdialog', { name: 'Clear the sample data?' })).not.toBeNull();
    expect(vi.mocked(api['sample.clear'])).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Clear sample data' }),
    );
    await settle();
    expect(vi.mocked(api['sample.clear'])).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Sample data')).toBeNull();
  });
});

// Home's answers for the states above.
import { asCents } from '@shared/money';
import { HOME } from '../test-bridge';
const HOME_BRAND_NEW = { ...HOME, brandNew: true, bank: { balance: asCents(0), accountCount: 0 } };
const HOME_SAMPLE = HOME;

describe('the count on To review', () => {
  const toReview = () =>
    within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
      name: /To review/,
    });

  it('shows how many imported lines are waiting, and nothing when there are none', async () => {
    installBridge({ 'review.getCount': () => Promise.resolve(ok({ count: 11 })) });
    render(<App />);
    await settle();
    expect(toReview().textContent).toContain('11');
    cleanup();
    installBridge({ 'review.getCount': () => Promise.resolve(ok({ count: 0 })) });
    render(<App />);
    await settle();
    expect(toReview().textContent).toBe('To review');
  });

  it('goes up after an import, without the page being opened again', async () => {
    const user = userEvent.setup();
    let waiting = 0;
    installBridge({
      'review.getCount': () => Promise.resolve(ok({ count: waiting })),
      'bank.chooseAndPreview': () =>
        Promise.resolve(ok({ kind: 'preview' as const, preview: CLEAN_PREVIEW })),
      'bank.commitImport': () => {
        waiting = 3;
        return Promise.resolve(
          ok({
            kind: 'imported' as const,
            added: 3,
            skipped: 0,
            rejected: 0,
            accountName: 'Business One ··4821',
          }),
        );
      },
    });
    window.location.hash = '#/bank';
    render(<App />);
    await settle();
    expect(toReview().textContent).toBe('To review');
    await user.click(screen.getByRole('button', { name: 'Import file' }));
    await settle();
    await user.click(screen.getByRole('button', { name: 'Import 3 lines' }));
    await settle();
    expect(toReview().textContent).toContain('3');
  });
});
