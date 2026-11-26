import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { ImportProvider } from '../import/ImportProvider';
import { BANK, installBridge, settle } from '../test-bridge';
import { AccountsPage } from './AccountsPage';
import { BankPage } from './BankPage';
import { RulesPage } from './RulesPage';
import { TransactionsPage } from './TransactionsPage';

afterEach(cleanup);
beforeEach(() => {
  installBridge();
});

async function show(page: React.ReactNode) {
  render(
    <BooksStateProvider>
      <ImportProvider>{page}</ImportProvider>
    </BooksStateProvider>,
  );
  await settle();
}

describe('the Rules page (specs 079, 080)', () => {
  it('lists the rules in order, with what each catches and gives', async () => {
    window.location.hash = '#/rules';
    await show(<RulesPage />);
    const rows = within(screen.getByRole('grid', { name: 'Rules' }))
      .getAllByRole('row')
      .slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Timberlink is always materials'),
      expect.stringContaining('Fuel'),
      expect.stringContaining('Phone and internet'),
    ]);
    expect(rows[1]?.textContent).toContain(
      'Description contains "AMPOL" or Description contains "SHELL"',
    );
    expect(rows[2]?.textContent).toContain(
      'Split: 70% Office supplies, 30% Tools and small equipment',
    );
    expect(rows[2]?.textContent).toContain('Off');
  });

  it('moves a rule with its arrow, and with Option and the up key', async () => {
    const api = installBridge();
    await show(<RulesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Move Fuel up' }));
    expect(vi.mocked(api['rules.move']).mock.calls[0]?.[0]).toEqual({
      id: 'rul_fuel',
      toPosition: 0,
    });
    const row = within(screen.getByRole('grid', { name: 'Rules' })).getAllByRole('row')[3];
    row?.focus();
    await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(vi.mocked(api['rules.move']).mock.calls[1]?.[0]).toEqual({
      id: 'rul_phone',
      toPosition: 1,
    });
  });

  it('turns a rule off from its row', async () => {
    const api = installBridge();
    await show(<RulesPage />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Fuel is on' }));
    expect(vi.mocked(api['rules.setActive']).mock.calls[0]?.[0]).toEqual({
      id: 'rul_fuel',
      active: false,
    });
  });

  it('makes a rule in the panel, tests it, and saves it', async () => {
    const api = installBridge();
    await show(<RulesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'New rule' }));
    const panel = screen.getByRole('complementary', { name: 'New rule' });
    await userEvent.type(within(panel).getByRole('textbox', { name: 'Rule name' }), 'Bunnings');
    await userEvent.type(
      within(panel).getByRole('textbox', { name: 'Condition 1: words' }),
      'BUNNINGS',
    );
    await userEvent.type(within(panel).getByRole('combobox', { name: 'Account' }), '5000');
    await userEvent.click(
      within(panel).getByRole('checkbox', { name: /Post matching lines by themselves/ }),
    );
    await userEvent.click(within(panel).getByRole('button', { name: 'Test' }));
    await settle();
    expect(panel.textContent).toContain('Test: matches 9 lines in To review and 41 posted lines.');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    await settle();
    expect(vi.mocked(api['rules.save']).mock.calls[0]?.[0]).toEqual({
      id: null,
      rule: {
        name: 'Bunnings',
        direction: 'out',
        bankAccountIds: [],
        matchMode: 'all',
        conditions: [{ field: 'description', op: 'contains', text: 'BUNNINGS' }],
        target: { kind: 'account', accountId: 'acc_mat', taxCodeId: 'tax_gst' },
        payeeId: null,
        autoPost: true,
      },
    });
  });

  it('will not save a split that does not add to 100%', async () => {
    const api = installBridge();
    await show(<RulesPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Phone and internet' }));
    const panel = screen.getByRole('complementary', { name: 'Edit rule' });
    const percent = within(panel).getByRole('textbox', { name: 'Split 2: percentage' });
    await userEvent.clear(percent);
    await userEvent.type(percent, '20');
    await userEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    expect(within(panel).getByRole('alert').textContent).toBe(
      'The split must add up to 100%. It adds up to 90%.',
    );
    expect(api['rules.save']).not.toHaveBeenCalled();
  });
});

describe('Transactions: change the account (spec 083)', () => {
  it('changes one in its row, and moves the ticked ones', async () => {
    const api = installBridge();
    await show(<TransactionsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Change account for Bunnings' }));
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Account for Bunnings' }),
      'acc_prepay',
    );
    await settle();
    expect(vi.mocked(api['transactions.move']).mock.calls[0]?.[0]).toEqual({
      entryIds: ['ent_bunnings'],
      accountId: 'acc_prepay',
    });
    expect(screen.getByRole('status').textContent).toContain('1 transaction moved to Prepayments.');
    await userEvent.click(screen.getByRole('button', { name: 'Select' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Bunnings' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Move 1 to' }), 'acc_mat');
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(vi.mocked(api['transactions.move']).mock.calls[1]?.[0]).toEqual({
      entryIds: ['ent_bunnings'],
      accountId: 'acc_mat',
    });
  });
});

describe('Accounts: new and edit (spec 084)', () => {
  it('adds an account with its usual GST', async () => {
    const api = installBridge();
    await show(<AccountsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'New account' }));
    const sheet = screen.getByRole('dialog', { name: 'New account' });
    await userEvent.type(
      within(sheet).getByRole('textbox', { name: 'Name' }),
      'Workshop consumables',
    );
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Code' }), '6200');
    await userEvent.selectOptions(
      within(sheet).getByRole('combobox', { name: 'Usual GST' }),
      'tax_gst',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await settle();
    expect(vi.mocked(api['accounts.add']).mock.calls[0]?.[0]).toEqual({
      code: '6200',
      name: 'Workshop consumables',
      type: 'expense',
      parentId: null,
      defaultTaxCodeId: 'tax_gst',
    });
    expect(screen.getByRole('status').textContent).toBe('Added 6200 Workshop consumables.');
  });

  it('warns that an account with transactions keeps them when it stops being used', async () => {
    const api = installBridge();
    await show(<AccountsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Materials and supplies' }));
    const sheet = screen.getByRole('dialog', { name: 'Edit Materials and supplies' });
    expect(sheet.textContent).toContain(
      'This account has posted transactions. They stay as they are',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Stop using this account' }));
    expect(vi.mocked(api['accounts.setActive']).mock.calls[0]?.[0]).toEqual({
      id: 'acc_mat',
      active: false,
    });
  });
});

describe('Reconcile (spec 086)', () => {
  it('fills in the last statement, says the books agree, and finishes', async () => {
    const api = installBridge({ 'bank.list': vi.fn(() => Promise.resolve(ok(BANK))) });
    await show(<BankPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Reconcile Business One ··4821' }));
    await settle();
    const sheet = screen.getByRole('dialog', { name: 'Reconcile Business One ··4821' });
    expect(within(sheet).getByLabelText('Statement date')).toHaveProperty('value', '2026-11-20');
    expect(sheet.textContent).toContain('Your books agree with the statement on 20/11/2026');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Finish' }));
    await settle();
    expect(vi.mocked(api['bank.finishReconcile']).mock.calls[0]?.[0]).toEqual({
      bankAccountId: 'bnk_one',
      statementDate: '2026-11-20',
      statementBalance: 1864235,
    });
    expect(screen.getByRole('status').textContent).toBe(
      'Business One ··4821 is reconciled to 20/11/2026.',
    );
  });
});
