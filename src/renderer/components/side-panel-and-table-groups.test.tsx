import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidePanel } from './SidePanel';
import { Table, type TableColumn } from './Table';

afterEach(cleanup);

interface Item {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
}
const columns: readonly TableColumn<Item>[] = [
  { key: 'name', header: 'Name', cell: (item) => item.name },
];
const items: Item[] = [
  { id: '1', kind: 'Assets', name: 'Bank' },
  { id: '2', kind: 'Assets', name: 'Savings' },
  { id: '3', kind: 'Income', name: 'Sales' },
];

describe('Table groups', () => {
  it('puts a heading row above each run of rows with the same group, and not above every row', () => {
    render(
      <Table
        label="Chart"
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        groupBy={(i) => i.kind}
      />,
    );
    const headings = [...document.querySelectorAll('.table__group th')];
    expect(headings.map((h) => h.textContent)).toEqual(['Assets', 'Income']);
    expect(headings[0]?.getAttribute('colspan')).toBe('1');
    const names = screen.getAllByRole('row').map((r) => r.textContent);
    expect(names).toEqual(['Name', 'Assets', 'Bank', 'Savings', 'Income', 'Sales']);
  });

  it('still moves between rows with the arrow keys, skipping the headings', async () => {
    const user = userEvent.setup();
    render(
      <Table
        label="Chart"
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        groupBy={(i) => i.kind}
      />,
    );
    const bank = screen.getByText('Bank').closest('tr') as HTMLElement;
    bank.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByText('Sales').closest('tr'));
  });

  it('counts the selection column in a heading’s width', () => {
    render(
      <Table
        label="Chart"
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        groupBy={(i) => i.kind}
        selection={{ selected: new Set(), onChange: () => undefined }}
      />,
    );
    expect(document.querySelector('.table__group th')?.getAttribute('colspan')).toBe('2');
  });
});

describe('Table row click and the open row', () => {
  it('runs the click action on a row, but not on a link or button inside it', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const withLink: readonly TableColumn<Item>[] = [
      ...columns,
      {
        key: 'link',
        header: 'Link',
        cell: (item) => <a href={`#/x/${item.id}`}>Open {item.id}</a>,
      },
    ];
    render(
      <Table
        label="Chart"
        columns={withLink}
        rows={items}
        rowKey={(i) => i.id}
        onRowClick={onRowClick}
      />,
    );
    await user.click(screen.getByText('Savings'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(items[1]);
    await user.click(screen.getByRole('link', { name: 'Open 3' }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it('marks the open row for assistive technology, and nothing else', () => {
    render(
      <Table label="Chart" columns={columns} rows={items} rowKey={(i) => i.id} activeRowKey="2" />,
    );
    const marked = screen
      .getAllByRole('row')
      .filter((r) => r.getAttribute('aria-current') === 'true');
    expect(marked.map((r) => r.textContent)).toEqual(['Savings']);
  });
});

describe('SidePanel', () => {
  it('is a region with its title as its name, and does not cover or trap the page', () => {
    render(
      <>
        <button type="button">Outside</button>
        <SidePanel title="Bunnings" onClose={() => undefined}>
          <p>Body</p>
        </SidePanel>
      </>,
    );
    const panel = screen.getByRole('complementary', { name: 'Bunnings' });
    expect(within(panel).getByText('Body')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Outside' })).not.toBeNull();
    expect(panel.getAttribute('aria-modal')).toBeNull();
  });

  it('puts focus on its heading when it opens, and gives it back to the opener when it closes', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useStateForTest(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Open it
          </button>
          {open && (
            <SidePanel
              title="Details"
              onClose={() => {
                setOpen(false);
              }}
            >
              <p>Body</p>
            </SidePanel>
          )}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open it' });
    await user.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Details' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes with Escape pressed anywhere inside it, and with its Close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SidePanel title="Details" onClose={onClose}>
        <button type="button">Inside</button>
      </SidePanel>,
    );
    await user.click(screen.getByRole('button', { name: 'Inside' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

import { useState as useStateForTest } from 'react';
