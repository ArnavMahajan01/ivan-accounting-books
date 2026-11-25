// The Bank page (spec 064, wireframe W04): one row per bank account, Import file as the main
// action, and a drop zone. Dropping a file anywhere on the window also works (ImportProvider).

import { Landmark, Undo2, Upload } from 'lucide-react';
import { useState } from 'react';
import { formatDateAU } from '@shared/dates';
import type { BankAccountRow, BankView, UndoOutcome } from '@shared/views';
import { Amount } from '../components/Amount';
import { bridge } from '../bridge';
import { useBooksState } from '../books-state';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { useImport } from '../import/ImportProvider';
import { periodText, plural } from '../import/import-text';
import { PageToolbar } from '../layout/PageToolbar';
import { guideHref, routeHref } from '../routes';
import { loadBank } from './data-status';
import { useBridgeQuery } from './use-bridge';
import './BankPage.css';

export const IMPORT_GUIDE_ID = 'import-a-westpac-file';

const COLUMNS: readonly TableColumn<BankAccountRow>[] = [
  {
    key: 'account',
    header: 'Account',
    cell: (account) => (
      <span className={account.parentId === null ? 'bank__name' : 'bank__name bank__name--sub'}>
        {account.name}
        {/* The name usually carries the last four digits already. When it does not, they are added. */}
        {!account.name.includes(account.lastFour) && (
          <span className="bank__digits"> ··{account.lastFour}</span>
        )}
      </span>
    ),
  },
  {
    key: 'books',
    fit: true,
    header: 'In your books',
    align: 'end',
    cell: (account) => <Amount cents={account.balance} />,
  },
  {
    key: 'statement',
    fit: true,
    header: 'Last statement',
    align: 'end',
    cell: (account) =>
      account.lastStatement === null ? (
        <span className="bank__none">None imported yet</span>
      ) : (
        <span className="bank__statement">
          <Amount cents={account.lastStatement.balance} />
          <span className="bank__as-at">as at {formatDateAU(account.lastStatement.date)}</span>
        </span>
      ),
  },
  {
    key: 'review',
    fit: true,
    header: 'To review',
    align: 'end',
    cell: (account) =>
      account.linesToReview === 0 ? (
        <span className="bank__none">None</span>
      ) : (
        <a href={routeHref('to-review')} className="bank__link">
          {plural(account.linesToReview, 'line', 'lines')}
        </a>
      ),
  },
  {
    key: 'reconciled',
    fit: true,
    header: 'Reconciled',
    cell: (account) =>
      account.reconciledTo === null ? (
        <span className="bank__none">Not yet</span>
      ) : (
        `to ${formatDateAU(account.reconciledTo)}`
      ),
  },
];

const UNDO_REFUSED: Record<Extract<UndoOutcome, { kind: 'refused' }>['reason'], string> = {
  'not-found': 'That import has already been taken back.',
  'not-the-latest':
    'A newer file has been imported since, so this one can no longer be taken back.',
  'lines-already-used':
    'Some of its lines have already been dealt with, so it can no longer be taken back.',
};

/** What the page tells him after he tries to take an import back. */
type UndoNotice =
  | { readonly kind: 'done'; readonly removed: number; readonly fileName: string }
  | { readonly kind: 'refused'; readonly text: string }
  | { readonly kind: 'failed' };

