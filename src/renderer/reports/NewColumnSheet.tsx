// New column (spec 102, wireframe W06a): his own notes, or a calculation picked from a list, with a
// preview before it is added. It never changes the books.

import { useEffect, useMemo, useState } from 'react';
import { parseCents } from '@shared/money';
import type { CalcKind, OwnColumn, ReportRequest, ReportView } from '@shared/reports';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { ReportTable } from './ReportTable';

const CALC_WORDS: Record<CalcKind, string> = {
  difference: 'Difference between two columns',
  'percent-change': '% change between two columns',
  'percent-of-income': '% of income',
  'gst-inside': 'GST inside an amount',
  'flag-over': 'Flag if over an amount',
};
const TWO_COLUMNS: readonly CalcKind[] = ['difference', 'percent-change'];

export function NewColumnSheet({
  request,
  view,
  onCancel,
  onAdd,
}: {
  readonly request: ReportRequest;
  readonly view: ReportView;
  readonly onCancel: () => void;
  readonly onAdd: (column: OwnColumn) => void;
}) {
  // The money columns he can work on: the report's periods, not his own columns.
  const periods = view.columns.filter((c) => /^[pm]\d+$/.test(c.key));
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'notes' | 'calc'>('calc');
  const [calc, setCalc] = useState<CalcKind>('difference');
  const [a, setA] = useState(periods[0]?.key ?? 'p0');
  const [b, setB] = useState(periods[1]?.key ?? periods[0]?.key ?? 'p0');
  const [amountText, setAmountText] = useState('');
  const [preview, setPreview] = useState<ReportView | null>(null);

  const column = useMemo((): OwnColumn | null => {
    const amount = parseCents(amountText.trim().replace(/^\$/, '').replace(/,/g, ''));
    if (name.trim() === '') return null;
    if (kind === 'notes') return { kind: 'notes', name: name.trim(), notes: {} };
    if (calc === 'flag-over' && !amount.ok) return null;
    return {
      kind: 'calc',
      name: name.trim(),
      calc,
      a,
      b: TWO_COLUMNS.includes(calc) ? b : null,
      amount: calc === 'flag-over' && amount.ok ? amount.value : null,
    };
  }, [name, kind, calc, a, b, amountText]);

  useEffect(() => {
    if (column === null) {
      setPreview(null);
      return;
    }
    let current = true;
    const api = bridge();
    void api['reports.get']({
      request: { ...request, ownColumns: [...request.ownColumns, column] },
    }).then((result) => {
      if (current && result.ok && result.value.kind === 'report') setPreview(result.value.view);
    });
    return () => {
      current = false;
    };
  }, [column, request]);

  return (
    <Sheet
      title="New column"
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="main"
            disabled={column === null}
            onClick={() => {
              if (column !== null) onAdd(column);
            }}
          >
            Add column
          </Button>
        </>
      }
    >
      <div className="rule-editor new-column">
        <label className="rule-editor__field">
          <span>Column name</span>
          <input
            className="review-field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
        <fieldset className="rule-editor__group">
          <legend>What goes in it</legend>
          <label className="rule-editor__check">
            <input
              type="radio"
              name="column-kind"
              checked={kind === 'notes'}
              onChange={() => {
                setKind('notes');
              }}
            />
            <span>My own notes: type anything in each row</span>
          </label>
          <label className="rule-editor__check">
            <input
              type="radio"
              name="column-kind"
              checked={kind === 'calc'}
              onChange={() => {
                setKind('calc');
              }}
            />
            <span>A calculation: pick one, no formulas to type</span>
          </label>
        </fieldset>
        {kind === 'calc' && (
          <div className="rule-editor__row">
            <select
              className="review-field"
              aria-label="Calculation"
              value={calc}
              onChange={(e) => {
                setCalc(e.target.value as CalcKind);
              }}
            >
              {(Object.keys(CALC_WORDS) as CalcKind[]).map((k) => (
                <option key={k} value={k}>
                  {CALC_WORDS[k]}
                </option>
              ))}
            </select>
            <span>of</span>
            <select
              className="review-field"
              aria-label="First column"
              value={a}
              onChange={(e) => {
                setA(e.target.value);
              }}
            >
              {periods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            {TWO_COLUMNS.includes(calc) && (
              <>
                <span>and</span>
                <select
                  className="review-field"
                  aria-label="Second column"
                  value={b}
                  onChange={(e) => {
                    setB(e.target.value);
                  }}
                >
                  {periods.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            {calc === 'flag-over' && (
              <input
                className="review-field rule-editor__amount"
                inputMode="decimal"
                aria-label="Amount"
                placeholder="10000.00"
                value={amountText}
                onChange={(e) => {
                  setAmountText(e.target.value);
                }}
              />
            )}
          </div>
        )}
        {TWO_COLUMNS.includes(calc) && kind === 'calc' && periods.length < 2 && (
          <p className="transfer__note">
            Tick Last period or Same period last year first, so there are two columns to compare.
          </p>
        )}
        <h3 className="new-column__preview">Preview</h3>
        {preview === null ? (
          <p className="transfer__note">Give the column a name to see it.</p>
        ) : (
          <ReportTable
            view={{
              ...preview,
              rows: preview.rows.filter((r) => r.kind !== 'heading').slice(0, 6),
            }}
            request={{
              ...request,
              ownColumns: column === null ? request.ownColumns : [...request.ownColumns, column],
            }}
            onDrill={() => undefined}
          />
        )}
        <p className="transfer__note">
          Your columns use the report&apos;s figures and are saved with your report. They never
          change the books.
        </p>
      </div>
    </Sheet>
  );
}
