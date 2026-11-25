import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { err, ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { BankPage } from '../pages/BankPage';
import {
  CLEAN_PREVIEW,
  date,
  DUPLICATES_PREVIEW,
  installBridge,
  PROBLEM_PREVIEW,
  settle,
} from '../test-bridge';
import type { ImportPreview } from '@shared/views';
import { ImportProvider } from './ImportProvider';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/bank';
});

async function openWith(preview: ImportPreview) {
  const api = installBridge({
    'bank.chooseAndPreview': () => Promise.resolve(ok({ kind: 'preview' as const, preview })),
  });
  render(
    <BooksStateProvider>
      <ImportProvider>
        <BankPage />
      </ImportProvider>
    </BooksStateProvider>,
  );
  await settle();
  await userEvent.click(screen.getByRole('button', { name: 'Import file' }));
  await settle();
  return api;
}

const sheet = () => screen.getByRole('dialog');

describe('the import sheet: a clean file', () => {
  it('says in sentences which account and dates, how many lines will go to To review, and the balance', async () => {
    await openWith(CLEAN_PREVIEW);
    expect(
      within(sheet()).getByRole('heading', { name: 'Westpac_4821_14-20Nov2026.ofx' }),
    ).not.toBeNull();
    const text = sheet().textContent;
    expect(text).toContain('This file is for Business One ··4821, from 14/11/2026 to 20/11/2026.');
    expect(text).toContain('3 new lines will go to To review.');
    expect(text).toContain('Closing balance matches.');
    expect(text).toContain('File: $21,307.90 on 20/11/2026. Your books after import: $21,307.90.');
    // The sentences say nothing about duplicates or problems when there are none.
    const sentences = sheet().querySelector('.import-sheet__plain')?.textContent ?? '';
    expect(sentences).not.toContain('already in your books');
    expect(sentences).not.toContain('could not be read');
  });

  it('has Cancel and one main action that says how many lines it will import', async () => {
    await openWith(CLEAN_PREVIEW);
    expect(within(sheet()).getByRole('button', { name: 'Cancel' })).not.toBeNull();
    expect(within(sheet()).getByRole('button', { name: 'Import 3 lines' }).className).toContain(
      'button--main',
    );
  });

  it('keeps the table of lines closed until it is asked for', async () => {
    await openWith(CLEAN_PREVIEW);
    const details = sheet().querySelector('details');
    expect(details?.open).toBe(false);
    await userEvent.click(within(sheet()).getByText('See all lines'));
    expect(details?.open).toBe(true);
    const rows = within(
      within(sheet()).getByRole('grid', { name: 'Lines in this file' }),
    ).getAllByRole('row');
    expect(rows).toHaveLength(4); // the header and three lines
    expect(rows[1]?.textContent).toContain('DEPOSIT SMITH RENOVATIONS INV 1059');
    expect(rows[1]?.textContent).toContain('$4,950.00');
    expect(rows[2]?.textContent).toContain('-$96.40');
  });

  it('imports on the main action, then says how many were added, with a button to To review', async () => {
    const api = await openWith(CLEAN_PREVIEW);
    await userEvent.click(within(sheet()).getByRole('button', { name: 'Import 3 lines' }));
    await settle();
    expect(api['bank.commitImport']).toHaveBeenCalledWith({ previewId: 'pre_clean' });
    expect(
      within(sheet()).getByRole('heading', { name: '3 lines added to To review' }),
    ).not.toBeNull();
    // The sidebar's count and the Bank page's table are asked for again.
    expect(vi_calls(api['review.getCount'])).toBeGreaterThanOrEqual(2);
    expect(vi_calls(api['bank.list'])).toBeGreaterThanOrEqual(2);
    await userEvent.click(within(sheet()).getByRole('button', { name: 'Go to To review' }));
    expect(window.location.hash).toBe('#/to-review');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('gives focus back to Import file when the sheet closes, so the keyboard carries on from there', async () => {
    await openWith(CLEAN_PREVIEW);
    expect(within(sheet()).getByText('See all lines')).toBe(document.activeElement);
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Import file' }));
  });

  it('adds nothing when it is cancelled, or closed with Escape', async () => {
    const api = await openWith(CLEAN_PREVIEW);
    await userEvent.click(within(sheet()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await settle();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api['bank.commitImport']).not.toHaveBeenCalled();
  });
});

function vi_calls(fn: unknown): number {
  return (fn as { mock: { calls: unknown[] } }).mock.calls.length;
}

describe('the import sheet: a file with duplicates', () => {
  it('says how many are already in the books and will be skipped, and imports only the new ones', async () => {
    const api = await openWith(DUPLICATES_PREVIEW);
    const text = sheet().textContent;
    expect(text).toContain('2 new lines will go to To review.');
    expect(text).toContain(
      '1 line is already in your books from an earlier import. It will be skipped.',
    );
    await userEvent.click(within(sheet()).getByText('See all lines'));
    const rows = within(
      within(sheet()).getByRole('grid', { name: 'Lines in this file' }),
    ).getAllByRole('row');
    expect(rows[1]?.textContent).toContain('TIMBERLINK SUPPLIES PTY LTD');
    expect(rows[1]?.textContent).toContain('Duplicate · skipped');
    await userEvent.click(within(sheet()).getByRole('button', { name: 'Import 2 lines' }));
    await settle();
    expect(api['bank.commitImport']).toHaveBeenCalledOnce();
  });

  it('offers only Close when every line is already in the books', async () => {
    await openWith({
      ...DUPLICATES_PREVIEW,
      counts: { new: 0, duplicate: 3, rejected: 0 },
      lines: DUPLICATES_PREVIEW.lines.map((l) =>
        l.status === 'new' ? { ...l, status: 'duplicate' as const } : l,
      ),
    });
    expect(sheet().textContent).toContain('Nothing is new.');
    expect(within(sheet()).queryByRole('button', { name: /^Import/ })).toBeNull();
    expect(within(sheet()).getByRole('button', { name: 'Close' })).not.toBeNull();
  });
});

describe('the import sheet: a file with a problem', () => {
  it('names the line that could not be read and why, and says the difference is that line', async () => {
    await openWith(PROBLEM_PREVIEW);
    const text = sheet().textContent;
    expect(text).toContain(
      '1 line could not be read: line 17 has the date "31/11/2026", which is not a real date. It will not be imported.',
    );
    expect(text).toContain('Closing balance does not match.');
    expect(text).toContain('The difference, $100.00, is the line that could not be read.');
    expect(text).toContain('2 new lines will go to To review.');
  });

  it('can show only the lines that could not be read', async () => {
    await openWith(PROBLEM_PREVIEW);
    await userEvent.click(within(sheet()).getByText('See all lines'));
    await userEvent.selectOptions(
      within(sheet()).getByRole('combobox', { name: 'Show' }),
      'rejected',
    );
    const rows = within(
      within(sheet()).getByRole('grid', { name: 'Lines in this file' }),
    ).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1]?.textContent).toContain('Rejected');
    expect(rows[1]?.textContent).toContain('-$100.00');
    await userEvent.selectOptions(within(sheet()).getByRole('combobox', { name: 'Show' }), 'new');
    expect(
      within(within(sheet()).getByRole('grid', { name: 'Lines in this file' })).getAllByRole('row'),
    ).toHaveLength(3);
  });

  it('shows the first 200 lines of a long file, and says so', async () => {
    const many = Array.from({ length: 450 }, (_, i) => ({
      status: 'new' as const,
      position: i + 1,
      date: date('2026-11-14'),
      description: `LINE ${String(i + 1)}`,
      amount: asCents(495000),
    }));
    await openWith({
      ...CLEAN_PREVIEW,
      counts: { new: 450, duplicate: 0, rejected: 0 },
      lines: many,
    });
    await userEvent.click(within(sheet()).getByText('See all lines'));
    expect(
      within(within(sheet()).getByRole('grid', { name: 'Lines in this file' })).getAllByRole('row'),
    ).toHaveLength(201);
    expect(sheet().textContent).toContain('Showing the first 200 of 450 lines.');
    expect(sheet().textContent).toContain('450 new lines will go to To review.');
  });
});

describe('when a file is turned away or something goes wrong', () => {
  async function openRefused(reason: string, lastFour: string | null) {
    installBridge({
      'bank.chooseAndPreview': () =>
        Promise.resolve(
          ok({ kind: 'refused' as const, reason: reason as 'unknown-account', lastFour }),
        ),
    });
    render(
      <BooksStateProvider>
        <ImportProvider>
          <BankPage />
        </ImportProvider>
      </BooksStateProvider>,
    );
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await settle();
  }

  it('says why in plain words, and offers to choose another file', async () => {
    await openRefused('unknown-account', '9999');
    expect(sheet().textContent).toContain(
      'This file is for an account ending 9999, which is not one of your bank accounts.',
    );
    expect(within(sheet()).getByRole('button', { name: 'Choose another file' })).not.toBeNull();
  });

  it('says the preview is out of date when it was forgotten, and nothing new when it was all there', async () => {
    const api = await openWith(CLEAN_PREVIEW);
    (
      api['bank.commitImport'] as unknown as { mockResolvedValueOnce: (v: unknown) => void }
    ).mockResolvedValueOnce(ok({ kind: 'refused', reason: 'nothing-new' }));
    await userEvent.click(within(sheet()).getByRole('button', { name: 'Import 3 lines' }));
    await settle();
    expect(sheet().textContent).toContain('Every line in this file is already in your books');
  });

  it('says something went wrong, without detail, when the bridge fails', async () => {
    installBridge({
      'bank.chooseAndPreview': () => Promise.resolve(err({ code: 'internal' as const })),
    });
    render(
      <BooksStateProvider>
        <ImportProvider>
          <BankPage />
        </ImportProvider>
      </BooksStateProvider>,
    );
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await settle();
    expect(within(sheet()).getByRole('heading', { name: 'Something went wrong' })).not.toBeNull();
    expect(sheet().textContent).toContain('nothing was added');
  });
});

describe('dropping a file on the window', () => {
  function drop(files: File[]) {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.assign(event, { dataTransfer: { types: ['Files'], files } });
    act(() => {
      window.dispatchEvent(event);
    });
    return event;
  }

  async function renderApp(hash: string) {
    window.location.hash = hash;
    const api = installBridge();
    render(
      <BooksStateProvider>
        <ImportProvider>
          <p>Some other page</p>
        </ImportProvider>
      </BooksStateProvider>,
    );
    await settle();
    return api;
  }

  it('opens the preview from any page, passing only the file’s path, and keeps the window from opening the file', async () => {
    const api = await renderApp('#/home');
    const event = drop([new File(['x'], 'Westpac_4821.ofx')]);
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(api.pathForFile).toHaveBeenCalledOnce();
    expect(api['bank.previewFile']).toHaveBeenCalledWith({
      path: '/Users/someone/Downloads/Westpac_4821.ofx',
    });
    expect(window.location.hash).toBe('#/bank');
    expect(within(sheet()).getByRole('heading', { name: CLEAN_PREVIEW.fileName })).not.toBeNull();
  });

  it('asks for one file at a time when several are dropped, and reads none', async () => {
    const api = await renderApp('#/home');
    drop([new File(['x'], 'a.ofx'), new File(['y'], 'b.ofx')]);
    await settle();
    expect(within(sheet()).getByRole('heading', { name: 'One file at a time' })).not.toBeNull();
    expect(api['bank.previewFile']).not.toHaveBeenCalled();
  });

  it('shows a drop message while a file is dragged over, and takes it away when it leaves', async () => {
    await renderApp('#/home');
    const enter = new Event('dragenter', { bubbles: true });
    Object.assign(enter, { dataTransfer: { types: ['Files'], files: [] } });
    act(() => {
      window.dispatchEvent(enter);
    });
    expect(screen.getByText('Drop a statement file here to import it')).not.toBeNull();
    const leave = new Event('dragleave', { bubbles: true });
    Object.assign(leave, { dataTransfer: { types: ['Files'], files: [] } });
    act(() => {
      window.dispatchEvent(leave);
    });
    expect(screen.queryByText('Drop a statement file here to import it')).toBeNull();
  });

  it('ignores a drag that is not a file, such as selected text', async () => {
    await renderApp('#/home');
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.assign(event, { dataTransfer: { types: ['text/plain'], files: [] } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
