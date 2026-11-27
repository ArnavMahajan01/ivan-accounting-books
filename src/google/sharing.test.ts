import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseCalendarDate } from '@shared/dates';
import { plainRequest } from '@shared/reports';
import { buildSampleBooks } from '@services/sample/build-sample-books';
import { createTestContext } from '@services/test-context';
import { createFakeGoogle, type FakeGoogle } from './fake-google';
import { publishWorkbook } from './publish';
import {
  changeRole,
  sharedPeople,
  shareWorkbook,
  stopSharing,
  stopSharingEverything,
  type SharingDeps,
} from './sharing';

let ctx: ReturnType<typeof createTestContext>;
let google: FakeGoogle;
let deps: SharingDeps;
let pl: string;
let transactions: string;

beforeEach(async () => {
  ctx = createTestContext();
  const today = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!today.ok) throw new Error('date');
  buildSampleBooks({ db: ctx.db }, today.value);
  google = createFakeGoogle({ path: null, now: () => '2026-11-23T01:00:00.000Z' });
  await google.connection.connect();
  deps = { ctx, api: google.api, connected: true };
  const a = await publishWorkbook(
    deps,
    { kind: 'report', request: plainRequest('profit-and-loss') },
    { asNew: false },
  );
  const b = await publishWorkbook(
    deps,
    { kind: 'transactions', period: { choice: 'this-quarter', from: null, to: null } },
    { asNew: false },
  );
  if (a.kind !== 'published' || b.kind !== 'published') throw new Error('not published');
  pl = a.linkId;
  transactions = b.linkId;
});
afterEach(() => {
  ctx.close();
});

const fileOf = (title: string) => google.files().find((f) => f.title === title);

describe('sharing a workbook (spec 114)', () => {
  it('shares with that one person at exactly that role, never with a link', async () => {
    expect(await shareWorkbook(deps, transactions, ' Accountant@Example.com ', 'editor')).toEqual({
      ok: true,
      value: undefined,
    });
    const perms = fileOf('Transactions · Oct–Dec 2026')?.permissions;
    expect(perms?.map(({ email, role }) => ({ email, role }))).toEqual([
      { email: 'Accountant@Example.com', role: 'writer' },
    ]);
  });

  it('refuses something that is not an email address, and shares nothing', async () => {
    expect(await shareWorkbook(deps, pl, 'accountant at example', 'viewer')).toEqual({
      ok: false,
      error: 'bad-email',
    });
    expect(fileOf('Profit and loss · Oct–Dec 2026')?.permissions).toEqual([]);
  });

  it('shares nothing while Google is not connected', async () => {
    expect(
      await shareWorkbook({ ...deps, connected: false }, pl, 'a@example.com', 'viewer'),
    ).toEqual({ ok: false, error: 'not-connected' });
  });
});

describe('the Shared sheets page by person (spec 115)', () => {
  it('groups by person, and lists the workbooks only he can see', async () => {
    await shareWorkbook(deps, transactions, 'accountant@example.com', 'editor');
    await shareWorkbook(deps, pl, 'accountant@example.com', 'viewer');
    const view = await sharedPeople(deps);
    expect(view.problem).toBeNull();
    expect(view.people).toEqual([
      {
        email: 'accountant@example.com',
        // In the order the workbooks are listed: by period, then name.
        sheets: [
          expect.objectContaining({ title: 'Profit and loss · Oct–Dec 2026', role: 'viewer' }),
          expect.objectContaining({ title: 'Transactions · Oct–Dec 2026', role: 'editor' }),
        ],
      },
    ]);
    expect(view.onlyYou).toEqual([]);
  });

  it('changes a role in the row, and stops sharing one or everything with a person', async () => {
    await shareWorkbook(deps, transactions, 'accountant@example.com', 'editor');
    await shareWorkbook(deps, pl, 'accountant@example.com', 'viewer');
    let person = (await sharedPeople(deps)).people[0];
    const row = person?.sheets.find((s) => s.linkId === pl);
    if (row === undefined) throw new Error('no row');
    await changeRole(deps, pl, row.permissionId, 'commenter');
    person = (await sharedPeople(deps)).people[0];
    expect(person?.sheets.find((s) => s.linkId === pl)?.role).toBe('commenter');

    await stopSharing(deps, pl, row.permissionId);
    const after = await sharedPeople(deps);
    expect(after.people[0]?.sheets.map((s) => s.linkId)).toEqual([transactions]);
    expect(after.onlyYou.map((s) => s.linkId)).toEqual([pl]);

    expect(await stopSharingEverything(deps, 'ACCOUNTANT@example.com')).toEqual({
      ok: true,
      value: { stopped: 1 },
    });
    expect((await sharedPeople(deps)).people).toEqual([]);
  });

  it('says why it cannot show who can see what while Google is not connected', async () => {
    const view = await sharedPeople({ ...deps, connected: false });
    expect(view.problem).toBe('not-connected');
    expect(view.sheets).toHaveLength(2);
  });
});
