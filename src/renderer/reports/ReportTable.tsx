// A report's figures (specs 090 to 095): headings, accounts and totals, with every account figure
// a button that opens the lines behind it (spec 093). His notes columns are typed into here.

import { formatCents } from '@shared/money';
import type { Drill, ReportRequest, ReportView } from '@shared/reports';
import { percentText } from '@shared/percent';

export function ReportTable({
  view,
  request,
  onDrill,
  onNote,
}: {
  readonly view: ReportView;
  readonly request: ReportRequest;
  readonly onDrill: (drill: Drill, label: string) => void;
  /** A note typed into one of his notes columns: which column, which row, what. */
  readonly onNote?: (column: number, rowKey: string, text: string) => void;
}) {
  const ownStart = view.columns.length - request.ownColumns.length;
  return (
    <div className="report__scroll">
      <table className="report" aria-label={view.title}>
        <thead>
          <tr>
            <th scope="col">{view.rowHeading}</th>
            {view.columns.map((c) => (
              <th key={c.key} scope="col" className="report__n">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={row.key} className={`report__row report__row--${row.kind}`}>
              <th scope="row">
                {row.code !== null && <span className="report__code">{row.code} </span>}
                {row.label}
              </th>
              {row.cells.map((cell, i) => {
                const column = view.columns[i];
                const own = i >= ownStart ? request.ownColumns[i - ownStart] : undefined;
                if (own?.kind === 'notes' && row.kind === 'account' && onNote !== undefined) {
                  return (
                    <td key={column?.key ?? i}>
                      <input
                        className="review-field report__note"
                        aria-label={`${own.name} for ${row.label}`}
                        value={own.notes[row.key] ?? ''}
                        onChange={(e) => {
                          onNote(i - ownStart, row.key, e.target.value);
                        }}
                      />
                    </td>
                  );
                }
                switch (cell.kind) {
                  case 'money':
                    return (
                      <td key={column?.key ?? i} className="report__n">
                        {cell.drill === null ? (
                          <span className="amount">{formatCents(cell.cents)}</span>
                        ) : (
                          <button
                            type="button"
                            className="report__figure amount"
                            aria-label={`${formatCents(cell.cents)}, ${row.label}, ${column?.label ?? ''}: see the lines`}
                            onClick={() => {
                              if (cell.drill !== null) onDrill(cell.drill, row.label);
                            }}
                          >
                            {formatCents(cell.cents)}
                          </button>
                        )}
                      </td>
                    );
                  case 'percent':
                    return (
                      <td key={column?.key ?? i} className="report__n">
                        {percentText(cell.bp)}
                      </td>
                    );
                  case 'text':
                    return <td key={column?.key ?? i}>{cell.text}</td>;
                  case 'flag':
                    return <td key={column?.key ?? i}>{cell.on ? 'Over' : ''}</td>;
                  case 'empty':
                    return <td key={column?.key ?? i} />;
                }
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
