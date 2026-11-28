import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HelpPage } from '../pages/HelpPage';
import { installBridge, settle } from '../test-bridge';
import { HelpPrefsProvider } from './help-prefs';
import { KeepOnScreenProvider } from './KeepOnScreen';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/help';
});

async function show() {
  render(
    <HelpPrefsProvider>
      <KeepOnScreenProvider>
        <HelpPage />
      </KeepOnScreenProvider>
    </HelpPrefsProvider>,
  );
  await settle();
}

const open = (id: string) => {
  act(() => {
    window.location.hash = `#/help/${id}`;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

describe('Help: stars and tags (spec 134)', () => {
  it('stars a guide from the list, saves it, and Starred shows only those', async () => {
    const api = installBridge();
    await show();
    await userEvent.click(screen.getByRole('button', { name: 'Star Getting started' }));
    expect(api['help.savePrefs']).toHaveBeenLastCalledWith({
      starred: ['getting-started'],
      tags: [],
    });
    await userEvent.click(screen.getByRole('radio', { name: '★ Starred' }));
    const links = screen.getAllByRole('link').map((l) => l.textContent);
    expect(links).toHaveLength(1);
    expect(links[0]).toContain('Getting started');
  });

  it('tags a guide from its page, and filters by the tag', async () => {
    const api = installBridge();
    await show();
    open('close-and-lock-a-quarter');
    await userEvent.click(screen.getByRole('button', { name: 'Tags…' }));
    const sheet = screen.getByRole('dialog');
    await userEvent.type(
      within(sheet).getByRole('textbox', { name: 'New tag' }),
      'Quarter end{Enter}',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(api['help.savePrefs']).toHaveBeenLastCalledWith({
      starred: [],
      tags: [{ name: 'quarter-end', guides: ['close-and-lock-a-quarter'] }],
    });
    expect(screen.getByText('#quarter-end')).toBeTruthy();
    open('');
    await userEvent.click(screen.getByRole('radio', { name: '#quarter-end' }));
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('keeps a guide on screen, with steps to tick, smaller, and closed', async () => {
    installBridge();
    await show();
    open('split-a-bank-line');
    await userEvent.click(screen.getByRole('button', { name: 'Keep on screen' }));
    const panel = screen.getByRole('complementary', {
      name: 'Guide on screen: Split a line across accounts',
    });
    const boxes = within(panel).getAllByRole('checkbox');
    expect(boxes.length).toBe(4);
    await userEvent.click(boxes[0] as HTMLElement);
    expect(panel.textContent).toContain('1 of 4 steps done');
    const bar = within(panel).getByRole('group', { name: 'Move the guide with the arrow keys' });
    bar.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(panel.style.right).toBe('40px');
    await userEvent.click(within(panel).getByRole('button', { name: 'Make smaller' }));
    expect(within(panel).queryAllByRole('checkbox')).toHaveLength(0);
    await userEvent.click(within(panel).getByRole('button', { name: 'Close the guide' }));
    expect(screen.queryByRole('complementary', { name: /Guide on screen/ })).toBeNull();
  });
});
