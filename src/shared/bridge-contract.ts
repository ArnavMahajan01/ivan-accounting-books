// The only way the screens talk to the main process (context/code-standards.md, "Bridge").
// Each function has a name, a Zod schema for its input, and a result type. The main process
// validates every input against the schema before doing anything.

import { z } from 'zod';
import type { ReportRequest, ReportView } from './reports';
import type {
  FolderCheck,
  InvoiceCommitOutcome,
  InvoicePreviewOutcome,
  InvoicesView,
} from './invoices';
import {
  publishRequestSchema,
  type ConnectProblem,
  type GoogleStatus,
  type PublishOutcome,
  type AccountantChangesView,
  type ChangeDecision,
  type ChangesCheck,
  type PublishPreview,
  type ReadyFormulaView,
  type SharedPeopleView,
  type ShareOutcome,
  type ShareRefusal,
} from './sheets';
import { reportRequestSchema } from './report-request-schema';
import { GUIDE_ID } from './guide';
import type {
  ContactMergeOutcome,
  ContactPageView,
  ContactPairView,
  ContactSaveOutcome,
  ContactsView,
} from './contacts';
import {
  APPEARANCES,
  type Appearance,
  type BankAccountOutcome,
  type BackupNowOutcome,
  type BackupRow,
  type BackupStatus,
  type BankAccountsSettings,
  type BusinessChangeOutcome,
  type BusinessView,
  type HelpPrefs,
  type RestoreOutcome,
  type TurnOnOutcome,
  MAX_TAG_LENGTH,
  MAX_TAGS,
} from './settings';
import {
  ACCOUNT_TYPES,
  BAS_FREQUENCIES,
  CONTACT_KINDS,
  GST_BASES,
  SHARE_ROLES,
  type BooksProblem,
  type StoreProblem,
} from './kinds';
import {
  DESCRIPTION_OPS,
  RULE_DIRECTIONS,
  RULE_MATCH_MODES,
  type Rule,
  type RuleInput,
} from './rule-types';
import type { Result } from './result';
import {
  REVIEW_SHOWS,
  TRANSACTION_KINDS,
  TRANSACTION_PERIODS,
  type AccountsView,
  type BankView,
  type BooksState,
  type CommitOutcome,
  type HomeSummary,
  type AccountEditOutcome,
  type DrillView,
  type LayoutSummary,
  type LockOutcome,
  type QuarterCloseView,
  type MoveOutcome,
  type PostOutcome,
  type ReconcileOutcome,
  type ReconcileView,
  type ReviewAccountChoice,
  type RuleTestResult,
  type PreviewOutcome,
  type ReviewView,
  type SavePayeeOutcome,
  type UndoOutcome,
  type UndoPostOutcome,
  type TransactionDetail,
  type TransactionsPage,
} from './views';

const noInput = z.object({}).strict();
/** Where the sheet panel sits in the window, in window points (spec 118). */
const boundsSchema = z
  .object({
    x: z.number().int().min(0).max(20000),
    y: z.number().int().min(0).max(20000),
    width: z.number().int().min(1).max(20000),
    height: z.number().int().min(1).max(20000),
  })
  .strict();
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

/** A contact typed or changed by hand (specs 122, 123). Checked again by the service. */
export const contactInputSchema = z
  .object({
    name: z.string().max(120),
    kind: z.enum(CONTACT_KINDS),
    email: z.string().max(254),
    phone: z.string().max(40),
    abn: z.string().max(20),
    notes: z.string().max(1000),
  })
  .strict();

/** At most this many lines are posted, or undone, in one call. */
export const REVIEW_BATCH_MAX = 500;

export const reviewFiltersSchema = z
  .object({
    bankAccountId: idText('bnk').optional(),
    show: z.enum(REVIEW_SHOWS).optional(),
    search: z.string().max(100).optional(),
  })
  .strict();

export const reviewActionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('account'),
      lineId: idText('stl'),
      accountId: idText('acc').nullable(),
      taxCodeId: idText('tax').nullable(),
      payeeId: idText('con').nullable(),
    })
    .strict(),
  z.object({ kind: z.literal('match'), lineId: idText('stl'), entryId: idText('ent') }).strict(),
  z
    .object({
      kind: z.literal('rule'),
      lineId: idText('stl'),
      ruleId: idText('rul'),
      payeeId: idText('con').nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('transfer'),
      lineId: idText('stl'),
      otherBankAccountId: idText('bnk'),
    })
    .strict(),
]);

