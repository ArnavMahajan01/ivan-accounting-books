// Literal unions for every status and kind, so no code compares loose strings
// (context/code-standards.md). Later specs add their own kinds here.

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

/**
 * How GST treats a line. Code branches on this, never on a tax code's short name.
 * `outside-gst` is the app's own word for lines GST never touches, such as moving money between
 * the business's own accounts, or wages. They feed no BAS label.
 */
export const TAX_TREATMENTS = ['taxable', 'gst-free', 'input-taxed', 'outside-gst'] as const;
export type TaxTreatment = (typeof TAX_TREATMENTS)[number];

/** The labels of the simpler BAS (ATO, read 2026-11-23): sales including GST, GST on sales, GST on purchases. */
export const BAS_LABELS = ['G1', '1A', '1B'] as const;
export type BasLabel = (typeof BAS_LABELS)[number];

/** How the business accounts for GST (client question 3). A setting, never assumed in code. */
export const GST_BASES = ['cash', 'accrual'] as const;
export type GstBasis = (typeof GST_BASES)[number];

/** How often the business lodges its BAS (client question 5). */
export const BAS_FREQUENCIES = ['monthly', 'quarterly'] as const;
export type BasFrequency = (typeof BAS_FREQUENCIES)[number];

/**
 * What an audit log row records. Each service that changes the books adds its own kinds here.
 * The column has no CHECK list, because the list grows with every spec.
 */
export const AUDIT_KINDS = [
  'business.setup',
  'account.add',
  'account.rename',
  'account.change-code',
  'account.deactivate',
  'account.reactivate',
  'contact.add',
  'bank-account.add',
  'entry.post',
  'entry.change',
  'entry.remove',
] as const;
export type AuditKind = (typeof AUDIT_KINDS)[number];

/** Where a journal entry came from. A later spec that adds a source adds its kind here and in the table's CHECK. */
export const ENTRY_SOURCE_KINDS = [
  'manual',
  'bank-line',
  'invoice',
  'opening-balance',
  'accountant-change',
] as const;
export type EntrySourceKind = (typeof ENTRY_SOURCE_KINDS)[number];

/** Whether a contact is someone who pays him, someone he pays, or both (spec 071 adds saving them from bank lines). */
export const CONTACT_KINDS = ['customer', 'supplier', 'both'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/** How a contact came to exist. `bank-line` and `invoice` arrive with folders 06 and 10. */
export const CONTACT_SOURCES = ['manual', 'bank-line', 'invoice'] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** What the check on the books can find wrong (spec 043). No problems means the books are sound. */
export const BOOKS_PROBLEMS = ['not-open', 'integrity-failed', 'out-of-balance'] as const;
export type BooksProblem = (typeof BOOKS_PROBLEMS)[number];

/** The prefix of each kind of id (context/code-standards.md, "Ids"). Later specs add theirs here. */
export const ID_KINDS = ['acc', 'tax', 'con', 'bnk', 'ent', 'lin', 'aud', 'stl', 'imp'] as const;
export type IdKind = (typeof ID_KINDS)[number];

/** The access a person has to a shared Google Sheet (folder 09). */
export const SHARE_ROLES = ['viewer', 'commenter', 'editor'] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];

/** Why the books could not be opened. The data layer returns these, and the page shows them. */
export const STORE_PROBLEMS = [
  'cannot-open',
  'bad-migration-file-name',
  'duplicate-migration-version',
  'applied-migration-changed',
  'applied-migration-missing',
  'migration-failed',
  'pre-migration-copy-failed',
  'integrity-failed',
] as const;
export type StoreProblem = (typeof STORE_PROBLEMS)[number];

/**
 * Ends every switch over a literal union. If a new member is added and a case is missing,
 * this stops compiling. Reaching it at run time is a bug, so it throws.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
