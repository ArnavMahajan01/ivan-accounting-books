import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { SampleDataLabel } from './SampleDataLabel';
import { Sheet } from './Sheet';

afterEach(cleanup);

function SheetHarness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Split…
      </Button>
      {open && (
        <Sheet
          title="Split this line"
          onClose={close}
          actions={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button variant="main" onClick={close}>
                Split
              </Button>
            </>
          }
        >
          <label>
            Amount <input />
          </label>
        </Sheet>
      )}
    </>
  );
}

describe('Sheet', () => {
  it('moves focus inside when it opens, and keeps Tab and Shift+Tab inside', async () => {
    const user = userEvent.setup();
    render(<SheetHarness />);
    await user.click(screen.getByRole('button', { name: 'Split…' }));
    const dialog = screen.getByRole('dialog', { name: 'Split this line' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(document.activeElement).toBe(input);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Split' }));
    await user.tab();
    expect(document.activeElement).toBe(input);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Split' }));
  });

  it('closes on Escape and gives focus back to the button that opened it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Split…' });
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe('ConfirmDialog', () => {
  it('says what will change, names the action in words, and focuses Cancel first', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Stop sharing with your accountant?"
        change="They will no longer be able to open the 2026-27 Profit and loss sheet."
        confirmLabel="Stop sharing"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const dialog = screen.getByRole('alertdialog', { name: 'Stop sharing with your accountant?' });
    expect(dialog.getAttribute('aria-describedby')).not.toBeNull();
    expect(screen.getByText(/no longer be able to open/)).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Stop sharing' }).className).toContain(
      'button--destructive',
    );
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Stop sharing' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState, ErrorMessage and SampleDataLabel', () => {
  it('shows an empty state with its sentence and next action', () => {
    render(
      <EmptyState
        icon={Inbox}
        message="No bank lines yet. Import a file from Westpac Online Banking."
        action={<Button variant="main">Import file</Button>}
      />,
    );
    expect(
      screen.getByText('No bank lines yet. Import a file from Westpac Online Banking.'),
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Import file' })).not.toBeNull();
  });

  it('shows an error in plain words as an alert, with a retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorMessage
        message="The books could not be read. Try again, or restart the app."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('The books could not be read.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('labels sample data in words', () => {
    render(<SampleDataLabel />);
    expect(screen.getByText('Sample data').getAttribute('title')).toContain('invented');
  });
});
