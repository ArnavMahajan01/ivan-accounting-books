// Sharing the published workbooks (specs 114, 115; risks G2, G5). Only with a named person, after
// he has seen the full email and role and confirmed on screen; never "anyone with the link". The
// Shared sheets page asks Drive who can see each workbook every time it opens, grouped by person.

import { z } from 'zod';
import { err, ok, type Result } from '@shared/result';
import type { ShareRole } from '@shared/kinds';
import type { SharedPeopleView, ShareRefusal } from '@shared/sheets';
import type { ServiceContext } from '@services/context';
import { getSheetLink, listSheetLinks, markMissing } from '@services/sheet-links';
import type { DriveRole, GoogleApi } from './google-api';
import type { GoogleFailure } from './oauth';

const TO_DRIVE: Record<ShareRole, DriveRole> = {
  viewer: 'reader',
  commenter: 'commenter',
  editor: 'writer',
};
const FROM_DRIVE: Record<DriveRole, ShareRole> = {
  reader: 'viewer',
  commenter: 'commenter',
  writer: 'editor',
};

/** One person's address, checked: the share dialog's email box is outside input. */
export const shareEmailSchema = z.email().max(254);

function refusal(failure: GoogleFailure): ShareRefusal {
  switch (failure) {
    case 'needs-sign-in':
      return 'needs-sign-in';
    case 'offline':
      return 'offline';
    case 'not-found':
      return 'missing';
    case 'failed':
      return 'failed';
  }
}

export interface SharingDeps {
  readonly ctx: ServiceContext;
  readonly api: GoogleApi;
  readonly connected: boolean;
}

/** Who can see what, grouped by person, and the workbooks only he can see. */
export async function sharedPeople({
  ctx,
  api,
  connected,
}: SharingDeps): Promise<SharedPeopleView> {
  const links = listSheetLinks(ctx.db);
  const sheets = links.map((l) => ({
    linkId: l.id,
    title: l.title,
    publishedAt: l.publishedAt,
    missing: l.status === 'missing',
    request: l.request,
  }));
  if (!connected) return { sheets, people: [], onlyYou: [], problem: 'not-connected' };
  const people = new Map<string, SharedPeopleView['people'][number]['sheets'][number][]>();
  const shared = new Set<string>();
  for (const link of links) {
    if (link.status === 'missing') continue;
    const permissions = await api.permissions(link.fileId);
    if (!permissions.ok) {
      if (permissions.error === 'not-found') {
        markMissing(ctx, link);
        continue;
      }
      return { sheets, people: [], onlyYou: [], problem: refusal(permissions.error) };
    }
    for (const p of permissions.value) {
      if (p.email === null || p.role === 'owner' || p.role === 'other') continue;
      const email = p.email.toLowerCase();
      const list = people.get(email) ?? [];
      list.push({
        linkId: link.id,
        title: link.title,
        publishedAt: link.publishedAt,
        permissionId: p.id,
        role: FROM_DRIVE[p.role],
      });
      people.set(email, list);
      shared.add(link.id);
    }
  }
  return {
    sheets,
    people: [...people.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([email, list]) => ({ email, sheets: list })),
    onlyYou: sheets.filter((s) => !s.missing && !shared.has(s.linkId)),
    problem: null,
  };
}

async function onLink<T>(
  { ctx, connected }: SharingDeps,
  linkId: string,
  act: (fileId: string) => Promise<Result<T, GoogleFailure>>,
): Promise<Result<T, ShareRefusal>> {
  if (!connected) return err('not-connected');
  const link = getSheetLink(ctx.db, linkId);
  if (link === null || link.status === 'missing') return err('missing');
  const done = await act(link.fileId);
  return done.ok ? ok(done.value) : err(refusal(done.error));
}

/** Shares one workbook with one named person, at the role he picked and confirmed. */
export function shareWorkbook(
  deps: SharingDeps,
  linkId: string,
  email: string,
  role: ShareRole,
): Promise<Result<void, ShareRefusal>> {
  const checked = shareEmailSchema.safeParse(email.trim());
  if (!checked.success) return Promise.resolve(err('bad-email'));
  return onLink(deps, linkId, (fileId) => deps.api.share(fileId, checked.data, TO_DRIVE[role]));
}

export function changeRole(
  deps: SharingDeps,
  linkId: string,
  permissionId: string,
  role: ShareRole,
): Promise<Result<void, ShareRefusal>> {
  return onLink(deps, linkId, (fileId) =>
    deps.api.changeRole(fileId, permissionId, TO_DRIVE[role]),
  );
}

export function stopSharing(
  deps: SharingDeps,
  linkId: string,
  permissionId: string,
): Promise<Result<void, ShareRefusal>> {
  return onLink(deps, linkId, (fileId) => deps.api.unshare(fileId, permissionId));
}

/** Stops sharing every workbook with one person. Says how many it could not reach. */
export async function stopSharingEverything(
  deps: SharingDeps,
  email: string,
): Promise<Result<{ stopped: number }, ShareRefusal>> {
  const view = await sharedPeople(deps);
  if (view.problem !== null) return err(view.problem);
  const person = view.people.find((p) => p.email === email.toLowerCase());
  if (person === undefined) return ok({ stopped: 0 });
  let stopped = 0;
  for (const sheet of person.sheets) {
    const done = await stopSharing(deps, sheet.linkId, sheet.permissionId);
    if (!done.ok) return err(done.error);
    stopped += 1;
  }
  return ok({ stopped });
}