const splitPartSchema = z
  .object({
    accountId: idText('acc'),
    taxCodeId: idText('tax').nullable(),
    /** Positive cents, with any GST in it. */
    amount: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

const centsInput = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const signedCents = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);

export const ruleInputSchema = z
  .object({
    name: z.string().max(100),
    direction: z.enum(RULE_DIRECTIONS),
    bankAccountIds: z.array(idText('bnk')).max(50),
    matchMode: z.enum(RULE_MATCH_MODES),
    conditions: z
      .array(
        z.union([
          z
            .object({
              field: z.literal('description'),
              op: z.enum(DESCRIPTION_OPS),
              text: z.string().max(100),
            })
            .strict(),
          z
            .object({ field: z.literal('amount'), op: z.literal('equals'), amount: centsInput })
            .strict(),
          z
            .object({
              field: z.literal('amount'),
              op: z.literal('between'),
              min: centsInput,
              max: centsInput,
            })
            .strict(),
        ]),
      )
      .max(20),
    target: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('account'),
          accountId: idText('acc'),
          taxCodeId: idText('tax').nullable(),
        })
        .strict(),
      z
        .object({
          kind: z.literal('split'),
          parts: z
            .array(
              z
                .object({
                  accountId: idText('acc'),
                  taxCodeId: idText('tax').nullable(),
                  percentBp: z.number().int().min(0).max(10_000),
                })
                .strict(),
            )
            .min(1)
            .max(10),
        })
        .strict(),
    ]),
    payeeId: idText('con').nullable(),
    autoPost: z.boolean(),
  })
  .strict();

export const drillSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('account'),
      accountId: idText('acc'),
      side: z.enum(['natural', 'debit', 'credit']),
      from: dateText.nullable(),
      to: dateText,
    })
    .strict(),
  z
    .object({
      kind: z.literal('bas'),
      label: z.enum(['G1', '1A', '1B']),
      from: dateText,
      to: dateText,
    })
    .strict(),
]);

