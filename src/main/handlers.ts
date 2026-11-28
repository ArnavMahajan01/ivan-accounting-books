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
import { getReviewView } from '@services/list-review';
import { postLines, postSplitLine } from '@services/post-line';
import { savePayeeFromLine, undoSavePayee } from '@services/save-payee';
import { undoImport } from '@services/undo-import';
import { undoPost } from '@services/undo-post';
import { moveEntries } from '@services/fix-entry';
import {
  addAccount,
  deactivateAccount,
  editAccount,
  reactivateAccount,
} from '@services/manage-accounts';
import { checkReconcile, finishReconcile, type ReconcileInput } from '@services/reconcile';
import {
  getRulesView,
  moveRule,
  postByRules,
  removeRule,
  ruleOfferFor,
  saveRule,
  setRuleActive,
  testRule,
} from '@services/rules';
import type { z } from 'zod';
import type { drillSchema, reconcileSchema, ruleInputSchema } from '@shared/bridge-contract';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import type { Drill } from '@shared/reports';
import { reportCsv } from '@domain/csv';
import { getQuarterClose, lockPeriod } from '@services/quarter-close';
import {
  listReportLayouts,
  openReportLayout,
  removeReportLayout,
  saveReportLayout,
} from '@services/report-layouts';
import { getReport, getReportLines } from '@services/reports';
import type { ReportExports } from './report-exports';
import type { GoogleAccess } from './google-setup';
import type { SheetPanel } from './sheet-panel';
import type { InvoiceFile, InvoiceFileRefusal } from './invoice-files';
import { commitInvoiceFile, previewInvoiceFile } from '@services/invoice-import';
import { invoicesView } from '@services/invoices-view';
import { contactPage, contactsView } from '@services/contacts-view';
import { addContactByHand, editContact } from '@services/contacts';
import { contactPairs, keepBoth, mergeContacts } from '@services/merge-contacts';
import { businessView, changeBusinessSettings, toBusinessView } from '@services/business-settings';
import { bankAccountsSettings } from '@services/bank-accounts-settings';
import { addBankAccount } from '@services/add-bank-account';
import { deactivateBankAccount, renameBankAccount } from '@services/manage-bank-accounts';
import type { Appearance, HelpPrefs } from '@shared/settings';
import type { BackupManager } from './backup-manager';
import {
  linkedInvoiceFolder,
  mergeExchangeFiles,
  setInvoiceFolder,
} from '@services/invoice-folder';
import { getInvoice } from '@data/invoice-repository';
import { matchDeposit } from '@services/invoice-payments';
import type { PostFailure, PostOutcome } from '@shared/views';
import { basename, join } from 'node:path';
import { newId } from '@shared/ids';
import type { InvoiceCommitOutcome, InvoicePreviewOutcome } from '@shared/invoices';
import { setSheetPanelOn, sheetPanelOn } from '@services/sheet-panel-setting';
import type { ChangesCheck, ConnectProblem, ShareOutcome, ShareRefusal } from '@shared/sheets';
import {
  acceptChange,
  changesView,
  rejectChange,
  waitingCount,
} from '@services/accountant-changes';
import { readyFormulas } from '@domain/ready-formulas';
import {
  changeRole,
  sharedPeople,
  shareWorkbook,
  stopSharing,
  stopSharingEverything,
  type SharingDeps,
} from '@google/sharing';
import type { ConnectFailure } from '@google/connection';
import { sheetUrl } from '@google/google-api';
import { publishWorkbook } from '@google/publish';
import { getSheetLink } from '@services/sheet-links';
import { previewWorkbook } from '@services/sheet-preview';
import { reportHtml } from './report-html';

/** A day the bridge checked the shape of, or null when it does not exist, such as 31 November. */
function calendarDate(text: string): CalendarDate | null {
  const parsed = parseCalendarDate(text, 'YYYY-MM-DD');
  return parsed.ok ? parsed.value : null;
}

/** A figure's lines, with real days, or null. */
function toDrill(drill: z.output<typeof drillSchema>): Drill | null {
  const to = calendarDate(drill.to);
  const from = drill.from === null ? null : calendarDate(drill.from);
  if (to === null || (drill.from !== null && from === null)) return null;
  if (drill.kind === 'account') return { ...drill, from, to };
  return from === null ? null : { ...drill, from, to };
}
import type { RuleInput } from '@shared/rule-types';

