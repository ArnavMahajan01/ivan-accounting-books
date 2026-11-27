// The published workbooks in the books (specs 110, 111): recording a publish, and a workbook that
// has gone from Drive. Each write has its audit row. Never anything from inside a sheet.

import {
  findSheetLink,
  getSheetLink,
  insertSheetLink,
  listSheetLinks,
  updateSheetLink,
  type SheetLink,
} from '@data/sheet-link-repository';
import { newId } from '@shared/ids';
import type { ServiceContext } from './context';
import { recordAudit } from './audit';
import type { WorkbookContent } from './sheet-content';

export { findSheetLink, getSheetLink, listSheetLinks };

/** What the audit row keeps: which workbook and when, never the figures. */
function auditView(link: SheetLink) {
  return {
    fileId: link.fileId,
    kind: link.kind,
    title: link.title,
    publishedAt: link.publishedAt,
    status: link.status,
  };
}

/** The link for a workbook Google has just made, before anything is written into it. */
export function startLink(
  ctx: ServiceContext,
  content: WorkbookContent,
  fileId: string,
): SheetLink {
  const link: SheetLink = {
    id: newId('shl', ctx.random),
    fileId,
    kind: content.kind,
    title: content.title,
    request: content.pinned,
    from: content.from,
    to: content.to,
    publishedAt: null,
    publishedHash: null,
    tabRows: {},
    publishedValues: {},
    status: 'ok',
    keptTabs: [],
  };
  ctx.db.transaction(() => {
    const old = findSheetLink(ctx.db, content.kind, content.from, content.to);
    // A workbook that went missing is replaced by the new one: same report and period.
    if (old !== null) {
      updateSheetLink(
        ctx.db,
        { ...old, fileId, publishedAt: null, tabRows: {}, publishedValues: {}, status: 'ok' },
        ctx.clock.now(),
      );
      return;
    }
    insertSheetLink(ctx.db, link, ctx.clock.now());
  })();
  return findSheetLink(ctx.db, content.kind, content.from, content.to) ?? link;
}

/** After Google took every write: what was sent, so the next publish and the check can compare. */
export function recordPublish(
  ctx: ServiceContext,
  link: SheetLink,
  content: WorkbookContent,
  hash: string,
  keptTabs: readonly string[],
): SheetLink {
  const after: SheetLink = {
    ...link,
    title: content.title,
    request: content.pinned,
    publishedAt: ctx.clock.now(),
    publishedHash: hash,
    tabRows: Object.fromEntries(content.tabs.map((t) => [t.key, t.rows.length])),
    publishedValues: content.rows,
    status: 'ok',
    keptTabs,
  };
  ctx.db.transaction(() => {
    updateSheetLink(ctx.db, after, ctx.clock.now());
    recordAudit(ctx, {
      kind: 'sheet.publish',
      table: 'sheet_link',
      rowId: link.id,
      before: auditView(link),
      after: auditView(after),
    });
  })();
  return after;
}

/** The workbook was deleted in Drive, or the app can no longer open it. */
export function markMissing(ctx: ServiceContext, link: SheetLink): void {
  if (link.status === 'missing') return;
  const after: SheetLink = { ...link, status: 'missing' };
  ctx.db.transaction(() => {
    updateSheetLink(ctx.db, after, ctx.clock.now());
    recordAudit(ctx, {
      kind: 'sheet.missing',
      table: 'sheet_link',
      rowId: link.id,
      before: auditView(link),
      after: auditView(after),
    });
  })();
}

/** What changed since the last publish: rows added, changed and gone, by their keys. */
export function countChanges(
  before: SheetLink['publishedValues'],
  after: WorkbookContent['rows'],
): { added: number; changed: number; removed: number } {
  let added = 0;
  let changed = 0;
  for (const [key, row] of Object.entries(after)) {
    const old = before[key];
    if (old === undefined) added += 1;
    else if (old.hash !== row.hash) changed += 1;
  }
  const removed = Object.keys(before).filter((key) => !(key in after)).length;
  return { added, changed, removed };
}
