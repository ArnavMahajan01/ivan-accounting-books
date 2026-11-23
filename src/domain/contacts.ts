import type { Timestamp } from '@shared/dates';
import type { Id } from '@shared/ids';
import type { ContactKind, ContactSource } from '@shared/kinds';

/** A customer or supplier. A journal line's `payeeId` is a contact's id. */
export interface Contact {
  readonly id: Id<'con'>;
  /** Unique, ignoring capitals. */
  readonly name: string;
  readonly kind: ContactKind;
  readonly active: boolean;
  readonly createdFrom: ContactSource;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}
