import type { CalendarDate, Timestamp } from '@shared/dates';
import type { BasFrequency, GstBasis } from '@shared/kinds';

/** The business's settings. One per set of books. Client-specific values are data, never code. */
export interface Business {
  readonly name: string;
  /** The 11 digits, no spaces. */
  readonly abn: string;
  readonly gstRegistered: boolean;
  readonly gstBasis: GstBasis;
  readonly basFrequency: BasFrequency;
  /** Nothing may change on or before this day. Null until a period is locked (spec 096). */
  readonly lockDate: CalendarDate | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}
