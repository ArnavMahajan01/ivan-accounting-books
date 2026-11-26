// His own reports (spec 101): a report request saved with a name, listed above the standard ones.
// Saving, renaming and deleting each have an audit row. The figures are never saved.

import {
  deleteLayout,
  getLayout,
  getLayoutByName,
  insertLayout,
  listLayouts,
  updateLayout,
  type ReportLayout,
} from '@data/report-layout-repository';
import { newId } from '@shared/ids';
import type { ReportRequest } from '@shared/reports';
import { err, ok, type Result } from '@shared/result';
import type { LayoutSummary } from '@shared/views';
import { recordAudit } from './audit';
import type { ReadContext, ServiceContext } from './context';

export type LayoutError = 'empty-name' | 'name-in-use' | 'not-found';

export function listReportLayouts(ctx: ReadContext): LayoutSummary[] {
  return listLayouts(ctx.db).map((l) => ({ id: l.id, name: l.name, report: l.request.report }));
}

export function openReportLayout(ctx: ReadContext, id: string): ReportLayout | null {
  return getLayout(ctx.db, id);
}

/** Saves a new layout, or changes one (its name, its request, or both). */
export function saveReportLayout(
  ctx: ServiceContext,
  input: { readonly id: string | null; readonly name: string; readonly request: ReportRequest },
): Result<ReportLayout, LayoutError> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') return err('empty-name');
  return ctx.db.transaction((): Result<ReportLayout, LayoutError> => {
    const holder = getLayoutByName(ctx.db, name);
    if (holder !== null && holder.id !== input.id) return err('name-in-use');
    const now = ctx.clock.now();
    if (input.id === null) {
      const layout: ReportLayout = { id: newId('lay', ctx.random), name, request: input.request };
      insertLayout(ctx.db, layout, now);
      recordAudit(ctx, {
        kind: 'layout.add',
        table: 'report_layout',
        rowId: layout.id,
        before: null,
        after: layout,
      });
      return ok(layout);
    }
    const existing = getLayout(ctx.db, input.id);
    if (existing === null) return err('not-found');
    const layout: ReportLayout = { ...existing, name, request: input.request };
    updateLayout(ctx.db, layout, now);
    recordAudit(ctx, {
      kind: 'layout.change',
      table: 'report_layout',
      rowId: layout.id,
      before: existing,
      after: layout,
    });
    return ok(layout);
  })();
}

export function removeReportLayout(ctx: ServiceContext, id: string): Result<void, 'not-found'> {
  return ctx.db.transaction((): Result<void, 'not-found'> => {
    const existing = getLayout(ctx.db, id);
    if (existing === null) return err('not-found');
    deleteLayout(ctx.db, id);
    recordAudit(ctx, {
      kind: 'layout.remove',
      table: 'report_layout',
      rowId: id,
      before: existing,
      after: null,
    });
    return ok(undefined);
  })();
}