export const reconcileSchema = z
  .object({ bankAccountId: idText('bnk'), statementDate: dateText, statementBalance: signedCents })
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
  'review.list': { input: reviewFiltersSchema },
  /** Posts each line in its own transaction: with an account, as a match, or as a transfer. */
  'review.post': {
    input: z.object({ actions: z.array(reviewActionSchema).min(1).max(REVIEW_BATCH_MAX) }).strict(),
  },
  'review.split': {
    input: z
      .object({
        lineId: idText('stl'),
        parts: z.array(splitPartSchema).min(1).max(20),
        payeeId: idText('con').nullable(),
      })
      .strict(),
  },
  /** Matches a deposit to invoices it pays, with anything left over to an account (spec 129). */
  'review.matchInvoices': {
    input: z
      .object({
        lineId: idText('stl'),
        invoices: z
          .array(
            z
              .object({
                number: z.string().min(1).max(40),
                amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
              })
              .strict(),
          )
          .min(1)
          .max(50),
        leftover: z
          .object({ accountId: idText('acc'), taxCodeId: idText('tax').nullable() })
          .strict()
          .nullable(),
      })
      .strict(),
  },
  /** Takes back the last post: the lines it named. */
  'review.undo': {
    input: z.object({ lineIds: z.array(idText('stl')).min(1).max(REVIEW_BATCH_MAX) }).strict(),
  },
  'review.savePayee': {
    input: z.object({ lineId: idText('stl'), name: z.string().min(1).max(100) }).strict(),
  },
  'rules.list': { input: noInput },
  'rules.save': {
    input: z.object({ id: idText('rul').nullable(), rule: ruleInputSchema }).strict(),
  },
  'rules.setActive': { input: z.object({ id: idText('rul'), active: z.boolean() }).strict() },
  'rules.move': {
    input: z
      .object({ id: idText('rul'), toPosition: z.number().int().min(0).max(10_000) })
      .strict(),
  },
  'rules.remove': { input: z.object({ id: idText('rul') }).strict() },
  'rules.test': { input: z.object({ rule: ruleInputSchema }).strict() },
  /** After a post: a rule filled in from the line, when he has posted lines like it twice (spec 082). */
  'rules.offerFor': { input: z.object({ lineId: idText('stl') }).strict() },
  'transactions.move': {
    input: z
      .object({ entryIds: z.array(idText('ent')).min(1).max(500), accountId: idText('acc') })
      .strict(),
  },
  'accounts.add': {
    input: z
      .object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(100),
        type: z.enum(ACCOUNT_TYPES),
        parentId: idText('acc').nullable(),
        defaultTaxCodeId: idText('tax').nullable(),
      })
      .strict(),
  },
  'accounts.edit': {
    input: z
      .object({ id: idText('acc'), code: z.string().max(20), name: z.string().max(100) })
      .strict(),
  },
  'accounts.setActive': { input: z.object({ id: idText('acc'), active: z.boolean() }).strict() },
  'bank.checkReconcile': { input: reconcileSchema },
  'bank.finishReconcile': { input: reconcileSchema },
  'reports.get': { input: z.object({ request: reportRequestSchema }).strict() },
  'reports.lines': { input: z.object({ drill: drillSchema }).strict() },
  /** The BAS period to close: the one ending on `end`, or the last one that has ended. */
  'reports.close': { input: z.object({ end: dateText.nullable() }).strict() },
  'reports.lock': { input: z.object({ endDate: dateText }).strict() },
  'reports.layouts': { input: noInput },
  'reports.openLayout': { input: z.object({ id: idText('lay') }).strict() },
  'reports.saveLayout': {
    input: z
      .object({
        id: idText('lay').nullable(),
        name: z.string().min(1).max(80),
        request: reportRequestSchema,
      })
      .strict(),
  },
  'reports.removeLayout': { input: z.object({ id: idText('lay') }).strict() },
  /** Opens the Mac's save sheet, then writes the report there. */
  'reports.export': {
    input: z.object({ request: reportRequestSchema, format: z.enum(['csv', 'pdf']) }).strict(),
  },
  'review.undoPayee': {
    input: z.object({ contactId: idText('con'), words: z.string().min(1).max(1000) }).strict(),
  },
  'google.getStatus': { input: noInput },
  'google.connect': { input: noInput },
  'google.disconnect': { input: noInput },
  'sheets.publish': {
    input: z.object({ request: publishRequestSchema, asNew: z.boolean() }).strict(),
  },
  'sheets.open': { input: z.object({ linkId: idText('shl') }).strict() },
  'sheets.preview': { input: z.object({ request: publishRequestSchema }).strict() },
  'sheets.people': { input: noInput },
  'sheets.share': {
    input: z
      .object({ linkId: idText('shl'), email: z.string().max(254), role: z.enum(SHARE_ROLES) })
      .strict(),
  },
  'sheets.changeRole': {
    input: z
      .object({
        linkId: idText('shl'),
        permissionId: z.string().min(1).max(200),
        role: z.enum(SHARE_ROLES),
      })
      .strict(),
  },
  'sheets.unshare': {
    input: z.object({ linkId: idText('shl'), permissionId: z.string().min(1).max(200) }).strict(),
  },
  'sheets.unshareAll': { input: z.object({ email: z.string().min(3).max(254) }).strict() },
  'sheets.readyFormulas': { input: noInput },
  'sheetPanel.getSetting': { input: noInput },
  'sheetPanel.setSetting': { input: z.object({ on: z.boolean() }).strict() },
  'sheetPanel.open': { input: z.object({ linkId: idText('shl'), bounds: boundsSchema }).strict() },
  'sheetPanel.move': { input: z.object({ bounds: boundsSchema }).strict() },
  'sheetPanel.close': { input: noInput },
  'invoices.list': { input: noInput },
  'invoices.chooseAndPreview': { input: noInput },
  'invoices.commit': { input: z.object({ previewId: idText('pre') }).strict() },
  'invoices.folder': { input: noInput },
  'invoices.chooseFolder': { input: noInput },
  'invoices.unlinkFolder': { input: noInput },
  'invoices.checkFolder': { input: noInput },
  'invoices.openPdf': { input: z.object({ id: idText('inv') }).strict() },
  'contacts.list': { input: noInput },
  'contacts.get': { input: z.object({ id: idText('con') }).strict() },
  'contacts.add': { input: contactInputSchema },
  'contacts.edit': { input: contactInputSchema.extend({ id: idText('con') }).strict() },
  'business.get': { input: noInput },
  'business.change': {
    input: z
      .object({
        name: z.string().max(200),
        abn: z.string().max(20),
        gstBasis: z.enum(GST_BASES),
        basFrequency: z.enum(BAS_FREQUENCIES),
      })
      .strict(),
  },
  'bankAccounts.settings': { input: noInput },
  'bankAccounts.add': {
    input: z
      .object({
        name: z.string().max(120),
        bank: z.string().max(80),
        lastFour: z.string().max(4),
        ledgerAccountId: idText('acc'),
      })
      .strict(),
  },
  'bankAccounts.rename': {
    input: z.object({ id: idText('bnk'), name: z.string().max(120) }).strict(),
  },
  'bankAccounts.stop': { input: z.object({ id: idText('bnk') }).strict() },
  'backup.status': { input: noInput },
  /** Opens the folder chooser; only the folder's name comes back. */
  'backup.chooseFolder': { input: noInput },
  'backup.turnOn': { input: noInput },
  'backup.recoveryKey': { input: noInput },
  'backup.setDaily': { input: z.object({ on: z.boolean() }).strict() },
  'backup.now': { input: noInput },
  'backup.list': { input: noInput },
  'backup.restore': {
    input: z
      .object({
        name: z.string().min(1).max(200),
        recoveryKey: z.string().max(100).nullable(),
      })
      .strict(),
  },
  'help.prefs': { input: noInput },
  'help.savePrefs': {
    input: z
      .object({
        starred: z.array(z.string().regex(GUIDE_ID).max(80)).max(200),
        tags: z
          .array(
            z
              .object({
                name: z.string().trim().min(1).max(MAX_TAG_LENGTH),
                guides: z.array(z.string().regex(GUIDE_ID).max(80)).max(200),
              })
              .strict(),
          )
          .max(MAX_TAGS),
      })
      .strict(),
  },
  'appearance.get': { input: noInput },
  'appearance.set': { input: z.object({ appearance: z.enum(APPEARANCES) }).strict() },
  /** Asks for a folder, then writes every part of the books there as CSV (spec 139). */
  'export.all': { input: noInput },
  /** Shows the books' folder in Finder. The path itself never reaches the screens. */
  'app.showBooksFolder': { input: noInput },
  'contacts.pairs': { input: noInput },
  'contacts.merge': {
    input: z.object({ keepId: idText('con'), mergeId: idText('con') }).strict(),
  },
  'contacts.keepBoth': {
    input: z.object({ firstId: idText('con'), secondId: idText('con') }).strict(),
  },
  'changes.check': { input: noInput },
  'changes.list': { input: noInput },
  'changes.count': { input: noInput },
  'changes.accept': { input: z.object({ id: idText('chg') }).strict() },
  'changes.reject': { input: z.object({ id: idText('chg') }).strict() },
  /** Puts text on the Mac's clipboard: the screens may not reach it themselves. */
  'app.copyText': { input: z.object({ text: z.string().min(1).max(2000) }).strict() },
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
  'review.list': ReviewView;
  'review.post': PostOutcome;
  'review.split': PostOutcome;
  'review.matchInvoices': PostOutcome;
  'review.undo': UndoPostOutcome;
  'review.savePayee': SavePayeeOutcome;
  /** Whether the save was taken back. False when it had already gone. */
  'review.undoPayee': { readonly undone: boolean };
  'rules.list': RulesView;
  'rules.save':
    | { readonly kind: 'saved'; readonly rule: Rule }
    | { readonly kind: 'refused'; readonly reason: string };
  'rules.setActive': { readonly changed: boolean };
  'rules.move': { readonly changed: boolean };
  'rules.remove': { readonly removed: boolean };
  'rules.test': RuleTestResult;
  'rules.offerFor': {
    readonly offer: { readonly words: string; readonly rule: RuleInput } | null;
  };
  'transactions.move': MoveOutcome;
  'accounts.add': AccountEditOutcome;
  'accounts.edit': AccountEditOutcome;
  'accounts.setActive': AccountEditOutcome;
  /** Null when there is no such bank account. */
  'bank.checkReconcile': ReconcileView | null;
  'bank.finishReconcile': ReconcileOutcome;
  'reports.get':
    | { readonly kind: 'report'; readonly view: ReportView }
    | { readonly kind: 'refused'; readonly reason: 'bad-period' | 'not-set-up' };
  'reports.lines': DrillView;
  /** Null before the books are set up. */
  'reports.close': QuarterCloseView | null;
  'reports.lock': LockOutcome;
  'reports.layouts': readonly LayoutSummary[];
  /** Null when there is no such layout. */
  'reports.openLayout': { readonly name: string; readonly request: ReportRequest } | null;
  'reports.saveLayout':
    | { readonly kind: 'saved'; readonly id: string }
    | { readonly kind: 'refused'; readonly reason: 'empty-name' | 'name-in-use' | 'not-found' };
  'reports.removeLayout': { readonly removed: boolean };
  'reports.export': { readonly result: 'saved' | 'cancelled' | 'failed' | 'bad-period' };
  'google.getStatus': GoogleStatus;
  'google.connect':
    | { readonly kind: 'connected'; readonly status: GoogleStatus }
    | { readonly kind: 'failed'; readonly reason: ConnectProblem };
  /** `not-revoked`: forgotten on this Mac, but Google could not be reached to take the access back. */
  'google.disconnect': { readonly outcome: 'disconnected' | 'not-revoked' };
  'sheets.publish': PublishOutcome;
  /** False when there is no such workbook. */
  'sheets.open': { readonly opened: boolean };
  'sheets.preview':
    | { readonly kind: 'preview'; readonly preview: PublishPreview }
    | { readonly kind: 'refused'; readonly reason: 'bad-period' | 'not-set-up' };
  'sheets.people': SharedPeopleView;
  'sheets.share': ShareOutcome;
  'sheets.changeRole': ShareOutcome;
  'sheets.unshare': ShareOutcome;
  'sheets.unshareAll':
    | { readonly kind: 'done'; readonly stopped: number }
    | { readonly kind: 'refused'; readonly reason: ShareRefusal };
  'sheets.readyFormulas': readonly ReadyFormulaView[];
  'sheetPanel.getSetting': { readonly on: boolean };
  'sheetPanel.setSetting': { readonly on: boolean };
  /** `off`: the setting is off. `failed`: Google's page did not load; show the fallback. */
  'sheetPanel.open': { readonly result: 'opened' | 'failed' | 'off' };
  'sheetPanel.move': { readonly moved: true };
  'sheetPanel.close': { readonly closed: true };
  'invoices.list': InvoicesView;
  'invoices.chooseAndPreview': InvoicePreviewOutcome;
  'invoices.commit': InvoiceCommitOutcome;
  /** The linked folder's name, never its path; null when none is linked. */
  'invoices.folder': { readonly folderName: string | null };
  'invoices.chooseFolder': { readonly folderName: string | null };
  'invoices.unlinkFolder': { readonly folderName: null };
  'invoices.checkFolder': FolderCheck;
  'invoices.openPdf': { readonly opened: boolean };
  'contacts.list': ContactsView;
  /** Null when there is no contact with that id. */
  'contacts.get': ContactPageView | null;
  'contacts.add': ContactSaveOutcome;
  'contacts.edit': ContactSaveOutcome;
  'contacts.pairs': readonly ContactPairView[];
  'bankAccounts.settings': BankAccountsSettings;
  'bankAccounts.add': BankAccountOutcome;
  'bankAccounts.rename': BankAccountOutcome;
  'bankAccounts.stop': BankAccountOutcome;
  'backup.status': BackupStatus;
  'backup.chooseFolder': { readonly folderName: string | null };
  'backup.turnOn': TurnOnOutcome;
  /** Null when there is no key on this Mac yet. */
  'backup.recoveryKey': { readonly recoveryKey: string | null };
  'backup.setDaily': { readonly daily: boolean };
  'backup.now': BackupNowOutcome;
  'backup.list': readonly BackupRow[];
  /** With the books' new state, so the screens refresh after a restore. */
  'backup.restore': { readonly outcome: RestoreOutcome; readonly state: BooksState };
  'help.prefs': HelpPrefs;
  'help.savePrefs': HelpPrefs;
  'appearance.get': { readonly appearance: Appearance };
  'appearance.set': { readonly appearance: Appearance };
  'app.showBooksFolder': { readonly shown: boolean };
  /** The new folder's name, never its path; null when he cancelled. */
  'export.all': { readonly folderName: string | null; readonly files: number };
  /** Null before the books are set up. */
  'business.get': BusinessView | null;
  'business.change': BusinessChangeOutcome;
  'contacts.merge': ContactMergeOutcome;
  'contacts.keepBoth': ContactMergeOutcome;
  'changes.check': ChangesCheck;
  'changes.list': AccountantChangesView;
  /** Waiting changes: the count beside Accountant changes in the sidebar. */
  'changes.count': { readonly count: number };
  'changes.accept': ChangeDecision;
  'changes.reject': ChangeDecision;
  'app.copyText': { readonly copied: boolean };
}

/** The Rules page: every rule in order, and the choices its editor offers. */
export interface RulesView {
  readonly rules: readonly Rule[];
  readonly accounts: readonly ReviewAccountChoice[];
  readonly taxCodes: readonly {
    readonly id: string;
    readonly shortCode: string;
    readonly name: string;
  }[];
  readonly contacts: readonly { readonly id: string; readonly name: string }[];
  readonly bankAccounts: readonly { readonly id: string; readonly name: string }[];
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
