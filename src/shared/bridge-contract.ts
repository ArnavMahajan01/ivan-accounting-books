// The only way the screens talk to the main process (context/code-standards.md, "Bridge").
// Each function has a name, a Zod schema for its input, and a result type. The main process
// validates every input against the schema before doing anything.

import { z } from 'zod';
import type { BooksProblem, StoreProblem } from './kinds';
import type { Result } from './result';
import {
  TRANSACTION_KINDS,
  TRANSACTION_PERIODS,
  type AccountsView,
  type BankView,
  type BooksState,
  type CommitOutcome,
  type HomeSummary,
  type PreviewOutcome,
  type UndoOutcome,
  type TransactionDetail,
  type TransactionsPage,
} from './views';

const noInput = z.object({}).strict();
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const idText = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[0-9a-z]{1,40}$`));

export const transactionFiltersSchema = z
  .object({
    from: dateText.optional(),
    to: dateText.optional(),
    accountId: idText('acc').optional(),
    kind: z.enum(TRANSACTION_KINDS).optional(),
    period: z.enum(TRANSACTION_PERIODS).optional(),
    search: z.string().max(100).optional(),
    limit: z.number().int().min(1).max(200).optional(),
    offset: z.number().int().min(0).max(1_000_000).optional(),
  })
  .strict();

export const bridgeContract = {
  'app.getInfo': { input: noInput },
  'app.getDataStatus': { input: noInput },
  'app.getBooksState': { input: noInput },
  'app.startOwnBooks': { input: noInput },
  'books.getHealth': { input: noInput },
  'sample.load': { input: noInput },
  'sample.clear': { input: noInput },
  'home.getSummary': { input: noInput },
  'accounts.list': { input: noInput },
  'transactions.list': { input: transactionFiltersSchema },
  'transactions.get': { input: z.object({ id: idText('ent') }).strict() },
  'bank.list': { input: noInput },
  /** Opens the Mac's file chooser, then previews the file chosen. */
  'bank.chooseAndPreview': { input: noInput },
  /** Previews a file dropped on the window. The path comes from the preload's `pathForFile`. */
  'bank.previewFile': { input: z.object({ path: z.string().min(1).max(1024) }).strict() },
  'bank.commitImport': { input: z.object({ previewId: idText('pre') }).strict() },
  'bank.undoImport': { input: z.object({ batchId: idText('imp') }).strict() },
  'review.getCount': { input: noInput },
} as const;

export interface AppInfo {
  readonly version: string;
  readonly development: boolean;
}

/** Whether the books opened. Open books passed the integrity check; otherwise there is a problem. */
export type DataStatus =
  | { readonly schemaVersion: number; readonly integrity: 'ok'; readonly problem: null }
  | { readonly schemaVersion: null; readonly integrity: null; readonly problem: StoreProblem };

/** The result of checking the books. Nothing in `problems` means they are sound. */
export interface BooksHealth {
  readonly problems: readonly BooksProblem[];
  readonly entries: number;
  readonly lines: number;
}

/** What each function returns on success. */
export interface BridgeResults {
  'app.getInfo': AppInfo;
  'app.getDataStatus': DataStatus;
  'app.getBooksState': BooksState;
  /** The state after the choice, so the screen can show the app. */
  'app.startOwnBooks': BooksState;
  'books.getHealth': BooksHealth;
  /** The state after loading, or after clearing. */
  'sample.load': BooksState;
  'sample.clear': BooksState;
  'home.getSummary': HomeSummary;
  'accounts.list': AccountsView;
  'transactions.list': TransactionsPage;
  /** Null when there is no entry with that id. */
  'transactions.get': TransactionDetail | null;
  'bank.list': BankView;
  'bank.chooseAndPreview': PreviewOutcome;
  'bank.previewFile': PreviewOutcome;
  'bank.commitImport': CommitOutcome;
  'bank.undoImport': UndoOutcome;
  /** How many imported lines wait for review: the count on the sidebar. */
  'review.getCount': { readonly count: number };
}

export type BridgeName = keyof typeof bridgeContract;
export const BRIDGE_NAMES = Object.keys(bridgeContract) as BridgeName[];

export type BridgeInput<N extends BridgeName> = z.input<(typeof bridgeContract)[N]['input']>;

export type BridgeErrorCode = 'invalid-input' | 'not-allowed' | 'internal';
export interface BridgeError {
  readonly code: BridgeErrorCode;
}

export type BridgeResult<N extends BridgeName> = Result<BridgeResults[N], BridgeError>;

/** The object the preload puts on `window.bridge`. */
export type BridgeApi = {
  readonly [N in BridgeName]: (input: BridgeInput<N>) => Promise<BridgeResult<N>>;
} & {
  /** The path of a file dropped on the window. The screens never read the file themselves. */
  readonly pathForFile: (file: File) => string;
};

/** The IPC channel for one function. Only the preload and the main process use it. */
export function bridgeChannel(name: BridgeName): string {
  return `bridge:${name}`;
}
