import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@shared/result';
import type { ReviewView } from '@shared/views';
import { BooksStateProvider } from '../books-state';
import { REVIEW, installBridge, settle } from '../test-bridge';
import { ToReviewPage } from './ToReviewPage';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/to-review';
  installBridge();
});

async function open() {
  render(
    <BooksStateProvider>
      <ToReviewPage />
    </BooksStateProvider>,
  );
  await settle();
}

const table = () => screen.getByRole('grid', { name: 'Bank lines' });
const rowOf = (text: string) => {
  const row = within(table())
    .getAllByRole('row')
    .find((r) => r.textContent.includes(text));
  if (row === undefined) throw new Error(`no row ${text}`);
  return row;
};
const actionsSent = (api: ReturnType<typeof installBridge>) =>
  vi.mocked(api['review.post']).mock.calls.map(([input]) => input.actions);

describe('the To review page (spec 068)', () => {
  it('lists each line with Spent and Received apart, From/To, and what the app has for it', async () => {
    await open();
    expect(screen.getByRole('heading', { level: 1, name: 'To review' })).not.toBeNull();
    expect(screen.getByText('5 lines')).not.toBeNull();
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(
      expect.arrayContaining(['Date', 'Bank description', 'Spent', 'Received', 'Match or account']),
    );
    expect(rowOf('TIMBERLINK').textContent).toContain('$1,284.70');
    expect(rowOf('TIMBERLINK').textContent).toContain('same as last time');
    expect(within(rowOf('TIMBERLINK')).getByRole('combobox', { name: /From\/To/ })).toHaveProperty(
      'value',
      'Timberlink Supplies',
    );
    expect(rowOf('AMPOL').textContent).toContain('Match');
    expect(rowOf('AMPOL').textContent).toContain('same amount in your books');
    expect(rowOf('TRANSFER TO CASH').textContent).toContain('Transfer to Business Cash Reserve');
    expect(rowOf('DEPOSIT ELLIS').textContent).toContain('$3,300.00');
  });

  it('has one main action, and lists every key at the bottom', async () => {
    await open();
    expect(document.querySelectorAll('.button--main')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Post all suggested (3)' })).not.toBeNull();
    const keys = screen.getByLabelText('Keyboard shortcuts').textContent;
    for (const words of ['move', 'select', 'post', 'post selected', 'split', 'transfer', 'undo']) {
      expect(keys).toContain(words);
    }
  });

  it('combines the filters in one request, and shows the counts', async () => {
    const api = installBridge();
    await open();
    expect(screen.getByRole('radio', { name: 'Suggested 3' })).not.toBeNull();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Bank account' }),
      'bnk_one',
    );
    await userEvent.click(screen.getByRole('radio', { name: 'No suggestion 2' }));
    await userEvent.type(screen.getByRole('searchbox', { name: /Search/ }), 'bunn');
    await new Promise((r) => setTimeout(r, 300));
    await settle();
    expect(vi.mocked(api['review.list']).mock.calls.at(-1)?.[0]).toEqual({
      bankAccountId: 'bnk_one',
      show: 'no-suggestion',
      search: 'bunn',
    });
  });

  it('says there is nothing to review, with the way to the Bank page', async () => {
    const empty: ReviewView = {
      ...REVIEW,
      lines: [],
      waiting: 0,
      counts: { all: 0, suggested: 0, noSuggestion: 0 },
    };
    installBridge({ 'review.list': vi.fn(() => Promise.resolve(ok(empty))) });
    await open();
    expect(screen.getByText('Nothing to review. Import a file from the Bank page.')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Go to Bank' }));
    expect(window.location.hash).toBe('#/bank');
  });

  it('says so in plain words when the lines cannot be read, with a retry', async () => {
    installBridge({
      'review.list': vi.fn(() => Promise.resolve(err({ code: 'internal' as const }))),
    });
    await open();
    expect(screen.getByRole('alert').textContent).toContain('could not be read');
    expect(screen.getByRole('button', { name: 'Try again' })).not.toBeNull();
  });
});

describe('posting (specs 069, 070)', () => {
  it('posts one line with the account typed and its GST code', async () => {
    const api = installBridge();
    await open();
    const row = rowOf('BUNNINGS');
    const account = within(row).getByRole('combobox', { name: 'Account for BUNNINGS 4532' });
    await userEvent.type(account, 'Office');
    expect(
      within(row).getByRole('combobox', { name: 'GST code for BUNNINGS 4532' }),
    ).toHaveProperty('value', 'tax_gst');
    await userEvent.click(within(row).getByRole('button', { name: 'Post BUNNINGS 4532' }));
    await settle();
    expect(actionsSent(api)).toEqual([
      [
        {
          kind: 'account',
          lineId: 'stl_bunnings',
          accountId: 'acc_office',
          taxCodeId: 'tax_gst',
          payeeId: null,
        },
      ],
    ]);
    expect(screen.getByRole('status').textContent).toContain('1 posted.');
  });

  it('Return in the account box posts the line', async () => {
    const api = installBridge();
    await open();
    const account = within(rowOf('BUNNINGS')).getByRole('combobox', { name: /Account for/ });
    await userEvent.type(account, '6010{Enter}');
    await settle();
    expect(actionsSent(api)[0]?.[0]).toMatchObject({ accountId: 'acc_fees', taxCodeId: 'tax_inp' });
  });

  it('Return on a row posts what it shows: here the match', async () => {
    const api = installBridge();
    await open();
    rowOf('AMPOL').focus();
    await userEvent.keyboard('{Enter}');
    await settle();
    expect(actionsSent(api)).toEqual([
      [{ kind: 'match', lineId: 'stl_ampol', entryId: 'ent_fuel' }],
    ]);
  });

  it('posts the lines ticked, with ⌘Return, and says what happened', async () => {
    const api = installBridge({
      'review.post': vi.fn(() =>
        Promise.resolve(
          ok({
            posted: ['stl_timber'],
            alsoPosted: [],
            failed: [{ lineId: 'stl_deposit', reason: 'needs-account' as const }],
          }),
        ),
      ),
    });
    await open();
    await userEvent.click(within(rowOf('TIMBERLINK')).getByRole('checkbox'));
    await userEvent.click(within(rowOf('DEPOSIT ELLIS')).getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Post 2 selected' })).not.toBeNull();
    rowOf('TIMBERLINK').focus();
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    await settle();
    expect(actionsSent(api)[0]?.map((a) => [a.kind, a.lineId])).toEqual([
      ['account', 'stl_timber'],
      ['account', 'stl_deposit'],
    ]);
    expect(actionsSent(api)[0]?.[1]).toMatchObject({ accountId: null });
    expect(screen.getByRole('status').textContent).toContain('1 posted. 1 needs an account.');
  });

  it('Space ticks the focused row', async () => {
    await open();
    rowOf('TIMBERLINK').focus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Post 1 selected' })).not.toBeNull();
  });

  it('Post all suggested posts each line with a match, transfer or suggestion', async () => {
    const api = installBridge();
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Post all suggested (3)' }));
    await settle();
    expect(actionsSent(api)[0]).toEqual([
      {
        kind: 'account',
        lineId: 'stl_timber',
        accountId: 'acc_mat',
        taxCodeId: 'tax_gst',
        payeeId: 'con_timber',
      },
      { kind: 'match', lineId: 'stl_ampol', entryId: 'ent_fuel' },
      { kind: 'transfer', lineId: 'stl_transfer', otherBankAccountId: 'bnk_reserve' },
    ]);
  });
});

describe('undo (spec 075)', () => {
  it('Undo takes the last post back', async () => {
    const api = installBridge();
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Post all suggested (3)' }));
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await settle();
    expect(vi.mocked(api['review.undo']).mock.calls[0]?.[0]).toEqual({
      lineIds: ['stl_timber', 'stl_ampol', 'stl_transfer'],
    });
    expect(screen.getByRole('status').textContent).toContain(
      'Undone. 3 lines are back in To review.',
    );
  });

  it('⌘Z does the same, but not while typing in a box', async () => {
    const api = installBridge();
    await open();
    rowOf('AMPOL').focus();
    await userEvent.keyboard('{Enter}');
    await settle();
    const account = within(rowOf('BUNNINGS')).getByRole('combobox', { name: /Account for/ });
    account.focus();
    fireEvent.keyDown(account, { key: 'z', metaKey: true });
    expect(api['review.undo']).not.toHaveBeenCalled();
    rowOf('TIMBERLINK').focus();
    fireEvent.keyDown(rowOf('TIMBERLINK'), { key: 'z', metaKey: true });
    await settle();
    expect(api['review.undo']).toHaveBeenCalledOnce();
  });

  it('says so when the period has been locked since', async () => {
    installBridge({
      'review.undo': vi.fn(() =>
        Promise.resolve(ok({ kind: 'refused' as const, reason: 'locked' as const })),
      ),
    });
    await open();
    await userEvent.click(within(rowOf('AMPOL')).getByRole('button', { name: /Post AMPOL/ }));
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toContain('locked period');
  });
});

describe('From/To (spec 071)', () => {
  it('saves a new payee when he leaves the box, says how many lines show it, and Undo takes it back', async () => {
    const api = installBridge();
    await open();
    const payee = within(rowOf('BUNNINGS')).getByRole('combobox', { name: /From\/To/ });
    await userEvent.type(payee, 'Bunnings{Enter}');
    await settle();
    expect(vi.mocked(api['review.savePayee']).mock.calls[0]?.[0]).toEqual({
      lineId: 'stl_bunnings',
      name: 'Bunnings',
    });
    expect(screen.getByRole('status').textContent).toContain(
      'Saved Bunnings as a supplier. 2 more lines now show it.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await settle();
    expect(vi.mocked(api['review.undoPayee']).mock.calls[0]?.[0]).toEqual({
      contactId: 'con_new',
      words: 'BUNNINGS',
    });
  });

  it('does not save when the box still holds the payee the line had', async () => {
    const api = installBridge();
    await open();
    const payee = within(rowOf('TIMBERLINK')).getByRole('combobox', { name: /From\/To/ });
    payee.focus();
    payee.blur();
    await settle();
    expect(api['review.savePayee']).not.toHaveBeenCalled();
  });
});

describe('the Split sheet (spec 072)', () => {
  it('opens with S, says what is left to split, and saves only at $0.00', async () => {
    const api = installBridge();
    await open();
    rowOf('BUNNINGS').focus();
    await userEvent.keyboard('s');
    const sheet = screen.getByRole('dialog', { name: /Split: BUNNINGS 4532/ });
    const save = within(sheet).getByRole('button', { name: 'Save split' });
    expect(sheet.textContent).toContain('Left to split');
    const amount1 = within(sheet).getByRole('textbox', { name: 'Amount 1' });
    await userEvent.clear(amount1);
    await userEvent.type(amount1, '112.60');
    expect(sheet.textContent).toContain('$300.00');
    expect(save).toHaveProperty('disabled', true);
    await userEvent.type(within(sheet).getByRole('combobox', { name: 'Account 1' }), 'Office');
    await userEvent.type(within(sheet).getByRole('combobox', { name: 'Account 2' }), 'Tools');
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Amount 2' }), '300');
    expect(sheet.textContent).toContain('$0.00 ✓');
    expect(save).toHaveProperty('disabled', false);
    await userEvent.click(save);
    await settle();
    expect(vi.mocked(api['review.split']).mock.calls[0]?.[0]).toEqual({
      lineId: 'stl_bunnings',
      payeeId: null,
      parts: [
        { accountId: 'acc_office', taxCodeId: 'tax_gst', amount: 11260 },
        { accountId: 'acc_tools', taxCodeId: 'tax_gst', amount: 30000 },
      ],
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says when an amount is too much', async () => {
    await open();
    await userEvent.click(
      within(rowOf('BUNNINGS')).getByRole('button', { name: 'Split BUNNINGS 4532' }),
    );
    const sheet = screen.getByRole('dialog');
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Amount 2' }), '10');
    expect(sheet.textContent).toContain('$10.00 too much');
  });
});

describe('the Transfer sheet (spec 073)', () => {
  it('opens with T, shows the matching line in the other account, and saves the transfer', async () => {
    const api = installBridge();
    await open();
    rowOf('TRANSFER TO CASH').focus();
    await userEvent.keyboard('t');
    const sheet = screen.getByRole('dialog', { name: 'Transfer between your accounts' });
    expect(sheet.textContent).toContain(
      'Matches a line in Business Cash Reserve ··7730 on 06/11/2026',
    );
    expect(sheet.textContent).toContain('has no GST');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save transfer' }));
    await settle();
    expect(actionsSent(api)[0]).toEqual([
      { kind: 'transfer', lineId: 'stl_transfer', otherBankAccountId: 'bnk_reserve' },
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says the line will wait for its other side when there is none', async () => {
    await open();
    rowOf('BUNNINGS').focus();
    await userEvent.keyboard('t');
    expect(screen.getByRole('dialog').textContent).toContain('will wait in Transfers in transit');
  });
});
