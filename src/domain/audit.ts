import type { Timestamp } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { AuditKind } from '@shared/kinds';

/** One line of the audit log: who changed what, with the value before and after. */
export interface AuditRecord {
  readonly id: Id<'aud'>;
  readonly changedAt: Timestamp;
  readonly kind: AuditKind;
  readonly table: string;
  readonly rowId: string;
  /** Null for something created. */
  readonly before: unknown;
  /** Null for something removed. */
  readonly after: unknown;
}
