// The preview before publishing (spec 112): the same tabs and cells the publish will send, from the
// same content, and whether it makes a new workbook or updates the one already published. It reads
// only the books and the stored link, so it works offline.

import { findSheetLink } from '@data/sheet-link-repository';
import { shownText } from '@domain/workbook';
import { err, ok, type Result } from '@shared/result';
import type { PublishPreview, PublishRequest } from '@shared/sheets';
import type { TodayContext } from './context';
import { workbookContent, type ContentError } from './sheet-content';

export function previewWorkbook(
  ctx: TodayContext,
  request: PublishRequest,
): Result<PublishPreview, ContentError> {
  const content = workbookContent(ctx, request);
  if (!content.ok) return err(content.error);
  const { value } = content;
  const link = findSheetLink(ctx.db, value.kind, value.from, value.to);
  return ok({
    title: value.title,
    target: link === null ? 'new' : link.status === 'missing' ? 'missing' : 'update',
    linkId: link?.id ?? null,
    publishedAt: link?.publishedAt ?? null,
    tabs: value.tabs.map((tab) => ({
      title: tab.title,
      columns: tab.columns,
      rows: tab.rows.map((row) =>
        Array.from({ length: tab.columns }, (_, c) => {
          const cell = row[c] ?? { kind: 'empty' as const };
          return { text: shownText(cell), figure: cell.kind === 'amount' || cell.kind === 'date' };
        }),
      ),
    })),
    kept: link?.keptTabs ?? [],
  });
}
