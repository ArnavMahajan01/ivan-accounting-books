import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { plainRequest } from '@shared/reports';
import { BooksStateProvider } from '../books-state';
import { installBridge, settle } from '../test-bridge';
import { reportHref, reportsRouteFromHash } from './report-routes';
import { ReportsPage } from './ReportsPage';

afterEach(cleanup);
beforeEach(() => {
  installBridge();
});

async function at(hash: string) {
  window.location.hash = hash;
  render(
    <BooksStateProvider>
      <ReportsPage />
    </BooksStateProvider>,
  );
  await settle();
}

describe('the Reports list', () => {
  it('lists My reports above the standard ones, and Close the last quarter', async () => {
    await at('#/reports');
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['My reports', 'Reports']);
    expect(screen.getByRole('link', { name: 'Quarterly P&L for accountant' })).not.toBeNull();
    for (const name of ['Profit and loss', 'Balance sheet', 'Trial balance', 'BAS worksheet']) {
      expect(screen.getByRole('link', { name })).not.toBeNull();
    }
    expect(screen.getByRole('button', { name: 'Close the last quarter' })).not.toBeNull();
  });

  it('deletes a saved report only after asking', async () => {
    const api = installBridge();
    await at('#/reports');
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete Quarterly P&L for accountant' }),
    );
    expect(screen.getByRole('alertdialog').textContent).toContain('The books do not change');
    await userEvent.click(screen.getByRole('button', { name: 'Delete report' }));
    expect(vi.mocked(api['reports.removeLayout']).mock.calls[0]?.[0]).toEqual({ id: 'lay_acct' });
  });
});

describe('a report (specs 090, 093)', () => {
  it('shows the figures, and a figure opens its lines with the same total', async () => {
    await at(reportHref(plainRequest('profit-and-loss')));
    expect(screen.getByRole('heading', { level: 1, name: 'Profit and loss' })).not.toBeNull();
    const table = screen.getByRole('table', { name: 'Profit and loss' });
    expect(within(table).getByText('Net profit').closest('tr')?.textContent).toContain(
      '$28,637.60',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /\$9,812\.40, Materials and supplies/ }),
    );
    await settle();
    const sheet = screen.getByRole('dialog');
    expect(sheet.textContent).toContain('Total, before GST');
    expect(sheet.textContent).toContain('$9,812.40');
    expect(within(sheet).getByRole('button', { name: 'Open in Transactions' })).not.toBeNull();
  });

  it('Publish to Google Sheets waits for a later version, and says so', async () => {
    await at(reportHref(plainRequest('profit-and-loss')));
    const publish = screen.getByRole('button', { name: 'Publish to Google Sheets' });
    expect(publish).toHaveProperty('disabled', true);
    expect(publish.getAttribute('title')).toBe('Comes with Google Sheets, in a later version.');
  });

  it('exports, and asks for the report again when a column is ticked', async () => {
    const api = installBridge();
    await at(reportHref(plainRequest('profit-and-loss')));
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    await settle();
    expect(vi.mocked(api['reports.export']).mock.calls[0]?.[0]).toMatchObject({ format: 'csv' });
    expect(screen.getByRole('status').textContent).toBe('Saved.');
    await userEvent.click(screen.getByRole('button', { name: 'Customise' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Last period' }));
    await settle();
    expect(vi.mocked(api['reports.get']).mock.calls.at(-1)?.[0].request.columns.lastPeriod).toBe(
      true,
    );
  });

  it('saves it as my report with a name', async () => {
    const api = installBridge();
    await at(reportHref(plainRequest('profit-and-loss')));
    await userEvent.click(screen.getByRole('button', { name: 'Save as my report' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Name' }),
      'Quarterly P&L for accountant',
    );
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    await settle();
    expect(vi.mocked(api['reports.saveLayout']).mock.calls[0]?.[0]).toMatchObject({
      id: null,
      name: 'Quarterly P&L for accountant',
    });
  });
});

describe('closing a quarter (spec 097)', () => {
  it('lists each step, and Lock needs "The BAS for this quarter is done" ticked', async () => {
    const api = installBridge();
    await at('#/reports/close');
    expect(screen.getByRole('heading', { level: 1, name: 'Close Jul–Sep 2026' })).not.toBeNull();
    expect(screen.getByText(/Business Cash Reserve ··7730: not reconciled yet/)).not.toBeNull();
    expect(
      screen.getByText('The app does not lodge anything with the ATO.', { exact: false }),
    ).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Lock Jul–Sep 2026…' }));
    const ask = screen.getByRole('alertdialog');
    const lock = within(ask).getByRole('button', { name: 'Lock Jul–Sep 2026' });
    expect(lock).toHaveProperty('disabled', true);
    await userEvent.click(
      within(ask).getByRole('checkbox', { name: 'The BAS for this quarter is done' }),
    );
    await userEvent.click(lock);
    await settle();
    expect(vi.mocked(api['reports.lock']).mock.calls[0]?.[0]).toEqual({ endDate: '2026-09-30' });
  });
});

describe('report addresses', () => {
  it('carry the request, and fall back to the plain one', () => {
    const request = {
      ...plainRequest('profit-and-loss'),
      rows: { showEmpty: true, groupSmall: false, showCodes: true },
    };
    expect(reportsRouteFromHash(reportHref(request))).toEqual({ kind: 'report', request });
    expect(reportsRouteFromHash('#/reports/bas?r=nonsense')).toEqual({
      kind: 'report',
      request: plainRequest('bas'),
    });
    expect(reportsRouteFromHash('#/reports/layout/lay_1')).toEqual({ kind: 'layout', id: 'lay_1' });
    expect(reportsRouteFromHash('#/reports/nowhere')).toEqual({ kind: 'list' });
  });
});
