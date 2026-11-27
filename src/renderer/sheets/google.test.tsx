import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@shared/result';
import { installBridge, settle } from '../test-bridge';
import { GoogleBanner } from './GoogleBanner';
import { GoogleCard } from './GoogleCard';
import { GoogleStateProvider } from './google-state';

afterEach(cleanup);

async function show(node: React.ReactNode) {
  render(<GoogleStateProvider>{node}</GoogleStateProvider>);
  await settle();
}

describe('the Google card in Settings (spec 107)', () => {
  it('connects, then says who it is connected as', async () => {
    const api = installBridge();
    await show(<GoogleCard />);
    expect(screen.getByText('Not connected')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Connect Google' }));
    await settle();
    expect(api['google.connect']).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('google-status').textContent).toBe('Connected as owner@example.com');
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy();
  });

  it('says plainly when he did not finish signing in', async () => {
    installBridge({
      'google.connect': vi.fn(() =>
        Promise.resolve(ok({ kind: 'failed' as const, reason: 'cancelled' as const })),
      ),
    });
    await show(<GoogleCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Connect Google' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toContain('Signing in was not finished');
  });

  it('asks before disconnecting, and says what stays as it is (spec 108)', async () => {
    const api = installBridge({
      'google.getStatus': vi.fn(() =>
        Promise.resolve(ok({ kind: 'connected' as const, email: 'owner@example.com' })),
      ),
    });
    await show(<GoogleCard />);
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(screen.getByRole('alertdialog').textContent).toContain(
      'Your published sheets stay in your Google Drive',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api['google.disconnect']).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    const dialog = screen.getByRole('alertdialog');
    await userEvent.click(
      [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Disconnect') ?? dialog,
    );
    await settle();
    expect(api['google.disconnect']).toHaveBeenCalledTimes(1);
  });
});

describe('the banner (spec 108)', () => {
  it('appears only when Google needs him to sign in again, and links to Settings', async () => {
    installBridge({
      'google.getStatus': vi.fn(() =>
        Promise.resolve(ok({ kind: 'needs-sign-in' as const, email: 'owner@example.com' })),
      ),
    });
    await show(<GoogleBanner />);
    expect(screen.getByRole('status').textContent).toContain('Google needs you to sign in again');
    expect(
      screen.getByRole('link', { name: 'Sign in again in Settings' }).getAttribute('href'),
    ).toBe('#/settings');
  });

  it('is not there while connected', async () => {
    installBridge({
      'google.getStatus': vi.fn(() =>
        Promise.resolve(ok({ kind: 'connected' as const, email: null })),
      ),
    });
    await show(<GoogleBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
