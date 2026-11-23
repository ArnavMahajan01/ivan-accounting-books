import { appendAudit } from '@data/audit-repository';
import type { AuditKind } from '@shared/kinds';
import { newId } from '@shared/ids';
import type { ServiceContext } from './context';

/**
 * Adds one audit row. Call it inside the same transaction as the change it records, so the
 * change and its record are saved together or not at all.
 */
export function recordAudit(
  ctx: ServiceContext,
  change: {
    readonly kind: AuditKind;
    readonly table: string;
    readonly rowId: string;
    readonly before: unknown;
    readonly after: unknown;
  },
): void {
  appendAudit(ctx.db, {
    id: newId('aud', ctx.random),
    changedAt: ctx.clock.now(),
    ...change,
  });
}
