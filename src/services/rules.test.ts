import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listAudit } from '@data/audit-repository';
import { sumLinesByAccount } from '@data/balance-queries';
import { countUnbalancedEntries } from '@data/journal-queries';
import { getReviewLine } from '@data/review-repository';
import { listRules } from '@data/rule-repository';
import type { RuleInput } from '@shared/rule-types';
import { getReviewView } from './list-review';
import { postLineToAccount, postLines } from './post-line';
import {
  moveRule,
  postByRules,
  removeRule,
  ruleOfferFor,
  saveRule,
  setRuleActive,
  testRule,
} from './rules';
import { day, reviewBooks } from './test-review-books';
import { undoPost } from './undo-post';

let books: ReturnType<typeof reviewBooks>;
beforeEach(() => {
  books = reviewBooks();
});
afterEach(() => {
  books.ctx.close();
});

const fuel = (over: Partial<RuleInput> = {}): RuleInput => ({
  name: 'Fuel',
  direction: 'out',
  bankAccountIds: [],
  matchMode: 'any',
  conditions: [
    { field: 'description', op: 'contains', text: 'AMPOL' },
    { field: 'description', op: 'contains', text: 'SHELL' },
  ],
  target: { kind: 'account', accountId: books.acc('6050'), taxCodeId: 'tax_gst' },
  payeeId: null,
  autoPost: false,
  ...over,
});

function save(rule: RuleInput) {
  const saved = saveRule(books.ctx, { id: null, rule });
  if (!saved.ok) throw new Error(saved.error);
  return saved.value;
}

const balance = (code: string) =>
  sumLinesByAccount(books.ctx.db, { from: null, to: day('2026-12-31') }).find(
    (t) => t.accountId === books.acc(code),
  )?.total ?? 0;

describe('saving rules (specs 078, 080)', () => {
  it('saves a rule last in the order, with an audit row', () => {
    const first = save(fuel());
    const second = save(fuel({ name: 'Second' }));
    expect([first.position, second.position]).toEqual([0, 1]);
    expect(listAudit(books.ctx.db, { table: 'rule' }).map((a) => a.kind)).toEqual([
      'rule.add',
      'rule.add',
    ]);
  });

  it('refuses a split that does not add to 100%, and a bank account as the category', () => {
    const split = (a: number, b: number): RuleInput =>
      fuel({
        target: {
          kind: 'split',
          parts: [
            { accountId: books.acc('6100'), taxCodeId: 'tax_gst', percentBp: a },
            { accountId: books.acc('3200'), taxCodeId: 'tax_nt', percentBp: b },
          ],
        },
      });
    expect(saveRule(books.ctx, { id: null, rule: split(7000, 2000) })).toEqual({
      ok: false,
      error: 'split-not-100',
    });
    expect(saveRule(books.ctx, { id: null, rule: split(7000, 3000) }).ok).toBe(true);
    expect(
      saveRule(books.ctx, {
        id: null,
        rule: fuel({ target: { kind: 'account', accountId: books.acc('1010'), taxCodeId: null } }),
      }),
    ).toEqual({ ok: false, error: 'bank-account-chosen' });
    expect(saveRule(books.ctx, { id: null, rule: fuel({ name: ' ' }) })).toEqual({
      ok: false,
      error: 'empty-name',
    });
  });

  it('changes a rule in place, and turns it off and on', () => {
    const rule = save(fuel());
    const changed = saveRule(books.ctx, { id: rule.id, rule: fuel({ name: 'Fuel and oil' }) });
    expect(changed).toMatchObject({
      ok: true,
      value: { id: rule.id, name: 'Fuel and oil', position: 0 },
    });
    expect(setRuleActive(books.ctx, rule.id, false)).toMatchObject({
      ok: true,
      value: { active: false },
    });
  });

  it('a new order is saved and changes which rule wins', () => {
    const broad = save(
      fuel({
        name: 'Anything at Ampol',
        conditions: [{ field: 'description', op: 'contains', text: 'AMPOL' }],
      }),
    );
    const narrow = save(
      fuel({
        name: 'Ampol Alexandria is travel',
        conditions: [{ field: 'description', op: 'is', text: 'AMPOL ALEXANDRIA' }],
        target: { kind: 'account', accountId: books.acc('6150'), taxCodeId: 'tax_gst' },
      }),
    );
    books.line('AMPOL ALEXANDRIA', -8820);
    expect(getReviewView(books.ctx).lines[0]?.suggestion?.rule?.id).toBe(broad.id);
    expect(moveRule(books.ctx, narrow.id, 0).ok).toBe(true);
    expect(listRules(books.ctx.db).map((r) => r.id)).toEqual([narrow.id, broad.id]);
    expect(getReviewView(books.ctx).lines[0]?.suggestion).toMatchObject({
      reason: 'from-your-rule',
      rule: { id: narrow.id },
    });
  });

  it('removes a rule and closes up the order', () => {
    const a = save(fuel({ name: 'A' }));
    const b = save(fuel({ name: 'B' }));
    expect(removeRule(books.ctx, a.id).ok).toBe(true);
    expect(listRules(books.ctx.db)).toMatchObject([{ id: b.id, position: 0 }]);
  });
});