function LastImports({
  accounts,
  onUndo,
}: {
  readonly accounts: readonly BankAccountRow[];
  readonly onUndo: (account: BankAccountRow) => void;
}) {
  const rows = accounts.filter((a) => a.undoableImport !== null);
  if (rows.length === 0) return null;
  return (
    <section className="bank__last" aria-labelledby="bank-last-import">
      <h2 id="bank-last-import" className="bank__last-title">
        Last import
      </h2>
      <ul className="bank__last-list">
        {rows.map((account) => {
          const last = account.undoableImport;
          if (last === null) return null;
          return (
            <li key={account.id} className="bank__last-row">
              <span className="bank__last-text">
                <strong>{account.name}</strong>: {last.fileName},{' '}
                {plural(last.added, 'line', 'lines')} added{periodText(last.period)}.
              </span>
              <Button
                size="small"
                icon={Undo2}
                aria-label={`Undo import of ${last.fileName}`}
                onClick={() => {
                  onUndo(account);
                }}
              >
                Undo import
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Accounts({
  view,
  onUndo,
}: {
  readonly view: BankView;
  readonly onUndo: (account: BankAccountRow) => void;
}) {
  const hasStatements = view.accounts.some((a) => a.lastStatement !== null || a.linesToReview > 0);
  return (
    <>
      <Table
        label="Bank accounts"
        columns={COLUMNS}
        rows={view.accounts}
        rowKey={(account) => account.id}
      />
      {!hasStatements && (
        <p className="bank__hint">
          No bank lines yet. Import a file from Westpac Online Banking.{' '}
          <a href={guideHref(IMPORT_GUIDE_ID)} className="bank__link">
            How to download one
          </a>
        </p>
      )}
      <LastImports accounts={view.accounts} onUndo={onUndo} />
    </>
  );
}

export function BankPage() {
  const { start, importedCount } = useImport();
  // An import changes the figures, so the table is asked for again after each one.
  const { state, reload } = useBridgeQuery(loadBank, String(importedCount));
  const { refreshReviewCount } = useBooksState();
  const [confirming, setConfirming] = useState<BankAccountRow | null>(null);
  const [notice, setNotice] = useState<UndoNotice | null>(null);

  const undo = (account: BankAccountRow) => {
    const last = account.undoableImport;
    setConfirming(null);
    if (last === null) return;
    const api = bridge();
    void api['bank.undoImport']({ batchId: last.batchId })
      .then((result) => {
        if (!result.ok) {
          setNotice({ kind: 'failed' });
        } else if (result.value.kind === 'undone') {
          setNotice({
            kind: 'done',
            removed: result.value.removed,
            fileName: result.value.fileName,
          });
        } else {
          setNotice({ kind: 'refused', text: UNDO_REFUSED[result.value.reason] });
        }
        refreshReviewCount();
        reload();
      })
      .catch(() => {
        setNotice({ kind: 'failed' });
      });
  };

  return (
    <>
      <PageToolbar
        title="Bank"
        mainAction={
          <Button
            variant="main"
            icon={Upload}
            onClick={() => {
              start({ kind: 'choose' });
            }}
          >
            Import file
          </Button>
        }
      />
      {state.status === 'loading' && (
        <section className="page-surface" aria-busy="true" aria-label="Loading bank accounts">
          <Table label="Bank accounts" columns={COLUMNS} rows={[]} rowKey={() => ''} loading />
        </section>
      )}
      {state.status === 'failed' && (
        <ErrorMessage message="The bank accounts could not be read. Close the app and open it again." />
      )}
      {state.status === 'ready' &&
        (state.value.accounts.length === 0 ? (
          <section className="page-surface">
            <EmptyState
              icon={Landmark}
              message="No bank accounts yet. Your Westpac accounts appear here, and you import their statement files from here."
            />
          </section>
        ) : (
          <Accounts
            view={state.value}
            onUndo={(account) => {
              setNotice(null);
              setConfirming(account);
            }}
          />
        ))}
      {notice !== null && (
        <p className="bank__notice" role={notice.kind === 'done' ? 'status' : 'alert'}>
          {notice.kind === 'done' &&
            `${plural(notice.removed, 'line', 'lines')} removed from To review. You can import ${notice.fileName} again.`}
          {notice.kind === 'refused' && notice.text}
          {notice.kind === 'failed' &&
            'The import could not be taken back, and nothing was changed. Try again.'}
        </p>
      )}
      {confirming?.undoableImport != null && (
        <ConfirmDialog
          title="Undo this import?"
          change={`The ${plural(confirming.undoableImport.added, 'line', 'lines')} from ${confirming.undoableImport.fileName} will leave To review. The file stays where it is, and you can import it again.`}
          confirmLabel="Undo import"
          destructive
          onConfirm={() => {
            undo(confirming);
          }}
          onCancel={() => {
            setConfirming(null);
          }}
        />
      )}
      <div className="bank__drop">
        <p className="bank__drop-text">
          Drop a Westpac statement file here, or click <strong>Import file</strong>.
        </p>
        <p className="bank__drop-note">
          The file must be an OFX file from Westpac Online Banking, for one account.
        </p>
      </div>
    </>
  );
}