/** The bridge checked the rule's shape; amounts are whole cents. */
function toRuleInput(rule: z.output<typeof ruleInputSchema>): RuleInput {
  return {
    ...rule,
    conditions: rule.conditions.map((c) =>
      c.field === 'description'
        ? c
        : c.op === 'equals'
          ? { ...c, amount: asCents(c.amount) }
          : { ...c, min: asCents(c.min), max: asCents(c.max) },
    ),
  };
}

/** The bridge checked the date's shape; a day that does not exist is caught by the service's lookups. */
function toReconcileInput(input: z.output<typeof reconcileSchema>): ReconcileInput {
  return {
    bankAccountId: input.bankAccountId,
    statementDate: input.statementDate as CalendarDate,
    statementBalance: asCents(input.statementBalance),
  };
}
import { asCents } from '@shared/money';
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
  /** Google: the connection, the Drive and Sheets calls, and the browser (folder 09). */
  readonly google: GoogleAccess;
  /** The Mac's clipboard, for Copy on the Ready formulas (spec 113). */
  readonly clipboard: { writeText(text: string): void };
  /** Choosing and reading an invoice exchange file (spec 126). */
  readonly invoiceFiles: {
    choose(): Promise<string | null>;
    read(path: string): Promise<Result<InvoiceFile, InvoiceFileRefusal>>;
    /** The linked folder (spec 127): choose it, list its exchange files, open a PDF in it. */
    chooseFolder(): Promise<string | null>;
    /** Null when the folder is gone or cannot be read. */
    list(folder: string): Promise<string[] | null>;
    openFile(path: string): Promise<boolean>;
  };
  /** Reads the sheets for the accountant's changes now (spec 116). */
  readonly checkSheets: () => Promise<ChangesCheck>;
  /** The real Google Sheet in a panel inside the window (spec 118). */
  readonly sheetPanel: Pick<SheetPanel, 'open' | 'move' | 'close' | 'clearSession'>;
  readonly books: BooksAccess;
  /** Backups and restoring (specs 136 to 138). */
  readonly backups: Pick<
    BackupManager,
    | 'status'
    | 'chooseFolder'
    | 'turnOn'
    | 'recoveryKey'
    | 'setDaily'
    | 'backupNow'
    | 'list'
    | 'restore'
  >;
  /** Choices about this Mac, kept outside the books, and Finder (spec 133). */
  readonly system: {
    appearance(): Appearance;
    setAppearance(appearance: Appearance): void;
    helpPrefs(): HelpPrefs;
    saveHelpPrefs(prefs: HelpPrefs): void;
    showBooksFolder(): boolean;
  };
  readonly clock: Clock;
  readonly random: RandomSource;
  readonly files: StatementFiles;
  /** Saving a report as CSV or PDF (specs 098, 099). */
  readonly exports: ReportExports;
  /** Told how many lines each step added, skipped or could not read. Never given descriptions. */
  readonly onImport?: (
    event: 'previewed' | 'imported' | 'undone',
    counts: Record<string, number>,
  ) => void;
}

const INTERNAL: BridgeError = { code: 'internal' };

function shareOutcome(done: Result<void, ShareRefusal>): ShareOutcome {
  return done.ok ? { kind: 'done' } : { kind: 'refused', reason: done.error };
}

