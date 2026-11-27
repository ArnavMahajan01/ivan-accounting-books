// A read-only spreadsheet grid (spec 112): column letters, row numbers and the tabs along the
// bottom, drawn by the app from exactly what the publish will send. Figures on the right.

import { useState } from 'react';
import type { PublishPreview } from '@shared/sheets';

function columnLetters(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function SheetGrid({
  tabs,
  kept,
}: {
  readonly tabs: PublishPreview['tabs'];
  /** His own tabs, shown after the app's, greyed: the app leaves them alone. */
  readonly kept: readonly string[];
}) {
  const [shown, setShown] = useState(0);
  const tab = tabs[shown] ?? tabs[0];
  if (tab === undefined) return null;
  return (
    <div className="sheet-grid">
      <div
        className="sheet-grid__scroll"
        tabIndex={0}
        aria-label={`Preview of the ${tab.title} tab`}
      >
        <table className="sheet-grid__table">
          <thead>
            <tr>
              <th scope="col" className="sheet-grid__corner">
                <span className="visually-hidden">Row</span>
              </th>
              {Array.from({ length: tab.columns }, (_, c) => (
                <th key={c} scope="col" className="sheet-grid__letter">
                  {columnLetters(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tab.rows.map((row, r) => (
              <tr key={r}>
                <th scope="row" className="sheet-grid__number">
                  {r + 1}
                </th>
                {/* A heading with nothing beside it runs on across the empty cells, as in Sheets. */}
                {row.length > 1 && row.slice(1).every((c) => c.text === '') ? (
                  <td colSpan={tab.columns} className="sheet-grid__cell sheet-grid__cell--spill">
                    <span className="sheet-grid__spill">{row[0]?.text}</span>
                  </td>
                ) : (
                  row.map((cell, c) => (
                    <td
                      key={c}
                      className={
                        cell.figure
                          ? 'sheet-grid__cell sheet-grid__cell--figure'
                          : 'sheet-grid__cell'
                      }
                    >
                      {cell.text}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sheet-grid__tabs" role="tablist" aria-label="Tabs">
        {tabs.map((t, i) => (
          <button
            key={t.title}
            type="button"
            role="tab"
            aria-selected={i === shown}
            className="sheet-grid__tab"
            onClick={() => {
              setShown(i);
            }}
          >
            {t.title}
          </button>
        ))}
        {kept.map((title) => (
          <span
            key={title}
            className="sheet-grid__tab sheet-grid__tab--kept"
            title="Your own tab: left as it is"
          >
            {title}
          </span>
        ))}
      </div>
    </div>
  );
}
