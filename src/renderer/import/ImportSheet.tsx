// The sheet over the Bank page (spec 065, wireframe W04 Option 5): what will happen, in sentences,
// before anything is saved. The table of lines is one click away and closed by default.

import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useId, useState } from 'react';
import type { CommitOutcome, ImportLineView, ImportPreview, ImportRefusal } from '@shared/views';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Amount } from '../components/Amount';
import { DateCell } from '../components/DateCell';
import { Sheet } from '../components/Sheet';
import { Table, type TableColumn } from '../components/Table';
import {
  balanceMessage,
  periodText,
  plural,
  refusalText,
  rejectionSentence,
  type RejectedLineView,
} from './import-text';
import { bridge } from '../bridge';
import { useBooksState } from '../books-state';
import './ImportSheet.css';

/** "9 lines were posted by your rules", with Undo for all of them (spec 081). */
function RulesPostedNote({ lineIds }: { readonly lineIds: readonly string[] }) {
  const { refreshReviewCount } = useBooksState();
  const [state, setState] = useState<'posted' | 'undone' | 'failed'>('posted');
  const undo = async () => {
    const api = bridge();
    const result = await api['review.undo']({ lineIds: [...lineIds] });
    setState(result.ok && result.value.kind === 'undone' ? 'undone' : 'failed');
    refreshReviewCount();
  };
  return (
    <li className="import-sheet__rules" aria-live="polite">
      {state === 'posted' && (
        <>
          {plural(lineIds.length, 'line was', 'lines were')} posted by your rules.{' '}
          <Button size="small" onClick={() => void undo()}>
            Undo
          </Button>
        </>
      )}
      {state === 'undone' &&
        `Undone. ${plural(lineIds.length, 'line waits', 'lines wait')} in To review.`}
      {state === 'failed' && 'Those lines could not be put back, and nothing was changed.'}
    </li>
  );
}

export type ImportStep =
  | { readonly kind: 'closed' }
  | { readonly kind: 'preview'; readonly preview: ImportPreview }
  | { readonly kind: 'saving'; readonly preview: ImportPreview }
  | { readonly kind: 'done'; readonly outcome: Extract<CommitOutcome, { kind: 'imported' }> }
  | { readonly kind: 'not-saved'; readonly reason: 'no-such-preview' | 'nothing-new' }
  | { readonly kind: 'refused'; readonly reason: ImportRefusal; readonly lastFour: string | null }
  | { readonly kind: 'notice'; readonly message: string }
  | { readonly kind: 'failed' };

export interface ImportSheetProps {
  readonly step: ImportStep;
  readonly onClose: () => void;
  readonly onConfirm: (preview: ImportPreview) => void;
  readonly onChooseAnother: () => void;
}

// A file can hold thousands of lines. The table shows the first of them, and the filter narrows it.
const MAX_ROWS = 200;

type Filter = 'all' | 'new' | 'duplicate' | 'rejected';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All lines',
  new: 'New',
  duplicate: 'Skipped (already in your books)',
  rejected: 'Could not be read',
};

const COLUMNS: readonly TableColumn<ImportLineView>[] = [
  {
    key: 'date',
    header: 'Date',
    fit: true,
    cell: (line) => (line.status === 'rejected' ? '—' : <DateCell date={line.date} />),
  },
  {
    key: 'description',
    header: 'Description',
    cell: (line) => (line.status === 'rejected' ? rejectionSentence(line) : line.description),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'end',
    fit: true,
    cell: (line) => (line.amount === null ? '' : <Amount cents={line.amount} />),
  },
  { key: 'status', header: 'Status', fit: true, cell: (line) => <Badge status={line.status} /> },
];

function Lines({ preview }: { readonly preview: ImportPreview }) {
  const [filter, setFilter] = useState<Filter>('all');
  const selectId = useId();
  const rows = preview.lines.filter((l) => filter === 'all' || l.status === filter);
  const shown = rows.slice(0, MAX_ROWS);
  return (
    <details className="import-sheet__details">
      <summary>See all lines</summary>
      <div className="import-sheet__filter">
        <label htmlFor={selectId}>Show</label>
        <select
          id={selectId}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as Filter);
          }}
        >
          {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
            <option key={key} value={key}>
              {FILTER_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div className="import-sheet__lines">
        <Table
          label="Lines in this file"
          columns={COLUMNS}
          rows={shown}
          rowKey={(line) => String(line.position)}
        />
      </div>
      {rows.length > shown.length && (
        <p className="import-sheet__more">
          Showing the first {shown.length.toLocaleString('en-AU')} of{' '}
          {rows.length.toLocaleString('en-AU')} lines. Use Show to narrow them down.
        </p>
      )}
    </details>
  );
}

const TONE_ICONS = { ok: CircleCheck, warning: CircleAlert, info: Info } as const;

