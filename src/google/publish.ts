// Publishing a report or the transactions to Google Sheets (specs 110, 111). The first time, the
// app's folder and a new workbook are made in his Drive; after that the same workbook is updated in
// place, writing only the app's own ranges, so the link, the sharing, and his own tabs and columns
// stay. A workbook deleted in Drive is noticed and offered "Publish as new". Nothing here changes
// the books: the link is a record of what was sent.

import { createHash } from 'node:crypto';
import { ok, type Result } from '@shared/result';
import type { PublishOutcome, PublishRefusal, PublishRequest } from '@shared/sheets';
import { planWorkbook } from '@domain/workbook';
import type { ServiceContext } from '@services/context';
import { workbookContent, type WorkbookContent } from '@services/sheet-content';
import {
  countChanges,
  findSheetLink,
  markMissing,
  recordPublish,
  startLink,
} from '@services/sheet-links';
import type { GoogleApi } from './google-api';
import type { GoogleFailure } from './oauth';

/** The folder in his Drive that holds every workbook the app makes. */
export const DRIVE_FOLDER = 'Accounting Books';

function refusal(failure: GoogleFailure): PublishRefusal {
  switch (failure) {
    case 'needs-sign-in':
      return 'needs-sign-in';
    case 'offline':
      return 'offline';
    case 'not-found':
    case 'failed':
      return 'failed';
  }
}

const refused = (reason: PublishRefusal): PublishOutcome => ({ kind: 'refused', reason });

function hashOf(content: WorkbookContent): string {
  return createHash('sha256').update(JSON.stringify(content.tabs)).digest('base64url').slice(0, 24);
}

/** Writes the content into a workbook: new, or the one already linked. */
async function writeInto(
  api: GoogleApi,
  fileId: string,
  content: WorkbookContent,
  isNew: boolean,
  previousRows: Readonly<Record<string, number>>,
): Promise<Result<readonly string[], GoogleFailure>> {
  const tabs = await api.tabs(fileId);
  if (!tabs.ok) return tabs;
  const plan = planWorkbook({ tabs: content.tabs, now: tabs.value, isNew, previousRows });
  const written = await api.write(fileId, plan);
  return written.ok ? ok(plan.kept) : written;
}

export interface PublishDeps {
  readonly ctx: ServiceContext;
  readonly api: GoogleApi;
  /** False when Google is not connected: nothing is tried. */
  readonly connected: boolean;
}

export async function publishWorkbook(
  { ctx, api, connected }: PublishDeps,
  request: PublishRequest,
  options: { readonly asNew: boolean },
): Promise<PublishOutcome> {
  const content = workbookContent(ctx, request);
  if (!content.ok) return refused(content.error);
  if (!connected) return refused('not-connected');
  const linked = findSheetLink(ctx.db, content.value.kind, content.value.from, content.value.to);

  if (linked !== null && !options.asNew) {
    const state = await api.fileState(linked.fileId);
    if (!state.ok && state.error !== 'not-found') return refused(refusal(state.error));
    if (!state.ok || state.value.trashed) {
      markMissing(ctx, linked);
      return { kind: 'missing', linkId: linked.id, title: linked.title };
    }
    const kept = await writeInto(api, linked.fileId, content.value, false, linked.tabRows);
    if (!kept.ok) return refused(refusal(kept.error));
    const changes = countChanges(linked.publishedValues, content.value.rows);
    const after = recordPublish(ctx, linked, content.value, hashOf(content.value), kept.value);
    return {
      kind: 'published',
      linkId: after.id,
      title: after.title,
      isNew: false,
      kept: kept.value,
      changes,
    };
  }

  const folder = await api.ensureFolder(DRIVE_FOLDER);
  if (!folder.ok) return refused(refusal(folder.error));
  const file = await api.createSpreadsheet(content.value.title, folder.value);
  if (!file.ok) return refused(refusal(file.error));
  // Linked before writing, so a write that fails half way is finished by the next publish.
  const link = startLink(ctx, content.value, file.value);
  const kept = await writeInto(api, file.value, content.value, true, {});
  if (!kept.ok) return refused(refusal(kept.error));
  const after = recordPublish(ctx, link, content.value, hashOf(content.value), kept.value);
  return {
    kind: 'published',
    linkId: after.id,
    title: after.title,
    isNew: true,
    kept: [],
    changes: null,
  };
}
