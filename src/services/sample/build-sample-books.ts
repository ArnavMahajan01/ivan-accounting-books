// Builds the sample books (spec 046): the invented business, its chart, two bank accounts, its
// customers and suppliers, and every entry from 1 July of the financial year up to today. Every
// entry is posted through `postEntry`, and corrections through `changeEntry`, so the books are
// built the way real ones are, with an audit row for each. The same date gives the same books,
// ids and timestamps included: ids come from a seeded source, and each entry is stamped with its
// own date instead of the time it was built.

import { getAccountByCode } from '@data/account-repository';
import { countJournalEntries } from '@data/journal-queries';
import { getTaxCodeByShortCode } from '@data/tax-code-repository';
import { splitInclusive } from '@domain/gst';
import { basPeriodOf } from '@domain/periods';
import { simpleEntry, type SimpleEntryTax } from '@domain/simple-entry';
import {
  compareDates,
  parseTimestamp,
  type CalendarDate,
  type Clock,
  type Timestamp,
} from '@shared/dates';
import { seededRandom, type Id } from '@shared/ids';
import { asCents } from '@shared/money';
import { addBankAccount } from '../add-bank-account';
import { addContact } from '../add-contact';
import type { ServiceContext } from '../context';
import { renameAccount } from '../manage-accounts';
import { changeEntry, postEntry } from '../post-journal';
import { saveRule } from '../rules';
import { setupBusiness } from '../setup-business';
import {
  continuationItems,
  curatedItems,
  financialYearStart,
  SAMPLE_BANK_ACCOUNTS,
  SAMPLE_BUSINESS,
  SAMPLE_CONTACTS,
  SAMPLE_RULES,
  SAMPLE_SEED,
  type SampleEntryItem,
  type SampleItem,
} from './sample-data';

export interface SampleBuildSummary {
  readonly entries: number;
  readonly contacts: number;
  /** The calendar year the financial year starts in: 2026 for FY 2026–27. */
  readonly financialYearStart: number;
  /** The date of the newest entry. */
  readonly lastEntryDate: CalendarDate;
}

function fail(what: string, detail: unknown): never {
  throw new Error(`The sample books could not be built: ${what} (${JSON.stringify(detail)})`);
}

function stamp(date: CalendarDate, time: string): Timestamp {
  const parsed = parseTimestamp(`${date}T${time}:00.000Z`);
  if (!parsed.ok) throw new RangeError(`Not a timestamp: ${date} ${time}`);
  return parsed.value;
}

/** What the entries owe the ATO for a quarter: the GST collected on sales, less the GST paid. */
export function quarterGstOwing(
  items: readonly SampleItem[],
  quarterStart: CalendarDate,
  quarterEnd: CalendarDate,
): number {
  let owing = 0;
  for (const item of items) {
    if (item.kind !== 'entry' || item.tax !== 'GST') continue;
    if (compareDates(item.date, quarterStart) < 0 || compareDates(item.date, quarterEnd) > 0)
      continue;
    const { gst } = splitInclusive(asCents(item.gross));
    if (item.direction === 'in') owing += gst;
    else owing -= gst;
  }
  return owing;
}

interface Operation {
  readonly date: CalendarDate;
  readonly run: () => void;
}

/**
 * Builds the sample books into an empty, migrated set of books. `today` decides how far they run:
 * the curated entries to 23 November, then a seeded continuation. Throws if anything does not
 * post, which would be a bug in the sample data.
 */