function PreviewBody({ preview }: { readonly preview: ImportPreview }) {
  const { counts } = preview;
  const rejected = preview.lines.filter((l): l is RejectedLineView => l.status === 'rejected');
  const balance = balanceMessage(preview.balance, counts.rejected);
  const Icon = TONE_ICONS[balance.tone];
  return (
    <>
      <ul className="import-sheet__plain">
        <li>
          This file is for <strong>{preview.account.name}</strong>
          {periodText(preview.period)}.
        </li>
        {counts.new > 0 ? (
          <li>
            <strong>{plural(counts.new, 'new line', 'new lines')}</strong> will go to To review.
          </li>
        ) : (
          <li>
            <strong>Nothing is new.</strong> Every line in this file that could be read is already
            in your books.
          </li>
        )}
        {counts.duplicate > 0 && (
          <li>
            <strong>
              {plural(counts.duplicate, 'line is', 'lines are')} already in your books
            </strong>{' '}
            from an earlier import. {counts.duplicate === 1 ? 'It' : 'They'} will be skipped.
          </li>
        )}
        {rejected.length > 0 && (
          <li>
            <strong>{plural(rejected.length, 'line', 'lines')} could not be read</strong>:{' '}
            {rejected.slice(0, 3).map(rejectionSentence).join('; ')}
            {rejected.length > 3 && ` and ${String(rejected.length - 3)} more`}.{' '}
            {rejected.length === 1 ? 'It' : 'They'} will not be imported.
          </li>
        )}
      </ul>
      <div className={`import-sheet__check import-sheet__check--${balance.tone}`}>
        <Icon aria-hidden="true" className="import-sheet__check-icon" />
        <p>
          <strong>{balance.title}</strong> {balance.detail}
        </p>
      </div>
      <Lines preview={preview} />
    </>
  );
}

export function ImportSheet({ step, onClose, onConfirm, onChooseAnother }: ImportSheetProps) {
  switch (step.kind) {
    case 'closed':
      return null;
    case 'preview':
    case 'saving': {
      const { preview } = step;
      const saving = step.kind === 'saving';
      const count = preview.counts.new;
      return (
        <Sheet
          title={preview.fileName}
          onClose={saving ? () => undefined : onClose}
          actions={
            <>
              {/* With nothing to import, closing the sheet is the only thing left to do. */}
              <Button
                {...(count === 0 ? { variant: 'main' as const } : {})}
                onClick={onClose}
                disabled={saving}
              >
                {count === 0 ? 'Close' : 'Cancel'}
              </Button>
              {count > 0 && (
                <Button
                  variant="main"
                  disabled={saving}
                  onClick={() => {
                    onConfirm(preview);
                  }}
                >
                  {saving ? 'Importing…' : `Import ${plural(count, 'line', 'lines')}`}
                </Button>
              )}
            </>
          }
        >
          <PreviewBody preview={preview} />
        </Sheet>
      );
    }
    case 'done': {
      const { outcome } = step;
      return (
        <Sheet
          title={`${plural(outcome.added, 'line', 'lines')} added to To review`}
          onClose={onClose}
          actions={
            <>
              <Button onClick={onClose}>Done</Button>
              <Button
                variant="main"
                onClick={() => {
                  window.location.hash = '#/to-review';
                  onClose();
                }}
              >
                Go to To review
              </Button>
            </>
          }
        >
          <ul className="import-sheet__plain">
            <li>
              From <strong>{outcome.accountName}</strong>.
            </li>
            {outcome.skipped > 0 && (
              <li>
                {plural(outcome.skipped, 'line was', 'lines were')} already in your books and{' '}
                {outcome.skipped === 1 ? 'was' : 'were'} skipped.
              </li>
            )}
            {outcome.rejected > 0 && (
              <li>
                {plural(outcome.rejected, 'line', 'lines')} could not be read and{' '}
                {outcome.rejected === 1 ? 'was' : 'were'} not imported.
              </li>
            )}
            {outcome.postedByRules.length > 0 && (
              <RulesPostedNote lineIds={outcome.postedByRules} />
            )}
            {outcome.rulesCouldNot > 0 && (
              <li>
                {plural(outcome.rulesCouldNot, 'line fits', 'lines fit')} a rule that posts by
                itself but could not be posted, such as in a locked period. They wait in To review.
              </li>
            )}
          </ul>
        </Sheet>
      );
    }
    case 'not-saved':
      return (
        <Sheet
          title={step.reason === 'nothing-new' ? 'Nothing new to add' : 'Choose the file again'}
          onClose={onClose}
          actions={
            step.reason === 'nothing-new' ? (
              <Button variant="main" onClick={onClose}>
                Close
              </Button>
            ) : (
              <>
                <Button onClick={onClose}>Close</Button>
                <Button variant="main" onClick={onChooseAnother}>
                  Choose file
                </Button>
              </>
            )
          }
        >
          <p className="import-sheet__message">
            {step.reason === 'nothing-new'
              ? 'Every line in this file is already in your books, so nothing was added.'
              : 'This preview is no longer current, and nothing was added. Choose the file again to see it afresh.'}
          </p>
        </Sheet>
      );
    case 'refused':
      return (
        <Sheet
          title="This file could not be imported"
          onClose={onClose}
          actions={
            <>
              <Button onClick={onClose}>Close</Button>
              <Button variant="main" onClick={onChooseAnother}>
                Choose another file
              </Button>
            </>
          }
        >
          <p className="import-sheet__message">{refusalText(step.reason, step.lastFour)}</p>
        </Sheet>
      );
    case 'notice':
      return (
        <Sheet
          title="One file at a time"
          onClose={onClose}
          actions={
            <Button variant="main" onClick={onClose}>
              Close
            </Button>
          }
        >
          <p className="import-sheet__message">{step.message}</p>
        </Sheet>
      );
    case 'failed':
      return (
        <Sheet
          title="Something went wrong"
          onClose={onClose}
          actions={
            <Button variant="main" onClick={onClose}>
              Close
            </Button>
          }
        >
          <p className="import-sheet__message">
            The file could not be checked, and nothing was added. Try again. If it keeps happening,
            close the app and open it again.
          </p>
        </Sheet>
      );
  }
}