describe('testing a rule (spec 080)', () => {
  it('counts the waiting and posted lines it fits', () => {
    books.line('AMPOL ALEXANDRIA', -8820);
    books.line('SHELL COLES EXPRESS', -6400);
    const posted = books.line('AMPOL MASCOT', -9100);
    books.line('BUNNINGS', -1000);
    books.line('AMPOL REFUND', 500);
    postLineToAccount(books.ctx, {
      lineId: posted,
      accountId: books.acc('6050'),
      taxCodeId: null,
      payeeId: null,
    });
    expect(testRule(books.ctx, fuel())).toMatchObject({ waiting: 2, posted: 1 });
    expect(testRule(books.ctx, fuel()).lines.map((l) => l.description)).toEqual([
      'AMPOL ALEXANDRIA',
      'SHELL COLES EXPRESS',
      'AMPOL MASCOT',
    ]);
  });
});

describe('posting by a rule (specs 079, 081)', () => {
  it('a line a rule fits is suggested "from your rule", and posting it uses the rule', () => {
    const rule = save(fuel());
    const id = books.line('AMPOL ALEXANDRIA', -8820);
    expect(getReviewView(books.ctx).lines[0]?.suggestion).toMatchObject({
      accountId: books.acc('6050'),
      reason: 'from-your-rule',
    });
    expect(
      postLines(books.ctx, [{ kind: 'rule', lineId: id, ruleId: rule.id, payeeId: null }]).posted,
    ).toEqual([id]);
    expect(balance('6050')).toBe(8018);
  });

  it('a split rule shares the line by percentage, to the cent', () => {
    const rule = save(
      fuel({
        name: 'Phone',
        conditions: [{ field: 'description', op: 'contains', text: 'SKYLINK' }],
        target: {
          kind: 'split',
          parts: [
            { accountId: books.acc('6100'), taxCodeId: 'tax_gst', percentBp: 7000 },
            { accountId: books.acc('3200'), taxCodeId: 'tax_nt', percentBp: 3000 },
          ],
        },
      }),
    );
    const id = books.line('SKYLINK MOBILE', -12900);
    postLines(books.ctx, [{ kind: 'rule', lineId: id, ruleId: rule.id, payeeId: null }]);
    expect(balance('6100')).toBe(8209);
    expect(balance('3200')).toBe(3870);
    expect(balance('2200')).toBe(821);
    expect(countUnbalancedEntries(books.ctx.db)).toBe(0);
  });

  it('"post by itself" posts the new lines of an import, with audit rows, and each can be undone', () => {
    save(fuel({ autoPost: true }));
    const a = books.line('AMPOL ALEXANDRIA', -8820);
    const b = books.line('SHELL COLES', -6400);
    const other = books.line('BUNNINGS', -1000);
    const result = postByRules(books.ctx, 'imp_4821');
    expect(result).toEqual({ posted: [a, b], skipped: [] });
    expect(getReviewLine(books.ctx.db, other)?.status).toBe('to-review');
    expect(
      listAudit(books.ctx.db, { table: 'statement_line', rowId: a }).map((x) => x.kind),
    ).toEqual(['line.post']);
    expect(undoPost(books.ctx, [a]).ok).toBe(true);
    expect(getReviewLine(books.ctx.db, a)?.status).toBe('to-review');
  });

  it('never posts in a locked period, and reports the line', () => {
    save(fuel({ autoPost: true }));
    books.ctx.db.prepare("UPDATE business SET lock_date = '2026-11-30'").run();
    const a = books.line('AMPOL ALEXANDRIA', -8820);
    expect(postByRules(books.ctx, 'imp_4821')).toEqual({
      posted: [],
      skipped: [{ lineId: a, reason: 'locked' }],
    });
  });

  it('skips and reports a rule whose account has been made inactive', () => {
    save(fuel({ autoPost: true }));
    books.ctx.db.prepare("UPDATE account SET active = 0 WHERE code = '6050'").run();
    const a = books.line('AMPOL ALEXANDRIA', -8820);
    expect(postByRules(books.ctx, 'imp_4821')).toEqual({
      posted: [],
      skipped: [{ lineId: a, reason: 'inactive-account' }],
    });
  });

  it('leaves a rule that does not post by itself, and lines of another import', () => {
    save(fuel());
    books.line('AMPOL ALEXANDRIA', -8820);
    expect(postByRules(books.ctx, 'imp_4821').posted).toEqual([]);
    save(fuel({ name: 'Auto', autoPost: true }));
    expect(postByRules(books.ctx, 'imp_7730').posted).toEqual([]);
  });
});

