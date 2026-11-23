// One handler per bridge function. Each returns a Result and calls at most one service.

import type { App } from 'electron';
import type { BridgeError } from '@shared/bridge-contract';
import type { OpenError, Store } from '@data/database';
import type { Clock } from '@shared/dates';
import { err, ok, type Result } from '@shared/result';
import type { BooksState } from '@shared/views';
import { checkBooks, NOT_OPEN } from '@services/check-books';
import { dataStatus } from '@services/data-status';
import { getHomeSummary } from '@services/get-home-summary';
import { getTransaction } from '@services/get-transaction';
import { listAccountsWithBalances } from '@services/list-accounts';
import { listTransactions } from '@services/list-transactions';
import type { BridgeHandlers } from './bridge';
import type { SessionError } from './books-session';

/** What the handlers need from the books session. */
export interface BooksAccess {
  store(): Result<Store, OpenError>;
  state(): BooksState;
  loadSample(): Result<void, SessionError>;
  clearSample(): Result<void, SessionError>;
  startOwnBooks(): Result<void, SessionError>;
}

export interface HandlerDeps {
  readonly app: Pick<App, 'getVersion' | 'isPackaged'>;
  readonly books: BooksAccess;
  readonly clock: Clock;
}

const INTERNAL: BridgeError = { code: 'internal' };

/** A refused request is the page's mistake, and anything else is ours. */
function failure(error: SessionError): BridgeError {
  return error === 'switch-off' || error === 'wrong-mode' ? { code: 'not-allowed' } : INTERNAL;
}

export function createHandlers({ app, books, clock }: HandlerDeps): BridgeHandlers {
  const open = <T>(read: (store: Store) => Result<T, BridgeError>): Result<T, BridgeError> => {
    const store = books.store();
    return store.ok ? read(store.value) : err(INTERNAL);
  };
  const changed = (result: Result<void, SessionError>): Result<BooksState, BridgeError> =>
    result.ok ? ok(books.state()) : err(failure(result.error));

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
  };
}
