import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { BooksStateProvider } from '../books-state';
import { InvoicesPage } from '../invoices/InvoicesPage';
import { CONTACT_PAGE, installBridge, settle } from '../test-bridge';
import { contactIdFromHash, formatAbn } from './contact-text';
import { ContactsPage } from './ContactsPage';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/contacts';
});

async function show(page: 'contacts' | 'invoices' = 'contacts') {
  render(
    <BooksStateProvider>
      {page === 'contacts' ? <ContactsPage /> : <InvoicesPage />}
    </BooksStateProvider>,
  );
  await settle();
}

const bodyRows = (name: string) =>
  within(screen.getByRole('grid', { name }))
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.textContent);

describe('the contacts list (spec 123)', () => {
  it('lists customers with what they owe, the oldest unpaid in words, and where each came from', async () => {
    installBridge();
    await show();
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Customers 2' }).checked).toBe(true);
    expect(bodyRows('Customers')).toEqual([
      expect.stringMatching(/Coastal Body Corporate\$6,600\.00Overdue · 22 daysfrom an invoice/),
      expect.stringMatching(
        /Smith Renovations\$1,650\.00Unpaid · due 24[/]11[/]2026from an invoice/,
      ),
    ]);
  });

  it('switches to suppliers, and finds a name', async () => {
    installBridge();
    await show();
    await userEvent.click(screen.getByRole('radio', { name: 'Suppliers 1' }));
    expect(bodyRows('Suppliers')).toEqual([
      expect.stringMatching(/Bunnings\$852\.8518[/]11[/]2026saved from a bank line/),
    ]);
    expect(screen.getByRole('columnheader', { name: /Paid in FY 2026–27/ })).toBeTruthy();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search contacts by name' }), 'zz');
    expect(screen.getByText('No suppliers have “zz” in their name.')).toBeTruthy();
  });

  it('adds a contact by hand and opens its page', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'New contact' }));
    const sheet = screen.getByRole('dialog', { name: 'New contact' });
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Name' }), 'Foster Fitouts');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await settle();
    expect(api['contacts.add']).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Foster Fitouts', kind: 'customer' }),
    );
    expect(window.location.hash).toBe('#/contacts/con_new');
  });

  it('says why a contact was not saved', async () => {
    installBridge({
      'contacts.add': vi.fn(() =>
        Promise.resolve(ok({ kind: 'refused' as const, reason: 'bad-abn' as const })),
      ),
    });
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'New contact' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toBe(
      'That ABN is not a real one. Check its 11 digits.',
    );
  });

  it('says so when there are no contacts yet', async () => {
    installBridge({
      'contacts.list': vi.fn(() => Promise.resolve(ok({ rows: [], yearLabel: 'FY 2026–27' }))),
    });
    await show();
    expect(screen.getByText(/No contacts yet/)).toBeTruthy();
  });
});

describe('tidying duplicates (spec 124)', () => {
  it('offers a pair with why, and merges it after asking which name to keep', async () => {
    const api = installBridge();
    await show();
    const pairs = screen.getByRole('region', { name: 'Contacts that look the same' });
    expect(pairs.textContent).toContain('1 pair looks like the same contact.');
    expect(pairs.textContent).toContain('“Bunnings” and “Bunnings Warehouse”same bank description');
    await userEvent.click(
      within(pairs).getByRole('button', { name: 'Merge Bunnings and Bunnings Warehouse' }),
    );
    const sheet = screen.getByRole('dialog', { name: 'Merge Bunnings and Bunnings Warehouse' });
    expect(api['contacts.merge']).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Bunnings Warehouse' }));
    expect(sheet.textContent).toContain(
      'saved bank description of Bunnings moves to Bunnings Warehouse',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Merge' }));
    await settle();
    expect(api['contacts.merge']).toHaveBeenCalledWith({
      keepId: 'con_bunningswarehouse',
      mergeId: 'con_bunnings',
    });
    expect(screen.getByRole('status').textContent).toBe(
      'Merged Bunnings into Bunnings Warehouse. 3 transactions moved.',
    );
    expect(api['contacts.list']).toHaveBeenCalledTimes(2);
  });

  it('keeps both, and says why a merge was refused', async () => {
    const api = installBridge({
      'contacts.merge': vi.fn(() =>
        Promise.resolve(ok({ kind: 'refused' as const, reason: 'locked' as const })),
      ),
    });
    await show();
    await userEvent.click(
      screen.getByRole('button', { name: 'Keep Bunnings and Bunnings Warehouse apart' }),
    );
    await settle();
    expect(api['contacts.keepBoth']).toHaveBeenCalledWith({
      firstId: 'con_bunnings',
      secondId: 'con_bunningswarehouse',
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Merge Bunnings and Bunnings Warehouse' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Merge' }),
    );
    await settle();
    expect(screen.getByRole('status').textContent).toContain(
      'Bunnings Warehouse has transactions in a locked quarter',
    );
  });

  it('shows nothing when no pairs look the same', async () => {
    installBridge({ 'contacts.pairs': vi.fn(() => Promise.resolve(ok([]))) });
    await show();
    expect(screen.queryByRole('region', { name: 'Contacts that look the same' })).toBeNull();
  });
});