/** What Settings says when connecting did not work. */
function connectProblem(failure: ConnectFailure): ConnectProblem {
  switch (failure) {
    case 'not-set-up':
    case 'cancelled':
    case 'offline':
    case 'scope-refused':
    case 'no-keychain':
    case 'busy':
      return failure;
    case 'no-port':
    case 'needs-sign-in':
    case 'not-found':
    case 'failed':
      return 'failed';
  }
}

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
  exports,
  onImport,
  google,
  clipboard,
  checkSheets,
  sheetPanel,
  invoiceFiles,
  system,
  backups,
}: HandlerDeps): BridgeHandlers {
  // Invoice files read and checked but not yet added: the text stays in main, never the screens.
  const invoicePreviews = new Map<string, InvoiceFile>();
  const previewInvoices = (file: InvoiceFile): Result<InvoicePreviewOutcome, BridgeError> =>
    open((store): Result<InvoicePreviewOutcome, BridgeError> => {
      const preview = previewInvoiceFile({ db: store.db }, file.text, file.fileName);
      if (!preview.ok) return ok({ kind: 'refused' as const, ...preview.error });
      const previewId = newId('pre', random);
      invoicePreviews.clear();
      invoicePreviews.set(previewId, file);
      return ok({ kind: 'preview' as const, previewId, preview: preview.value });
    });
  /** The books and Google, for the sharing calls. */
  const sharing = async (): Promise<Result<SharingDeps, BridgeError>> => {
    const store = books.store();
    if (!store.ok) return err(INTERNAL);
    const status = await google.connection.status();
    return ok({
      ctx: { db: store.value.db, clock, random },
      api: google.api,
      connected: status.kind === 'connected',
    });
  };
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
        const byRules = postByRules({ db: store.db, clock, random }, saved.value.batch.id);
        onImport?.('imported', { added, skipped, rejected, postedByRules: byRules.posted.length });
        return ok({
          kind: 'imported',
          added,
          skipped,
          rejected,
          accountName,
          postedByRules: byRules.posted,
          rulesCouldNot: byRules.skipped.length,
        });
      }),
    'bank.undoImport': ({ batchId }) =>
      open((store): Result<UndoOutcome, BridgeError> => {
        const undone = undoImport({ db: store.db, clock, random }, batchId);
        if (!undone.ok) return ok({ kind: 'refused', reason: undone.error });
        onImport?.('undone', { removed: undone.value.removed });
        return ok({ kind: 'undone', ...undone.value });
      }),
    'review.getCount': () => open((store) => ok(getReviewCount({ db: store.db }))),
    'review.list': (filters) => open((store) => ok(getReviewView({ db: store.db }, filters))),
    'review.post': ({ actions }) =>
      open((store) => ok(postLines({ db: store.db, clock, random }, actions))),
    'review.split': ({ lineId, parts, payeeId }) =>
      open((store) => {
        const posted = postSplitLine(
          { db: store.db, clock, random },
          { lineId, payeeId, parts: parts.map((p) => ({ ...p, amount: asCents(p.amount) })) },
        );
        return ok(
          posted.ok
            ? { posted: [lineId], alsoPosted: [], failed: [] }
            : { posted: [], alsoPosted: [], failed: [{ lineId, reason: posted.error }] },
        );
      }),
    'review.matchInvoices': ({ lineId, invoices, leftover }) =>
      open((store): Result<PostOutcome, BridgeError> => {
        const matched = matchDeposit(
          { db: store.db, clock, random },
          {
            lineId,
            invoices: invoices.map((i) => ({ ...i, amount: asCents(i.amount) })),
            leftover,
          },
        );
        if (matched.ok) return ok({ posted: [lineId], alsoPosted: [], failed: [] });
        const reason: PostFailure =
          matched.error === 'more-than-owed' || matched.error === 'no-invoice'
            ? 'no-longer-matches'
            : matched.error === 'not-a-deposit' || matched.error === 'does-not-add-up'
              ? 'invalid'
              : matched.error;
        return ok({ posted: [], alsoPosted: [], failed: [{ lineId, reason }] });
      }),
    'review.undo': ({ lineIds }) =>
      open((store) => {
        const undone = undoPost({ db: store.db, clock, random }, lineIds);
        return ok(
          undone.ok
            ? { kind: 'undone', lines: undone.value.lines }
            : { kind: 'refused', reason: undone.error },
        );
      }),
    'review.savePayee': (input) =>
      open((store) => {
        const saved = savePayeeFromLine({ db: store.db, clock, random }, input);
        return ok(saved.ok ? saved.value : { kind: 'refused', reason: saved.error });
      }),
    'review.undoPayee': (input) =>
      open((store) => ok({ undone: undoSavePayee({ db: store.db, clock, random }, input).ok })),
    'rules.list': () => open((store) => ok(getRulesView({ db: store.db }))),
    'rules.save': ({ id, rule }) =>
      open((store) => {
        const saved = saveRule({ db: store.db, clock, random }, { id, rule: toRuleInput(rule) });
        return ok(
          saved.ok
            ? { kind: 'saved', rule: saved.value }
            : { kind: 'refused', reason: saved.error },
        );
      }),
    'rules.setActive': ({ id, active }) =>
      open((store) =>
        ok({ changed: setRuleActive({ db: store.db, clock, random }, id, active).ok }),
      ),
    'rules.move': ({ id, toPosition }) =>
      open((store) =>
        ok({ changed: moveRule({ db: store.db, clock, random }, id, toPosition).ok }),
      ),
    'rules.remove': ({ id }) =>
      open((store) => ok({ removed: removeRule({ db: store.db, clock, random }, id).ok })),
    'rules.test': ({ rule }) => open((store) => ok(testRule({ db: store.db }, toRuleInput(rule)))),
    'rules.offerFor': ({ lineId }) =>
      open((store) => ok({ offer: ruleOfferFor({ db: store.db }, lineId) })),
    'transactions.move': ({ entryIds, accountId }) =>
      open((store) => ok(moveEntries({ db: store.db, clock, random }, entryIds, accountId))),
    'accounts.add': (input) =>
      open((store) => {
        const added = addAccount(
          { db: store.db, clock, random },
          {
            code: input.code,
            name: input.name,
            type: input.type,
            ...(input.parentId === null ? {} : { parentId: input.parentId }),
            defaultTaxCodeId: input.defaultTaxCodeId,
          },
        );
        return ok(
          added.ok
            ? { kind: 'saved', id: added.value.id }
            : { kind: 'refused', reason: added.error },
        );
      }),
    'accounts.edit': ({ id, code, name }) =>
      open((store) => {
        const edited = editAccount({ db: store.db, clock, random }, { id, code, name });
        return ok(edited.ok ? { kind: 'saved', id } : { kind: 'refused', reason: edited.error });
      }),
    'accounts.setActive': ({ id, active }) =>
      open((store) => {
        const ctx = { db: store.db, clock, random };
        const changed = active ? reactivateAccount(ctx, id) : deactivateAccount(ctx, id);
        return ok(changed.ok ? { kind: 'saved', id } : { kind: 'refused', reason: changed.error });
      }),
    'reports.get': ({ request }) =>
      open((store) => {
        const built = getReport({ db: store.db, clock }, request);
        return ok(
          built.ok
            ? { kind: 'report', view: built.value }
            : { kind: 'refused', reason: built.error },
        );
      }),
    'reports.lines': ({ drill }) =>
      open((store) => {
        const typed = toDrill(drill);
        return typed === null
          ? err({ code: 'invalid-input' })
          : ok(getReportLines({ db: store.db, clock }, typed));
      }),
    'reports.close': ({ end }) =>
      open((store) => {
        const day = end === null ? null : calendarDate(end);
        if (end !== null && day === null) return err({ code: 'invalid-input' });
        const view = getQuarterClose({ db: store.db, clock }, day);
        return ok(view.ok ? view.value : null);
      }),
    'reports.lock': ({ endDate }) =>
      open((store) => {
        const day = calendarDate(endDate);
        if (day === null) return err({ code: 'invalid-input' });
        const locked = lockPeriod({ db: store.db, clock, random }, day);
        return ok(
          locked.ok
            ? { kind: 'locked', lockDate: locked.value }
            : { kind: 'refused', reason: locked.error },
        );
      }),
    'reports.layouts': () => open((store) => ok(listReportLayouts({ db: store.db }))),
    'reports.openLayout': ({ id }) =>
      open((store) => {
        const layout = openReportLayout({ db: store.db }, id);
        return ok(layout === null ? null : { name: layout.name, request: layout.request });
      }),
    'reports.saveLayout': (input) =>
      open((store) => {
        const saved = saveReportLayout({ db: store.db, clock, random }, input);
        return ok(
          saved.ok
            ? { kind: 'saved', id: saved.value.id }
            : { kind: 'refused', reason: saved.error },
        );
      }),
    'reports.removeLayout': ({ id }) =>
      open((store) => ok({ removed: removeReportLayout({ db: store.db, clock, random }, id).ok })),
    'reports.export': async ({ request, format }) => {
      const store = books.store();
      if (!store.ok) return err(INTERNAL);
      const built = getReport({ db: store.value.db, clock }, request);
      if (!built.ok) return ok({ result: 'bad-period' as const });
      const business = books.state().businessName ?? '';
      const view = built.value;
      const name = `${view.title} ${view.periodText}`.replace(/[^A-Za-z0-9 –-]+/g, '-').trim();
      const result =
        format === 'csv'
          ? await exports.save('csv', `${name}.csv`, reportCsv(view, business))
          : await exports.save('pdf', `${name}.pdf`, reportHtml(view, business));
      return ok({ result });
    },
    'bank.checkReconcile': (input) =>
      open((store) => {
        const checked = checkReconcile({ db: store.db }, toReconcileInput(input));
        return ok(checked.ok ? checked.value : null);
      }),
    'bank.finishReconcile': (input) =>
      open((store) => {
        const done = finishReconcile({ db: store.db, clock, random }, toReconcileInput(input));
        return ok(
          done.ok
            ? { kind: 'done', lines: done.value.lines }
            : { kind: 'refused', reason: done.error },
        );
      }),
    'google.getStatus': async () => ok(await google.connection.status()),
    'google.connect': async () => {
      const connected = await google.connection.connect();
      return ok(
        connected.ok
          ? { kind: 'connected' as const, status: connected.value }
          : { kind: 'failed' as const, reason: connectProblem(connected.error) },
      );
    },
    'google.disconnect': async () => {
      const outcome = await google.connection.disconnect();
      // The panel's own Google sign-in goes too (spec 118).
      await sheetPanel.clearSession();
      return ok({ outcome });
    },
    'sheetPanel.getSetting': () => open((store) => ok({ on: sheetPanelOn({ db: store.db }) })),
    'sheetPanel.setSetting': ({ on }) =>
      open((store) => {
        setSheetPanelOn({ db: store.db }, on);
        if (!on) sheetPanel.close();
        return ok({ on });
      }),
    'sheetPanel.open': async ({ linkId, bounds }) => {
      const store = books.store();
      if (!store.ok) return err(INTERNAL);
      if (!sheetPanelOn({ db: store.value.db })) return ok({ result: 'off' as const });
      const link = getSheetLink(store.value.db, linkId);
      if (link === null) return ok({ result: 'failed' as const });
      return ok({ result: await sheetPanel.open(sheetUrl(link.fileId), bounds) });
    },
    'sheetPanel.move': ({ bounds }) => {
      sheetPanel.move(bounds);
      return ok({ moved: true as const });
    },
    'sheetPanel.close': () => {
      sheetPanel.close();
      return ok({ closed: true as const });
    },
    'sheets.publish': async ({ request, asNew }) => {
      const store = books.store();
      if (!store.ok) return err(INTERNAL);
      const status = await google.connection.status();
      return ok(
        await publishWorkbook(
          {
            ctx: { db: store.value.db, clock, random },
            api: google.api,
            connected: status.kind === 'connected',
          },
          request,
          { asNew },
        ),
      );
    },
    'sheets.preview': ({ request }) =>
      open((store) => {
        const preview = previewWorkbook({ db: store.db, clock }, request);
        return ok(
          preview.ok
            ? { kind: 'preview' as const, preview: preview.value }
            : { kind: 'refused' as const, reason: preview.error },
        );
      }),
    'sheets.people': async () => {
      const deps = await sharing();
      return deps.ok ? ok(await sharedPeople(deps.value)) : deps;
    },
    'sheets.share': async ({ linkId, email, role }) => {
      const deps = await sharing();
      if (!deps.ok) return deps;
      return ok(shareOutcome(await shareWorkbook(deps.value, linkId, email, role)));
    },
    'sheets.changeRole': async ({ linkId, permissionId, role }) => {
      const deps = await sharing();
      if (!deps.ok) return deps;
      return ok(shareOutcome(await changeRole(deps.value, linkId, permissionId, role)));
    },
    'sheets.unshare': async ({ linkId, permissionId }) => {
      const deps = await sharing();
      if (!deps.ok) return deps;
      return ok(shareOutcome(await stopSharing(deps.value, linkId, permissionId)));
    },
    'sheets.unshareAll': async ({ email }) => {
      const deps = await sharing();
      if (!deps.ok) return deps;
      const done = await stopSharingEverything(deps.value, email);
      return ok(
        done.ok
          ? { kind: 'done' as const, stopped: done.value.stopped }
          : { kind: 'refused' as const, reason: done.error },
      );
    },
    'sheets.readyFormulas': () =>
      ok(readyFormulas(clock.today()).map(({ name, what, formula }) => ({ name, what, formula }))),
    'invoices.list': () => open((store) => ok(invoicesView({ db: store.db, clock }))),
    'contacts.list': () => open((store) => ok(contactsView({ db: store.db, clock }))),
    'contacts.get': ({ id }) => open((store) => ok(contactPage({ db: store.db, clock }, id))),
    'contacts.add': (input) =>
      open((store) => {
        const added = addContactByHand({ db: store.db, clock, random }, input);
        return ok(
          added.ok
            ? { kind: 'saved', id: added.value.id }
            : { kind: 'refused', reason: added.error },
        );
      }),
    'contacts.edit': ({ id, ...input }) =>
      open((store) => {
        const edited = editContact({ db: store.db, clock, random }, id, input);
        return ok(edited.ok ? { kind: 'saved', id } : { kind: 'refused', reason: edited.error });
      }),
    'business.get': () => open((store) => ok(businessView({ db: store.db }))),
    'business.change': (input) =>
      open((store) => {
        const changed = changeBusinessSettings({ db: store.db, clock, random }, input);
        return ok(
          changed.ok
            ? { kind: 'saved', business: toBusinessView(changed.value) }
            : { kind: 'refused', reason: changed.error },
        );
      }),
    'bankAccounts.settings': () => open((store) => ok(bankAccountsSettings({ db: store.db }))),
    'bankAccounts.add': (input) =>
      open((store) => {
        const added = addBankAccount({ db: store.db, clock, random }, input);
        return ok(
          added.ok
            ? { kind: 'saved', id: added.value.id }
            : { kind: 'refused', reason: added.error },
        );
      }),
    'bankAccounts.rename': ({ id, name }) =>
      open((store) => {
        const renamed = renameBankAccount({ db: store.db, clock, random }, id, name);
        return ok(renamed.ok ? { kind: 'saved', id } : { kind: 'refused', reason: renamed.error });
      }),
    'bankAccounts.stop': ({ id }) =>
      open((store) => {
        const stopped = deactivateBankAccount({ db: store.db, clock, random }, id);
        return ok(stopped.ok ? { kind: 'saved', id } : { kind: 'refused', reason: stopped.error });
      }),
    'backup.status': async () => ok(await backups.status()),
    'backup.chooseFolder': async () => ok(await backups.chooseFolder()),
    'backup.turnOn': async () => ok(await backups.turnOn()),
    'backup.recoveryKey': async () => ok({ recoveryKey: await backups.recoveryKey() }),
    'backup.setDaily': ({ on }) => Promise.resolve(ok({ daily: backups.setDaily(on) })),
    'backup.now': async () => ok(await backups.backupNow()),
    'backup.list': () => Promise.resolve(ok(backups.list())),
    'backup.restore': async ({ name, recoveryKey }) => {
      const outcome = await backups.restore(name, recoveryKey);
      if (outcome.kind === 'restored') previews.clear();
      return ok({ outcome, state: books.state() });
    },
    'help.prefs': () => Promise.resolve(ok(system.helpPrefs())),
    'help.savePrefs': (prefs) => {
      system.saveHelpPrefs(prefs);
      return Promise.resolve(ok(prefs));
    },
    'appearance.get': () => Promise.resolve(ok({ appearance: system.appearance() })),
    'appearance.set': ({ appearance }) => {
      system.setAppearance(appearance);
      return Promise.resolve(ok({ appearance }));
    },
    'app.showBooksFolder': () => Promise.resolve(ok({ shown: system.showBooksFolder() })),
    'contacts.pairs': () => open((store) => ok(contactPairs({ db: store.db }))),
    'contacts.merge': ({ keepId, mergeId }) =>
      open((store) => {
        const merged = mergeContacts({ db: store.db, clock, random }, keepId, mergeId);
        return ok(
          merged.ok
            ? { kind: 'merged', moved: merged.value.moved }
            : { kind: 'refused', reason: merged.error },
        );
      }),
    'contacts.keepBoth': ({ firstId, secondId }) =>
      open((store) => {
        const kept = keepBoth({ db: store.db, clock, random }, firstId, secondId);
        return ok(kept.ok ? { kind: 'kept' } : { kind: 'refused', reason: kept.error });
      }),
    'invoices.chooseAndPreview': async () => {
      const path = await invoiceFiles.choose();
      if (path === null) return ok({ kind: 'cancelled' as const });
      const file = await invoiceFiles.read(path);
      if (!file.ok) {
        return ok({
          kind: 'refused' as const,
          field: 'file',
          problem:
            file.error === 'too-large'
              ? 'is too large for an invoice file'
              : file.error === 'empty'
                ? 'is empty'
                : 'could not be read',
        });
      }
      return previewInvoices(file.value);
    },
    'invoices.commit': ({ previewId }) =>
      open((store): Result<InvoiceCommitOutcome, BridgeError> => {
        const file = invoicePreviews.get(previewId);
        if (file === undefined) return ok({ kind: 'refused', reason: 'no-such-preview' });
        invoicePreviews.delete(previewId);
        const saved = commitInvoiceFile({ db: store.db, clock, random }, file.text);
        if (!saved.ok) {
          return ok({
            kind: 'refused',
            reason:
              saved.error === 'not-set-up'
                ? 'not-set-up'
                : saved.error === 'nothing-new'
                  ? 'nothing-new'
                  : 'no-such-preview',
          });
        }
        return ok({ kind: 'added', ...saved.value });
      }),
    'invoices.folder': () =>
      open((store) => {
        const folder = linkedInvoiceFolder({ db: store.db });
        return ok({ folderName: folder === null ? null : basename(folder) });
      }),
    'invoices.chooseFolder': async () => {
      const store = books.store();
      if (!store.ok) return err(INTERNAL);
      const folder = await invoiceFiles.chooseFolder();
      if (folder === null) {
        const current = linkedInvoiceFolder({ db: store.value.db });
        return ok({ folderName: current === null ? null : basename(current) });
      }
      setInvoiceFolder({ db: store.value.db }, folder);
      return ok({ folderName: basename(folder) });
    },
    'invoices.unlinkFolder': () =>
      open((store) => {
        setInvoiceFolder({ db: store.db }, null);
        return ok({ folderName: null });
      }),
    'invoices.checkFolder': async () => {
      const store = books.store();
      if (!store.ok) return err(INTERNAL);
      const folder = linkedInvoiceFolder({ db: store.value.db });
      if (folder === null) return ok({ kind: 'not-linked' as const });
      const folderName = basename(folder);
      const paths = await invoiceFiles.list(folder);
      if (paths === null) return ok({ kind: 'unreadable' as const, folderName });
      if (paths.length === 0) return ok({ kind: 'nothing-new' as const, folderName });
      const texts: string[] = [];
      for (const path of paths) {
        const file = await invoiceFiles.read(path);
        if (file.ok) texts.push(file.value.text);
      }
      const merged = mergeExchangeFiles(texts);
      const preview = previewInvoiceFile({ db: store.value.db }, merged.text, folderName);
      if (!preview.ok) return ok({ kind: 'unreadable' as const, folderName });
      if (preview.value.added.length + preview.value.replaced.length === 0) {
        return ok({ kind: 'nothing-new' as const, folderName });
      }
      const previewId = newId('pre', random);
      invoicePreviews.clear();
      invoicePreviews.set(previewId, { fileName: folderName, text: merged.text });
      return ok({ kind: 'waiting' as const, folderName, previewId, preview: preview.value });
    },
    'invoices.openPdf': async ({ id }) => {
      const store = books.store();
      if (!store.ok) return err(INTERNAL);
      const folder = linkedInvoiceFolder({ db: store.value.db });
      const invoice = getInvoice(store.value.db, id);
      const pdf = invoice?.pdf ?? null;
      if (folder === null || pdf === null) return ok({ opened: false });
      return ok({ opened: await invoiceFiles.openFile(join(folder, pdf)) });
    },
    'changes.check': async () => ok(await checkSheets()),
    'changes.list': () => open((store) => ok(changesView({ db: store.db, clock, random }))),
    'changes.count': () => open((store) => ok({ count: waitingCount({ db: store.db }) })),
    'changes.accept': ({ id }) =>
      open((store) => {
        const done = acceptChange({ db: store.db, clock, random }, id);
        return ok(
          done.ok ? { kind: 'done' as const } : { kind: 'refused' as const, reason: done.error },
        );
      }),
    'changes.reject': ({ id }) =>
      open((store) => {
        const done = rejectChange({ db: store.db, clock, random }, id);
        return ok(
          done.ok ? { kind: 'done' as const } : { kind: 'refused' as const, reason: done.error },
        );
      }),
    'app.copyText': ({ text }) => {
      clipboard.writeText(text);
      return ok({ copied: true });
    },
    'sheets.open': async ({ linkId }) => {
      const store = books.store();
      if (!store.ok) return err(INTERNAL);
      const link = getSheetLink(store.value.db, linkId);
      if (link === null) return ok({ opened: false });
      return ok({ opened: await google.openInBrowser(sheetUrl(link.fileId)) });
    },
  };
}
