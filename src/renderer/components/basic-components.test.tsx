import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Download } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import { Amount } from './Amount';
import { Badge, BADGE_STATUSES, RoleBadge, type BadgeStatus } from './Badge';
import { Button } from './Button';
import { DateCell } from './DateCell';

afterEach(cleanup);

describe('Button', () => {
  it.each(['default', 'main', 'destructive'] as const)(
    'renders the %s variant as a real button',
    (variant) => {
      render(<Button variant={variant}>Import file</Button>);
      const button = screen.getByRole('button', { name: 'Import file' });
      expect(button.className).toContain(`button--${variant}`);
      expect(button.getAttribute('type')).toBe('button');
    },
  );

  it('has a small size, and an icon that is hidden from screen readers', () => {
    const { container } = render(
      <Button size="small" icon={Download}>
        Export
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Export' }).className).toContain('button--small');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('runs its action on click and by keyboard, and not when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Post</Button>);
    await user.click(screen.getByRole('button', { name: 'Post' }));
    screen.getByRole('button', { name: 'Post' }).focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
    rerender(
      <Button onClick={onClick} disabled>
        Post
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Post' }));
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});

describe('Badge', () => {
  it.each(Object.keys(BADGE_STATUSES) as BadgeStatus[])(
    'shows the %s status in words',
    (status) => {
      render(<Badge status={status} />);
      expect(screen.getByText(BADGE_STATUSES[status].label).className).toContain(
        `badge--${BADGE_STATUSES[status].tone}`,
      );
    },
  );

  it('adds a lock icon to Locked', () => {
    const { container } = render(<Badge status="locked" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('shows a share role in words', () => {
    render(<RoleBadge role="commenter" />);
    expect(screen.getByText('Commenter').className).toContain('badge--brand');
  });
});

describe('Amount', () => {
  it('shows -$1,234.50 for -123450 cents, with a minus sign', () => {
    render(<Amount cents={asCents(-123450)} />);
    expect(screen.getByText('-$1,234.50').className).toBe('amount');
  });

  it('shows positive amounts and zero', () => {
    render(
      <>
        <Amount cents={asCents(4364235)} />
        <Amount cents={asCents(0)} />
      </>,
    );
    expect(screen.getByText('$43,642.35')).not.toBeNull();
    expect(screen.getByText('$0.00')).not.toBeNull();
  });
});

describe('DateCell', () => {
  it('shows 21/11/2026, with the ISO date for assistive technology', () => {
    const date = parseCalendarDate('2026-11-21', 'YYYY-MM-DD');
    if (!date.ok) throw new Error('bad date');
    render(<DateCell date={date.value} />);
    expect(screen.getByText('21/11/2026').getAttribute('datetime')).toBe('2026-11-21');
  });
});
