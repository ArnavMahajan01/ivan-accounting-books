import { ArrowDown, ArrowUp } from 'lucide-react';
import { Fragment, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import './Table.css';

export type SortDirection = 'ascending' | 'descending';

export interface TableColumn<Row> {
  readonly key: string;
  readonly header: string;
  /** `end` for amounts, so figures line up on the right. */
  readonly align?: 'start' | 'end';
  readonly cell: (row: Row) => ReactNode;
  /** Present when the column can be sorted. */
  readonly sortValue?: (row: Row) => string | number;
}

export interface TableProps<Row> {
  /** The table's accessible name, such as "Bank lines". */
  readonly label: string;
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  /** A short name for a row, used in the selection checkbox's label. */
  readonly rowLabel?: (row: Row) => string;
  /** Shows checkboxes when given. The parent owns the selected keys. */
  readonly selection?: {
    readonly selected: ReadonlySet<string>;
    readonly onChange: (next: ReadonlySet<string>) => void;
  };
  /** The row's main action, run by Enter or a double click. */
  readonly onRowAction?: (row: Row) => void;
  /** Run when a row is clicked, anywhere but on a button, link or field inside it. */
  readonly onRowClick?: (row: Row) => void;
  readonly initialSort?: { readonly key: string; readonly direction: SortDirection };
  /** The key of the row whose details are open beside the table, drawn with a mark. */
  readonly activeRowKey?: string | null;
  /** Shows skeleton rows shaped like the table instead of the rows. */
  readonly loading?: boolean;
  readonly skeletonRows?: number;
  /**
   * Puts a heading row above each run of rows with the same group name, such as the account types
   * of the chart. The rows should already be in group order, so a table with this has no sorting.
   */
  readonly groupBy?: (row: Row) => string;
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'en-AU', { numeric: true });
}

export function Table<Row>({
  label,
  columns,
  rows,
  rowKey,
  rowLabel,
  selection,
  onRowAction,
  onRowClick,
  initialSort,
  activeRowKey = null,
  loading = false,
  skeletonRows = 8,
  groupBy,
}: TableProps<Row>) {
  const [sort, setSort] = useState(initialSort);
  const [focusIndex, setFocusIndex] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key);
    if (sort === undefined || column?.sortValue === undefined) return rows;
    const value = column.sortValue;
    const factor = sort.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => factor * compare(value(a), value(b)));
  }, [rows, columns, sort]);

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key && current.direction === 'ascending'
        ? { key, direction: 'descending' }
        : { key, direction: 'ascending' },
    );
  };

  const toggleRow = (key: string) => {
    if (selection === undefined) return;
    const next = new Set(selection.selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };

  const allKeys = sorted.map(rowKey);
  const allSelected =
    selection !== undefined &&
    allKeys.length > 0 &&
    allKeys.every((k) => selection.selected.has(k));
  const someSelected = selection !== undefined && allKeys.some((k) => selection.selected.has(k));

  const moveFocus = (index: number) => {
    const clamped = Math.max(0, Math.min(sorted.length - 1, index));
    setFocusIndex(clamped);
    rowRefs.current[clamped]?.focus();
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, index: number, row: Row) => {
    if (event.target !== event.currentTarget) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(sorted.length - 1);
        break;
      case ' ':
        if (selection !== undefined) {
          event.preventDefault();
          toggleRow(rowKey(row));
        }
        break;
      case 'Enter':
        if (onRowAction !== undefined) {
          event.preventDefault();
          onRowAction(row);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="table-scroll">
      <table
        className="table"
        role="grid"
        aria-label={label}
        aria-busy={loading}
        aria-rowcount={loading ? -1 : sorted.length + 1}
      >
        <thead>
          <tr>
            {selection !== undefined && (
              <th scope="col" className="table__select">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  ref={(el) => {
                    if (el !== null) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={() => {
                    selection.onChange(allSelected ? new Set() : new Set(allKeys));
                  }}
                  disabled={loading}
                />
              </th>
            )}
            {columns.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.align === 'end' ? 'table__cell--end' : undefined}
                  aria-sort={
                    active ? sort.direction : column.sortValue !== undefined ? 'none' : undefined
                  }
                >
                  {column.sortValue === undefined ? (
                    column.header
                  ) : (
                    <button
                      type="button"
                      className="table__sort"
                      onClick={() => {
                        toggleSort(column.key);
                      }}
                    >
                      {column.header}
                      {active &&
                        (sort.direction === 'ascending' ? (
                          <ArrowUp aria-hidden="true" className="table__sort-icon" />
                        ) : (
                          <ArrowDown aria-hidden="true" className="table__sort-icon" />
                        ))}
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i} className="table__skeleton-row" aria-hidden="true">
                  {selection !== undefined && <td className="table__select" />}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.align === 'end' ? 'table__cell--end' : undefined}
                    >
                      <span className="table__skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            : sorted.map((row, index) => {
                const key = rowKey(row);
                const isSelected = selection?.selected.has(key) ?? false;
                const group = groupBy?.(row);
                const startsGroup =
                  group !== undefined &&
                  (index === 0 || group !== groupBy?.(sorted[index - 1] as Row));
                return (
                  <Fragment key={key}>
                    {startsGroup && (
                      <tr className="table__group">
                        <th
                          scope="rowgroup"
                          colSpan={columns.length + (selection === undefined ? 0 : 1)}
                        >
                          {group}
                        </th>
                      </tr>
                    )}
                    <tr
                      ref={(el) => {
                        rowRefs.current[index] = el;
                      }}
                      tabIndex={index === Math.min(focusIndex, sorted.length - 1) ? 0 : -1}
                      aria-selected={selection === undefined ? undefined : isSelected}
                      aria-current={key === activeRowKey ? 'true' : undefined}
                      className={
                        isSelected
                          ? 'table__row table__row--selected'
                          : key === activeRowKey
                            ? 'table__row table__row--active'
                            : 'table__row'
                      }
                      onFocus={() => {
                        setFocusIndex(index);
                      }}
                      onKeyDown={(event) => {
                        onRowKeyDown(event, index, row);
                      }}
                      onClick={
                        onRowClick === undefined
                          ? undefined
                          : (event) => {
                              const target = event.target as HTMLElement;
                              if (target.closest('a, button, input, select, textarea') === null) {
                                onRowClick(row);
                              }
                            }
                      }
                      onDoubleClick={
                        onRowAction === undefined
                          ? undefined
                          : () => {
                              onRowAction(row);
                            }
                      }
                    >
                      {selection !== undefined && (
                        <td className="table__select">
                          <input
                            type="checkbox"
                            tabIndex={-1}
                            aria-label={`Select ${rowLabel?.(row) ?? 'row'}`}
                            checked={isSelected}
                            onChange={() => {
                              toggleRow(key);
                            }}
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={column.align === 'end' ? 'table__cell--end' : undefined}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
