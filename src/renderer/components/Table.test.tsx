import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Table, type TableColumn } from './Table';

afterEach(cleanup);

interface Line {
  id: string;
  payee: string;
  cents: number;
}

const lines: Line[] = [
  { id: 'a', payee: 'Timber Yard Supplies', cents: -55000 },
  { id: 'b', payee: 'Coastal Hardware', cents: 110000 },
  { id: 'c', payee: 'Bayside Fuel', cents: -8200 },
];

const columns: TableColumn<Line>[] = [
  { key: 'payee', header: 'Payee', cell: (l) => l.payee, sortValue: (l) => l.payee },
  {
    key: 'amount',
    header: 'Amount',
    align: 'end',
    cell: (l) => String(l.cents),
    sortValue: (l) => l.cents,
  },
];

function firstCells(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelectorAll('td')[r.querySelector('input') ? 1 : 0]?.textContent ?? '');
}

function Selectable({ onAction }: { onAction?: (l: Line) => void }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  return (
    <Table
      label="Bank lines"
      columns={columns}
      rows={lines}
      rowKey={(l) => l.id}
      rowLabel={(l) => l.payee}
      selection={{ selected, onChange: setSelected }}
      {...(onAction === undefined ? {} : { onRowAction: onAction })}
    />
  );
}

describe('Table: sorting', () => {
  it('sorts by a column header, then reverses, and says so with aria-sort', async () => {
    const user = userEvent.setup();
    render(<Table label="Bank lines" columns={columns} rows={lines} rowKey={(l) => l.id} />);
    expect(firstCells()).toEqual(['Timber Yard Supplies', 'Coastal Hardware', 'Bayside Fuel']);
    await user.click(screen.getByRole('button', { name: 'Amount' }));
    expect(firstCells()).toEqual(['Timber Yard Supplies', 'Bayside Fuel', 'Coastal Hardware']);
    expect(screen.getByRole('columnheader', { name: 'Amount' }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
    await user.click(screen.getByRole('button', { name: 'Amount' }));
    expect(firstCells()).toEqual(['Coastal Hardware', 'Bayside Fuel', 'Timber Yard Supplies']);
    expect(screen.getByRole('columnheader', { name: 'Amount' }).getAttribute('aria-sort')).toBe(
      'descending',
    );
    expect(screen.getByRole('columnheader', { name: 'Payee' }).getAttribute('aria-sort')).toBe(
      'none',
    );
  });

  it('starts from an initial sort', () => {
    render(
      <Table
        label="Bank lines"
        columns={columns}
        rows={lines}
        rowKey={(l) => l.id}
        initialSort={{ key: 'payee', direction: 'ascending' }}
      />,
    );
    expect(firstCells()).toEqual(['Bayside Fuel', 'Coastal Hardware', 'Timber Yard Supplies']);
  });
});

describe('Table: selection', () => {
  it('selects rows by checkbox, and all or none from the header', async () => {
    const user = userEvent.setup();
    render(<Selectable />);
    await user.click(screen.getByRole('checkbox', { name: 'Select Coastal Hardware' }));
    expect(screen.getAllByRole('row')[2]?.getAttribute('aria-selected')).toBe('true');
    const all = screen.getByRole('checkbox', { name: 'Select all rows' });
    expect((all as HTMLInputElement).indeterminate).toBe(true);
    await user.click(all);
    expect(
      screen
        .getAllByRole('row')
        .slice(1)
        .every((r) => r.getAttribute('aria-selected') === 'true'),
    ).toBe(true);
    await user.click(all);
    expect(
      screen
        .getAllByRole('row')
        .slice(1)
        .some((r) => r.getAttribute('aria-selected') === 'true'),
    ).toBe(false);
  });
});

describe('Table: keyboard', () => {
  it('moves between rows with the arrow keys, Home and End, selects with Space, and acts with Enter', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Selectable onAction={onAction} />);
    const rows = screen.getAllByRole('row').slice(1);
    // Tab reaches the header controls first; clicking a row focuses it.
    await user.click(screen.getByText('Timber Yard Supplies'));
    expect(document.activeElement).toBe(rows[0]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows[1]);
    await user.keyboard(' ');
    expect(rows[1]?.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledWith(lines[1]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(rows[2]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows[2]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(rows[0]);
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(rows[0]);
  });

  it('keeps one row in the tab order', () => {
    render(<Selectable />);
    const tabbable = screen.getAllByRole('row').filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
  });
});

describe('Table: loading', () => {
  it('shows skeleton rows shaped like the table, marked busy', () => {
    render(
      <Table
        label="Bank lines"
        columns={columns}
        rows={[]}
        rowKey={(l) => l.id}
        loading
        skeletonRows={5}
      />,
    );
    expect(screen.getByRole('grid', { name: 'Bank lines' }).getAttribute('aria-busy')).toBe('true');
    const skeletonRows = document.querySelectorAll('.table__skeleton-row');
    expect(skeletonRows).toHaveLength(5);
    expect(skeletonRows[0]?.querySelectorAll('td')).toHaveLength(2);
  });
});
