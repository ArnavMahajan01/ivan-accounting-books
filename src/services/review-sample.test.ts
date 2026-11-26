// The demo's path through To review: the invented Westpac files imported into the sample books.
// The files hold the sample books' own November movements, so each line is the bank's record of
// an entry already there, and matching must link them without counting anything twice.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAccountByCode } from '@data/account-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { listBankAccounts } from '@data/bank-account-repository';
import { countJournalEntries, countUnbalancedEntries } from '@data/journal-queries';
import { listRules } from '@data/rule-repository';
import { parseCalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import type { ReviewAction } from '@shared/views';
import { fixtureText, type WestpacFixture } from '../../tests/fixtures/westpac/fixtures';
import { commitImport, importPreviewView, previewImport } from './import-file';
import { getReviewView } from './list-review';
import { postLines } from './post-line';
import { checkReconcile, finishReconcile } from './reconcile';
import { postByRules, saveRule } from './rules';
import { buildSampleBooks } from './sample/build-sample-books';
import { createTestContext } from './test-context';

let ctx: ReturnType<typeof createTestContext>;
const today = (() => {
  const parsed = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('date');
  return parsed.value;
})();

const today20 = (() => {
  const parsed = parseCalendarDate('2026-11-20', 'YYYY-MM-DD');
  if (!parsed.ok) throw new Error('date');
  return parsed.value;
})();

beforeEach(() => {
  ctx = createTestContext();
  buildSampleBooks({ db: ctx.db }, today);
});
afterEach(() => {
  ctx.close();
});

function importFile(name: WestpacFixture) {
  const prepared = previewImport(ctx, { fileName: `${name}.ofx`, text: fixtureText(name) });
  if (!prepared.ok) throw new Error(prepared.error.reason);
  const saved = commitImport(ctx, prepared.value);
  if (!saved.ok) throw new Error(saved.error);
}

function bankBalance(code: string): number {
  const id = getAccountByCode(ctx.db, code)?.id;
  return (
    sumLinesByAccount(ctx.db, { from: null, to: today }).find((t) => t.accountId === id)?.total ?? 0
  );
}

describe('the sample books with the 2 to 13 November file', () => {
  it('offers every line a match with the entry already in the books', () => {
    importFile('business-one-2-13-nov-2026');
    const view = getReviewView(ctx);
    expect(view.lines).toHaveLength(11);
    expect(view.lines.filter((l) => l.match === null).map((l) => l.description)).toEqual([]);
    expect(view.counts).toMatchObject({ all: 11, suggested: 11, noSuggestion: 0 });
  });

  it('matching them all leaves the books exactly as they were', () => {
    const entries = countJournalEntries(ctx.db);
    const one = bankBalance('1000');
    importFile('business-one-2-13-nov-2026');
    const actions: ReviewAction[] = getReviewView(ctx).lines.map((l) => {
      if (l.match === null) throw new Error(`no match for ${l.description}`);
      return { kind: 'match', lineId: l.id, entryId: l.match.entryId };
    });
    const outcome = postLines(ctx, actions);
    expect(outcome.failed).toEqual([]);
    expect(countJournalEntries(ctx.db)).toBe(entries);
    expect(bankBalance('1000')).toBe(one);
    expect(countUnbalancedEntries(ctx.db)).toBe(0);
    expect(getReviewView(ctx).waiting).toBe(0);
  });

  it('the overlapping 9 to 20 November file then offers matches for its new lines too', () => {
    importFile('business-one-2-13-nov-2026');
    postLines(
      ctx,
      getReviewView(ctx).lines.flatMap((l): ReviewAction[] =>
        l.match === null ? [] : [{ kind: 'match', lineId: l.id, entryId: l.match.entryId }],
      ),
    );
    importFile('business-one-9-20-nov-2026');
    const view = getReviewView(ctx);
    expect(view.lines).toHaveLength(7);
    expect(view.lines.filter((l) => l.match === null).map((l) => l.description)).toEqual([]);
  });
});

describe('the Demo 4 files, after the earlier November files are matched', () => {
  function demo4(on: string) {
    const day = parseCalendarDate(on, 'YYYY-MM-DD');
    if (!day.ok) throw new Error(on);
    ctx.close();
    ctx = createTestContext();
    buildSampleBooks({ db: ctx.db }, day.value);
    for (const name of ['business-one-2-13-nov-2026', 'business-one-9-20-nov-2026'] as const) {
      importFile(name);
      postLines(
        ctx,
        getReviewView(ctx).lines.flatMap((l): ReviewAction[] =>
          l.match === null ? [] : [{ kind: 'match', lineId: l.id, entryId: l.match.entryId }],
        ),
      );
    }
    const prepared = previewImport(ctx, {
      fileName: 'demo-4.ofx',
      text: fixtureText('business-one-21-23-nov-2026-demo-4'),
    });
    if (!prepared.ok) throw new Error(prepared.error.reason);
    commitImport(ctx, prepared.value);
    importFile('cash-reserve-21-23-nov-2026-demo-4');
    return { view: getReviewView(ctx), preview: prepared.value };
  }

  // The sample books add entries up to the day they are made, so the demo could fall on any day.
  it.each(['2026-11-23', '2026-12-04', '2027-01-20'])(
    'made on %s: no line matches an entry, the transfer pairs, and the balance matches',
    (on) => {
      const { view } = demo4(on);
      expect(view.waiting).toBe(13);
      expect(view.lines.filter((l) => l.match !== null).map((l) => l.description)).toEqual([]);
      const transfer = view.lines.find((l) => l.description === 'TRANSFER TO CASH RESERVE 7730');
      expect(transfer?.transfer).toMatchObject({ bankAccountName: 'Business Cash Reserve ··7730' });
      // Lines like the ones matched earlier are suggested; the new shop is not.
      expect(
        view.lines.find((l) => l.description === 'AMPOL ALEXANDRIA')?.suggestion,
      ).toMatchObject({
        reason: 'same-as-last-time',
      });
      expect(
        view.lines.filter((l) => l.description === 'TOTAL TOOLS MASCOT').map((l) => l.suggestion),
      ).toEqual([null, null, null]);
    },
  );

  it('the closing balance follows on from the 9 to 20 November file', () => {
    const { preview } = demo4('2026-11-23');
    const view = importPreviewView(preview, 'pre_demo');
    expect(view.balance).toMatchObject({ kind: 'match', closing: 2123320 });
  });
});

describe('Demo 5: rules posting on import, and reconciling (folder 07)', () => {
  it('rules that post by themselves post the new lines they fit, and the rest wait', () => {
    const rules = listRules(ctx.db);
    const timber = rules.find((r) => r.name === 'Timberlink is always materials');
    if (timber === undefined) throw new Error('sample rule');
    saveRule(ctx, { id: timber.id, rule: { ...timber, autoPost: true } });
    const bunnings = saveRule(ctx, {
      id: null,
      rule: {
        name: 'Bunnings',
        direction: 'out',
        bankAccountIds: [],
        matchMode: 'all',
        conditions: [{ field: 'description', op: 'contains', text: 'BUNNINGS' }],
        target: {
          kind: 'account',
          accountId: timber.target.kind === 'account' ? timber.target.accountId : '',
          taxCodeId: 'tax_gst',
        },
        payeeId: null,
        autoPost: true,
      },
    });
    expect(bunnings.ok).toBe(true);
    const prepared = previewImport(ctx, {
      fileName: 'demo-5.ofx',
      text: fixtureText('business-one-24-26-nov-2026-demo-5'),
    });
    if (!prepared.ok) throw new Error(prepared.error.reason);
    const saved = commitImport(ctx, prepared.value);
    if (!saved.ok) throw new Error(saved.error);
    const byRules = postByRules(ctx, saved.value.batch.id);
    expect(byRules.posted).toHaveLength(3);
    expect(getReviewView(ctx).lines.map((l) => l.description)).toEqual([
      'DEPOSIT SMITH RENOVATIONS INV 1063',
      'WESTPAC ACCOUNT KEEPING FEE',
    ]);
    expect(countUnbalancedEntries(ctx.db)).toBe(0);
  });

  it('Business One reconciles to the 9 to 20 November statement with no difference', () => {
    importFile('business-one-9-20-nov-2026');
    const bank = listBankAccounts(ctx.db).find((b) => b.lastFour === '4821');
    if (bank === undefined) throw new Error('bank');
    const input = {
      bankAccountId: bank.id,
      statementDate: today20,
      statementBalance: asCents(1864235),
    };
    expect(checkReconcile(ctx, input)).toMatchObject({ ok: true, value: { difference: 0 } });
    expect(finishReconcile(ctx, input).ok).toBe(true);
  });

  it('a difference is explained only by lines the books do not hold yet', () => {
    importFile('business-one-2-13-nov-2026');
    importFile('business-one-9-20-nov-2026');
    importFile('business-one-21-23-nov-2026-demo-4');
    const bank = listBankAccounts(ctx.db).find((b) => b.lastFour === '4821');
    if (bank === undefined) throw new Error('bank');
    const day23 = parseCalendarDate('2026-11-23', 'YYYY-MM-DD');
    if (!day23.ok) throw new Error('date');
    const checked = checkReconcile(ctx, {
      bankAccountId: bank.id,
      statementDate: day23.value,
      statementBalance: asCents(2123320),
    });
    expect(checked).toMatchObject({
      ok: true,
      value: { difference: 259085, explainedByWaiting: true },
    });
    expect(checked.ok && checked.value.waiting).toHaveLength(12);
  });
});
