import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guideSchema } from '@shared/guide';
import { GUIDES, parseGuides } from '../guides/load-guides';
import { HelpPage } from './HelpPage';

afterEach(cleanup);
beforeEach(() => {
  window.location.hash = '#/help';
});

const go = (hash: string) => {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

describe('the real guides in the app', () => {
  it('include Getting started, with every guide valid', () => {
    expect(GUIDES.map((g) => g.id)).toContain('getting-started');
  });

  it('are ordered by group, then title, and invalid ones are left out', () => {
    const a = {
      id: 'b-guide',
      title: 'B',
      group: 'Getting started',
      summary: 's',
      sections: [{ heading: 'h', paragraphs: ['p'] }],
    };
    const parsed = parseGuides([{ ...a, id: 'z', title: 'Z' }, { nonsense: true }, a]);
    expect(parsed.map((g) => g.title)).toEqual(['B', 'Z']);
  });
});

describe('Help, the list', () => {
  it('has Help as the page heading, a search box, and the guides grouped by feature', () => {
    render(<HelpPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).not.toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Search guides' })).not.toBeNull();
    const group = screen.getByRole('heading', { level: 2, name: 'Getting started' });
    expect(group).not.toBeNull();
    const link = screen.getByRole('link', { name: /Getting started/ });
    expect(link.getAttribute('href')).toBe('#/help/getting-started');
  });

  it('finds Getting started by a word that is only in its steps', async () => {
    const user = userEvent.setup();
    render(<HelpPage />);
    await user.type(screen.getByRole('searchbox', { name: 'Search guides' }), 'integrity');
    expect(screen.getByRole('link', { name: /Getting started/ })).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('1 guide matches');
  });

  it('says so when nothing matches, and Clear search brings the guides back', async () => {
    const user = userEvent.setup();
    render(<HelpPage />);
    await user.type(screen.getByRole('searchbox', { name: 'Search guides' }), 'zebra');
    expect(screen.getByText(/No guide mentions "zebra"/)).not.toBeNull();
    expect(screen.queryByRole('link', { name: /Getting started/ })).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('0 guides match');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('link', { name: /Getting started/ })).not.toBeNull();
  });

  it('shows an empty state when there are no guides', () => {
    render(<HelpPage guides={[]} />);
    expect(screen.getByText('There are no guides yet.')).not.toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});

describe('Help, reading a guide', () => {
  it('opens a guide on a reading page with its title, sections and numbered steps', () => {
    go('#/help/getting-started');
    render(<HelpPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Getting started' })).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'What this app is' })).not.toBeNull();
    const steps = screen.getAllByRole('list').filter((l) => l.tagName === 'OL')[0];
    expect(steps && within(steps).getAllByRole('listitem').length).toBeGreaterThan(1);
  });

  it('goes back to the list with the back button', async () => {
    go('#/help/getting-started');
    const user = userEvent.setup();
    render(<HelpPage />);
    await user.click(screen.getByRole('button', { name: 'All guides' }));
    expect(window.location.hash).toBe('#/help');
  });

  it('says clearly when the guide does not exist, and offers the way back', () => {
    go('#/help/no-such-guide');
    render(<HelpPage />);
    expect(screen.getByText(/That guide does not exist/)).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'All guides' }).length).toBeGreaterThan(0);
  });

  it('shows text as text, never as HTML', () => {
    const guide = guideSchema.parse({
      id: 'plain',
      title: 'Plain',
      group: 'Getting started',
      summary: 'Shows plain text.',
      sections: [{ heading: 'A < B', paragraphs: ['Use * and # and &amp; as they are.'] }],
    });
    go('#/help/plain');
    render(<HelpPage guides={[guide]} />);
    expect(screen.getByText('Use * and # and &amp; as they are.')).not.toBeNull();
    expect(document.querySelector('strong, em, b, i')).toBeNull();
  });

  it('wraps a very long word instead of spilling out of the page', () => {
    const long = 'x'.repeat(300);
    const guide = guideSchema.parse({
      id: 'long',
      title: 'Long',
      group: 'Getting started',
      summary: 'Long text.',
      sections: [{ heading: 'h', paragraphs: [long] }],
    });
    go('#/help/long');
    render(<HelpPage guides={[guide]} />);
    expect(screen.getByText(long).className).toContain('help-reader__text');
  });

  it('moves focus to the guide when it opens', async () => {
    const user = userEvent.setup();
    render(<HelpPage />);
    await user.click(screen.getByRole('link', { name: /Getting started/ }));
    go('#/help/getting-started');
    expect(document.activeElement?.tagName).toBe('ARTICLE');
  });
});
