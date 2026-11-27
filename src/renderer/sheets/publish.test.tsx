import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { plainRequest } from '@shared/reports';
import { ok } from '@shared/result';
import { installBridge, PREVIEW, settle } from '../test-bridge';
import { GoogleStateProvider } from './google-state';
import { PublishSheet } from './PublishSheet';

afterEach(cleanup);

const connected = vi.fn(() =>
  Promise.resolve(ok({ kind: 'connected' as const, email: 'owner@example.com' })),
);
const request = { kind: 'report' as const, request: plainRequest('profit-and-loss') };

async function show(onClose = vi.fn()) {
  render(
    <GoogleStateProvider>
      <PublishSheet request={request} onClose={onClose} />
    </GoogleStateProvider>,
  );
  await settle();
}

describe('publishing (specs 110, 112)', () => {
  it('shows a sheet-style preview, with column letters, row numbers and the tabs', async () => {
    installBridge({ 'google.getStatus': connected });
    await show();
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Goes to: a new workbook');
    const grid = within(dialog).getByRole('table');
    expect(
      within(grid)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Row', 'A', 'B']);
    expect(within(grid).getByText('47,881.45').className).toContain('figure');
    expect(
      within(dialog)
        .getAllByRole('tab')
        .map((t) => t.textContent),
    ).toEqual(['Profit and loss', 'Ready formulas']);
    expect(dialog.textContent).toContain('Nothing is sent until you click Publish');
  });

  it('publishes, then says where it went and opens it in the browser', async () => {
    const api = installBridge({ 'google.getStatus': connected });
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await settle();
    expect(api['sheets.publish']).toHaveBeenCalledWith({
      request: { kind: 'report', request: plainRequest('profit-and-loss') },
      asNew: false,
    });
    expect(screen.getByRole('status').textContent).toContain('Published to a new workbook');
    await userEvent.click(screen.getByRole('button', { name: 'Open in Google Sheets' }));
    expect(api['sheets.open']).toHaveBeenCalledWith({ linkId: 'shl_pl' });
    // Side by side (spec 119): opens it again in the browser and says how the Mac tiles windows.
    await userEvent.click(screen.getByRole('button', { name: 'Open side by side' }));
    expect(api['sheets.open']).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog').textContent).toContain(
      'choose Move & Resize, then Left & Right',
    );
  });

  it('cannot publish while Google is not connected, and says where to connect', async () => {
    installBridge();
    await show();
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy();
  });

  it('says what changed when it updates the workbook in place (spec 111)', async () => {
    installBridge({
      'google.getStatus': connected,
      'sheets.preview': vi.fn(() =>
        Promise.resolve(
          ok({
            kind: 'preview' as const,
            preview: {
              ...PREVIEW,
              target: 'update' as const,
              linkId: 'shl_pl',
              kept: ['My workings'],
            },
          }),
        ),
      ),
      'sheets.publish': vi.fn(() =>
        Promise.resolve(
          ok({
            kind: 'published' as const,
            linkId: 'shl_pl',
            title: PREVIEW.title,
            isNew: false,
            kept: ['My workings'],
            changes: { added: 1, changed: 2, removed: 0 },
          }),
        ),
      ),
    });
    await show();
    expect(screen.getByRole('dialog').textContent).toContain('Kept as they are: My workings.');
    await userEvent.click(screen.getByRole('button', { name: 'Publish again' }));
    await settle();
    expect(screen.getByRole('status').textContent).toBe(
      'Updated in place. 2 rows changed, 1 row added since last time. Your own tabs were left as they were: My workings.',
    );
  });

  it('offers "Publish as new" when the workbook was deleted in Drive', async () => {
    const api = installBridge({
      'google.getStatus': connected,
      'sheets.publish': vi.fn(() =>
        Promise.resolve(ok({ kind: 'missing' as const, linkId: 'shl_pl', title: PREVIEW.title })),
      ),
    });
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await settle();
    expect(screen.getByRole('status').textContent).toContain('no longer in your Google Drive');
    await userEvent.click(screen.getByRole('button', { name: 'Publish as new' }));
    expect(api['sheets.publish']).toHaveBeenLastCalledWith(
      expect.objectContaining({ asNew: true }),
    );
  });
});