export function buildSampleBooks(
  ctx: Pick<ServiceContext, 'db'>,
  today: CalendarDate,
): SampleBuildSummary {
  const fy = financialYearStart(today);
  let now = stamp(`${String(fy)}-07-01` as CalendarDate, '01:00');
  const clock: Clock = { today: () => today, now: () => now };
  const sctx: ServiceContext = { db: ctx.db, clock, random: seededRandom(SAMPLE_SEED) };

  const business = setupBusiness(sctx, SAMPLE_BUSINESS);
  if (!business.ok) fail('business setup', business.error);

  const accountId = (code: string): Id<'acc'> => {
    const found = getAccountByCode(ctx.db, code);
    if (found === null) fail('missing account', code);
    return found.id;
  };
  const taxCode = (short: string): SimpleEntryTax => {
    const found = getTaxCodeByShortCode(ctx.db, short);
    if (found === null) fail('missing tax code', short);
    return { taxCodeId: found.id, treatment: found.treatment, rateBp: found.rateBp };
  };

  for (const bank of SAMPLE_BANK_ACCOUNTS) {
    const id = accountId(bank.code);
    const renamed = renameAccount(sctx, id, bank.name);
    if (!renamed.ok) fail('rename account', renamed.error);
    const added = addBankAccount(sctx, {
      name: bank.name,
      bank: 'Westpac',
      lastFour: bank.lastFour,
      ledgerAccountId: id,
    });
    if (!added.ok) fail('add bank account', added.error);
  }

  const contactIds = new Map<string, string>();
  for (const contact of SAMPLE_CONTACTS) {
    const added = addContact(sctx, {
      name: contact.name,
      kind: contact.kind,
      createdFrom: 'manual',
    });
    if (!added.ok) fail('add contact', added.error);
    contactIds.set(contact.name, added.value.id);
  }

  const items = [...curatedItems(fy), ...continuationItems(fy)]
    .filter((item) => compareDates(item.date, today) <= 0)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => compareDates(a.item.date, b.item.date) || a.index - b.index)
    .map(({ item }) => item);

  const gstAccount = accountId('2200');
  const moneyAccount = { one: accountId('1000'), reserve: accountId('1010') } as const;

  const entryInput = (
    item: SampleEntryItem,
    changes: { category?: string; date?: CalendarDate } = {},
  ) => {
    const tax = item.tax === null ? null : taxCode(item.tax);
    const payeeId = item.payee === null ? null : (contactIds.get(item.payee) ?? null);
    if (item.payee !== null && payeeId === null) fail('unknown payee', item.payee);
    return simpleEntry({
      date: changes.date ?? item.date,
      memo: item.memo,
      sourceKind: item.sourceKind,
      sourceId: null,
      payeeId,
      moneyAccountId: moneyAccount[item.bank],
      direction: item.direction,
      gross: asCents(item.gross),
      categoryAccountId: accountId(changes.category ?? item.category),
      tax,
      gstAccountId: gstAccount,
    });
  };

  const operations: Operation[] = [];
  const perDay = new Map<string, number>();
  // Each operation gets its own minute within its day, so the history reads in order.
  const stampFor = (date: CalendarDate, base: number): Timestamp => {
    const count = perDay.get(`${date}/${String(base)}`) ?? 0;
    perDay.set(`${date}/${String(base)}`, count + 1);
    const total = base * 60 + count;
    return stamp(
      date,
      `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
    );
  };

  for (const item of items) {
    if (item.kind === 'bas') {
      const owing = quarterGstOwing(items, item.quarterStart, item.quarterEnd);
      if (owing <= 0) continue;
      const period = basPeriodOf(item.quarterStart, 'quarterly');
      operations.push({
        date: item.date,
        run: () => {
          now = stampFor(item.date, 2);
          const posted = postEntry(
            sctx,
            simpleEntry({
              date: item.date,
              memo: `BAS ${period.label}`,
              sourceKind: 'bank-line',
              sourceId: null,
              payeeId: contactIds.get('Australian Taxation Office') ?? null,
              moneyAccountId: moneyAccount.one,
              direction: 'out',
              gross: asCents(owing),
              categoryAccountId: gstAccount,
              tax: null,
              gstAccountId: gstAccount,
            }),
          );
          if (!posted.ok) fail('post the BAS payment', posted.error);
        },
      });
      continue;
    }
    // A correction only happens once its day has come; before that the entry is posted correctly.
    const correction =
      item.correction !== undefined && compareDates(item.correction.changedOn, today) <= 0
        ? item.correction
        : undefined;
    const wrong = {
      ...(correction?.wasCategory === undefined ? {} : { category: correction.wasCategory }),
      ...(correction?.wasDate === undefined ? {} : { date: correction.wasDate }),
    };
    const postedOn = wrong.date ?? item.date;
    let postedId: string | null = null;
    operations.push({
      date: postedOn,
      run: () => {
        now = stampFor(postedOn, 2);
        const posted = postEntry(sctx, entryInput(item, wrong));
        if (!posted.ok) fail(`post ${item.memo}`, posted.error);
        postedId = posted.value.id;
      },
    });
    if (correction !== undefined) {
      operations.push({
        date: correction.changedOn,
        run: () => {
          if (postedId === null) fail('correct an entry that was not posted', item.memo);
          now = stampFor(correction.changedOn, 1);
          const changed = changeEntry(sctx, postedId, entryInput(item));
          if (!changed.ok) fail(`correct ${item.memo}`, changed.error);
        },
      });
    }
  }

  operations
    .map((operation, index) => ({ operation, index }))
    .sort((a, b) => compareDates(a.operation.date, b.operation.date) || a.index - b.index)
    .forEach(({ operation }) => {
      operation.run();
    });

  // His rules, as he might have made them in QuickBooks (spec 079). Made last, so the entries
  // above keep the ids they had before rules existed. None posts by itself: Demo 5 shows that.
  for (const rule of SAMPLE_RULES) {
    const saved = saveRule(sctx, {
      id: null,
      rule: {
        name: rule.name,
        direction: 'out',
        bankAccountIds: [],
        matchMode: 'all',
        conditions: [{ field: 'description', op: 'contains', text: rule.contains }],
        target:
          rule.split === undefined
            ? {
                kind: 'account',
                accountId: accountId(rule.account),
                taxCodeId: taxCode(rule.tax).taxCodeId,
              }
            : {
                kind: 'split',
                parts: rule.split.map((p) => ({
                  accountId: accountId(p.account),
                  taxCodeId: taxCode(p.tax).taxCodeId,
                  percentBp: p.percentBp,
                })),
              },
        payeeId: rule.payee === null ? null : (contactIds.get(rule.payee) ?? null),
        autoPost: false,
      },
    });
    if (!saved.ok) fail('add rule', saved.error);
  }

  const lastEntryDate = items.at(-1)?.date ?? today;
  return {
    entries: countJournalEntries(ctx.db),
    contacts: SAMPLE_CONTACTS.length,
    financialYearStart: fy,
    lastEntryDate,
  };
}