describe('a contact’s page (spec 123)', () => {
  beforeEach(() => {
    window.location.hash = '#/contacts/con_smithrenovations';
  });

  it('shows what they owe, invoiced and paid, and their invoices', async () => {
    const api = installBridge();
    await show();
    expect(api['contacts.get']).toHaveBeenCalledWith({ id: 'con_smithrenovations' });
    expect(screen.getByRole('heading', { level: 1, name: 'Smith Renovations' })).toBeTruthy();
    expect(screen.getByText('Owes you').closest('div')?.textContent).toContain(
      '$1,650.00' + '1 invoice, due 24/11/2026',
    );
    expect(screen.getByText('Invoiced this financial year').closest('div')?.textContent).toContain(
      '$6,600.00',
    );
    expect(bodyRows('Invoices for Smith Renovations')).toEqual([
      expect.stringContaining('INV-1043'),
      expect.stringContaining('INV-1042'),
    ]);
    expect(screen.getByText(/“SMITH RENOVATIONS”, “SMITH RENOV”/)).toBeTruthy();
  });

  it('has payments, bank lines and details tabs', async () => {
    installBridge();
    await show();
    await userEvent.click(screen.getByRole('radio', { name: 'Payments' }));
    expect(bodyRows('Payments from Smith Renovations')).toEqual([
      expect.stringMatching(/15[/]11[/]2026INV-1042\$4,950\.00/),
    ]);
    await userEvent.click(screen.getByRole('radio', { name: 'Bank lines' }));
    expect(screen.getByText('No bank lines for Smith Renovations yet.')).toBeTruthy();
    await userEvent.click(screen.getByRole('radio', { name: 'Details' }));
    expect(screen.getByText('accounts@smith.example.com')).toBeTruthy();
  });

  it('edits the details and shows them again', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    const sheet = screen.getByRole('dialog', { name: 'Edit Smith Renovations' });
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Phone (optional)' }), '02');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await settle();
    expect(api['contacts.edit']).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'con_smithrenovations', phone: '02' }),
    );
    expect(screen.getByRole('status').textContent).toBe('Saved Smith Renovations.');
    expect(api['contacts.get']).toHaveBeenCalledTimes(2);
  });

  it('a supplier without invoices opens on its bank lines', async () => {
    installBridge({
      'contacts.get': vi.fn(() =>
        Promise.resolve(
          ok({
            ...CONTACT_PAGE,
            contact: { ...CONTACT_PAGE.contact, kind: 'supplier' as const },
            invoices: [],
            payments: [],
          }),
        ),
      ),
    });
    await show();
    expect(screen.queryByRole('radio', { name: 'Invoices' })).toBeNull();
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Bank lines' }).checked).toBe(true);
    expect(screen.queryByText('Owes you')).toBeNull();
  });
});

describe('the summary beside a page (spec 123, W08b Option 3)', () => {
  it('a customer’s name on the Invoices page opens their summary', async () => {
    window.location.hash = '#/invoices';
    const api = installBridge();
    await show('invoices');
    await userEvent.click(screen.getByRole('button', { name: 'Smith Renovations' }));
    await settle();
    expect(api['contacts.get']).toHaveBeenCalledWith({ id: 'con_smithrenovations' });
    const panel = screen.getByRole('complementary', { name: 'Smith Renovations' });
    expect(panel.textContent).toContain('Owes you$1,650.00');
    expect(within(panel).getByRole('link', { name: 'Open full page' }).getAttribute('href')).toBe(
      '#/contacts/con_smithrenovations',
    );
  });
});

describe('contact words', () => {
  it('reads the contact from the address, and writes an ABN the ATO way', () => {
    expect(contactIdFromHash('#/contacts/con_ab')).toBe('con_ab');
    expect(contactIdFromHash('#/contacts')).toBeNull();
    expect(contactIdFromHash('#/invoices/con_ab')).toBeNull();
    expect(formatAbn('51824753556')).toBe('51 824 753 556');
  });
});
