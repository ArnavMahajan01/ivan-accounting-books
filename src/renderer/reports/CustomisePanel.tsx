// Customise a report (spec 100, wireframe W06a Option 2): the columns and rows change the report
// straight away. Ready layouts to start from, and New column for his own (spec 102).

import { Plus, X } from 'lucide-react';
import type { ReportRequest } from '@shared/reports';
import { Button } from '../components/Button';
import { SidePanel } from '../components/SidePanel';
import { READY_LAYOUTS } from './ready-layouts';

type Columns = ReportRequest['columns'];
type Rows = ReportRequest['rows'];

const COLUMN_CHOICES: readonly { key: keyof Columns; label: string }[] = [
  { key: 'lastPeriod', label: 'Last period' },
  { key: 'sameLastYear', label: 'Same period last year' },
  { key: 'percentOfIncome', label: '% of income' },
  { key: 'monthByMonth', label: 'Month by month' },
];
const ROW_CHOICES: readonly { key: keyof Rows; label: string }[] = [
  { key: 'showEmpty', label: 'Show accounts with no amounts' },
  { key: 'groupSmall', label: 'Group small expenses as "Other"' },
  { key: 'showCodes', label: 'Show account codes' },
];

export function CustomisePanel({
  request,
  onChange,
  onNewColumn,
  onClose,
}: {
  readonly request: ReportRequest;
  readonly onChange: (next: ReportRequest) => void;
  readonly onNewColumn: () => void;
  readonly onClose: () => void;
}) {
  return (
    <SidePanel title="Customise" onClose={onClose}>
      <div className="rule-editor">
        <fieldset className="rule-editor__group">
          <legend>Start from</legend>
          <div className="rule-editor__row">
            {READY_LAYOUTS.map((l) => (
              <Button
                key={l.name}
                size="small"
                onClick={() => {
                  onChange(l.request);
                }}
              >
                {l.name}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset className="rule-editor__group">
          <legend>Columns</legend>
          {COLUMN_CHOICES.map((c) => (
            <label key={c.key} className="rule-editor__check">
              <input
                type="checkbox"
                checked={request.columns[c.key]}
                // Month by month replaces the comparison columns, so it cannot sit with them.
                disabled={
                  c.key !== 'monthByMonth' &&
                  c.key !== 'percentOfIncome' &&
                  request.columns.monthByMonth
                }
                onChange={(e) => {
                  onChange({
                    ...request,
                    columns: { ...request.columns, [c.key]: e.target.checked },
                  });
                }}
              />
              <span>{c.label}</span>
            </label>
          ))}
          {request.ownColumns.map((c, i) => (
            <div key={`${c.name}-${String(i)}`} className="rule-editor__row">
              <span>{c.name}</span>
              <button
                type="button"
                className="split__remove"
                aria-label={`Remove the column ${c.name}`}
                onClick={() => {
                  onChange({
                    ...request,
                    ownColumns: request.ownColumns.filter((_, j) => j !== i),
                  });
                }}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
          <Button size="small" icon={Plus} onClick={onNewColumn}>
            New column…
          </Button>
        </fieldset>
        <fieldset className="rule-editor__group">
          <legend>Rows</legend>
          {ROW_CHOICES.map((c) => (
            <label key={c.key} className="rule-editor__check">
              <input
                type="checkbox"
                checked={request.rows[c.key]}
                onChange={(e) => {
                  onChange({ ...request, rows: { ...request.rows, [c.key]: e.target.checked } });
                }}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </fieldset>
        <p className="transfer__note">
          Every change shows straight away. The figures always come from your books.
        </p>
      </div>
    </SidePanel>
  );
}
