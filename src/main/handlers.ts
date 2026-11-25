// One handler per bridge function. Each returns a Result and calls at most one service.

import type { App } from 'electron';
import type { BridgeError } from '@shared/bridge-contract';
import type { OpenError, Store } from '@data/database';
import type { Clock } from '@shared/dates';
import type { RandomSource } from '@shared/ids';
import { err, ok, type Result } from '@shared/result';
import type {
  BooksState,
  CommitOutcome,
  ImportRefusal,
  PreviewOutcome,
  UndoOutcome,
} from '@shared/views';
import { checkBooks, NOT_OPEN } from '@services/check-books';
import { dataStatus } from '@services/data-status';
import { getBankView, getReviewCount } from '@services/get-bank-view';
import { getHomeSummary } from '@services/get-home-summary';
import { commitImport, importPreviewView, previewImport } from '@services/import-file';
import { getTransaction } from '@services/get-transaction';
import { listAccountsWithBalances } from '@services/list-accounts';
import { listTransactions } from '@services/list-transactions';
import { undoImport } from '@services/undo-import';
import type { BridgeHandlers } from './bridge';
import type { SessionError } from './books-session';
import { createPreviewStore } from './preview-store';
import type { StatementFile } from './statement-files';

/** What the handlers need from the books session. */
export interface BooksAccess {
  store(): Result<Store, OpenError>;
  state(): BooksState;
  loadSample(): Result<void, SessionError>;
  clearSample(): Result<void, SessionError>;
  startOwnBooks(): Result<void, SessionError>;
}

/** What the handlers need from the Mac and its files to import a statement. */
export interface StatementFiles {
  /** Opens the file chooser. Null when it was closed without a file. */
  choose(): Promise<string | null>;
  read(path: string): Promise<Result<StatementFile, ImportRefusal>>;
}

export interface HandlerDeps {
  readonly app: Pick<App, 'getVersion' | 'isPackaged'>;
  readonly books: BooksAccess;
  readonly clock: Clock;
  readonly random: RandomSource;
  readonly files: StatementFiles;
  /** Told how many lines each step added, skipped or could not read. Never given descriptions. */
  readonly onImport?: (
    event: 'previewed' | 'imported' | 'undone',
    counts: Record<string, number>,
  ) => void;
}

const INTERNAL: BridgeError = { code: 'internal' };

/** A refused request is the page's mistake, and anything else is ours. */
function failure(error: SessionError): BridgeError {
  return error === 'switch-off' || error === 'wrong-mode' ? { code: 'not-allowed' } : INTERNAL;
}

export function createHandlers({
  app,
  books,
  clock,
  random,
  files,
  onImport,
}: HandlerDeps): BridgeHandlers {
  // Files read and checked but not yet saved. Forgotten when the books change.
  const previews = createPreviewStore(random);
  const open = <T>(read: (store: Store) => Result<T, BridgeError>): Result<T, BridgeError> => {
    const store = books.store();
    return store.ok ? read(store.value) : err(INTERNAL);
  };
  const changed = (result: Result<void, SessionError>): Result<BooksState, BridgeError> => {
    previews.clear();
    return result.ok ? ok(books.state()) : err(failure(result.error));
  };

  const previewPath = async (path: string): Promise<Result<PreviewOutcome, BridgeError>> => {
    const store = books.store();
    if (!store.ok) return err(INTERNAL);
    const file = await files.read(path);
    if (!file.ok) return ok({ kind: 'refused', reason: file.error, lastFour: null });
    const prepared = previewImport({ db: store.value.db }, file.value);
    if (!prepared.ok) {
      return ok({
        kind: 'refused',
        reason: prepared.error.reason,
        lastFour: prepared.error.lastFour,
      });
    }
    const previewId = previews.put(prepared.value);
    const preview = importPreviewView(prepared.value, previewId);
    onImport?.('previewed', preview.counts);
    return ok({ kind: 'preview', preview });
  };

  return {
    'app.getInfo': () => ok({ version: app.getVersion(), development: !app.isPackaged }),
    'app.getDataStatus': () => ok(dataStatus(books.store())),
    'app.getBooksState': () => ok(books.state()),
    'app.startOwnBooks': () => changed(books.startOwnBooks()),
    'books.getHealth': () => {
      const store = books.store();
      return ok(store.ok ? checkBooks({ db: store.value.db }) : NOT_OPEN);
    },
    'sample.load': () => changed(books.loadSample()),
    'sample.clear': () => changed(books.clearSample()),
    'home.getSummary': () => open((store) => ok(getHomeSummary({ db: store.db, clock }))),
    'accounts.list': () => open((store) => ok(listAccountsWithBalances({ db: store.db, clock }))),
    'transactions.list': (filters) =>
      open((store) => {
        const result = listTransactions({ db: store.db, clock }, filters);
        return result.ok ? ok(result.value) : err({ code: 'invalid-input' });
      }),
    'transactions.get': ({ id }) => open((store) => ok(getTransaction({ db: store.db }, id))),
    'bank.list': () => open((store) => ok(getBankView({ db: store.db, clock }))),
    'bank.chooseAndPreview': async () => {
      const path = await files.choose();
      return path === null ? ok({ kind: 'cancelled' }) : previewPath(path);
    },
    'bank.previewFile': ({ path }) => previewPath(path),
    'bank.commitImport': ({ previewId }) =>
      open((store): Result<CommitOutcome, BridgeError> => {
        const prepared = previews.get(previewId);
        if (prepared === undefined) return ok({ kind: 'refused', reason: 'no-such-preview' });
        const saved = commitImport({ db: store.db, clock, random }, prepared);
        if (!saved.ok) {
          // The preview is spent either way: a second try must start from a fresh preview.
          previews.remove(previewId);
          return saved.error === 'nothing-new'
            ? ok({ kind: 'refused', reason: 'nothing-new' })
            : ok({ kind: 'refused', reason: 'no-such-preview' });
        }
        previews.remove(previewId);
        const { added, skipped, rejected, accountName } = saved.value;
        onImport?.('imported', { added, skipped, rejected });
        return ok({ kind: 'imported', added, skipped, rejected, accountName });
      }),
    'bank.undoImport': ({ batchId }) =>
      open((store): Result<UndoOutcome, BridgeError> => {
        const undone = undoImport({ db: store.db, clock, random }, batchId);
        if (!undone.ok) return ok({ kind: 'refused', reason: undone.error });
        onImport?.('undone', { removed: undone.value.removed });
        return ok({ kind: 'undone', ...undone.value });
      }),
    'review.getCount': () => open((store) => ok(getReviewCount({ db: store.db }))),
  };
}