describe('"Do this every time?" (spec 082)', () => {
  const post = (id: string, code = '5000') =>
    postLineToAccount(books.ctx, {
      lineId: id,
      accountId: books.acc(code),
      taxCodeId: 'tax_gst',
      payeeId: null,
    });

  it('is offered once the same words have gone to the same account twice', () => {
    const first = books.line('BUNNINGS 4532', -1000);
    post(first);
    expect(ruleOfferFor(books.ctx, first)).toBeNull();
    const second = books.line('BUNNINGS 8812', -2000);
    post(second);
    expect(ruleOfferFor(books.ctx, second)).toEqual({
      words: 'BUNNINGS',
      rule: {
        name: 'Bunnings',
        direction: 'out',
        bankAccountIds: [],
        matchMode: 'all',
        conditions: [{ field: 'description', op: 'contains', text: 'BUNNINGS' }],
        target: { kind: 'account', accountId: books.acc('5000'), taxCodeId: 'tax_gst' },
        payeeId: null,
        autoPost: false,
      },
    });
  });

  it('is not offered when the two went to different accounts, or a rule already fits', () => {
    post(books.line('BUNNINGS', -1000));
    const second = books.line('BUNNINGS', -2000);
    post(second, '6110');
    expect(ruleOfferFor(books.ctx, second)).toBeNull();
    const third = books.line('BUNNINGS', -3000);
    post(third, '6110');
    expect(ruleOfferFor(books.ctx, third)).not.toBeNull();
    save(fuel({ conditions: [{ field: 'description', op: 'contains', text: 'BUNNINGS' }] }));
    expect(ruleOfferFor(books.ctx, third)).toBeNull();
  });

  it('is not offered for a line that is not posted', () => {
    expect(ruleOfferFor(books.ctx, books.line('BUNNINGS', -1000))).toBeNull();
  });
});
