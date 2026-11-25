import { describe, expect, it } from 'vitest';
import { fixtureText } from '../../tests/fixtures/westpac/fixtures';
import { hugeOfx } from '../../tests/fixtures/westpac/huge-ofx';
import { MAX_STATEMENT_CHARS } from './statement';
import { readStatement } from './registry';

function read(text: string) {
  const result = readStatement(text);
  if (!result.ok) throw new Error(`could not read: ${result.error.code}`);
  return result.value;
}

describe('reading an OFX file', () => {
  it('reads the clean file: account, period, every line and the closing balance', () => {
    const statement = read(fixtureText('business-one-2-13-nov-2026'));
    expect(statement).toMatchObject({
      format: 'ofx',
      accountLastFour: '4821',
      periodFrom: '2026-11-02',
      periodTo: '2026-11-13',
      closingBalance: { amount: 1491745, date: '2026-11-13' },
      rejected: [],
    });
    expect(statement.lines).toHaveLength(11);
    expect(statement.lines[0]).toMatchObject({
      position: 1,
      date: '2026-11-02',
      description: 'WORKSHOP RENT MARSH PROPERTY GROUP',
      amount: -330000,
      bankId: '202611020001',
      balance: null,
    });
    expect(statement.lines[1]?.description).toBe('STAPLES & CO');
  });

  it('adds up so that the closing balance follows from the lines', () => {
    const statement = read(fixtureText('business-one-9-20-nov-2026'));
    const total = statement.lines.reduce((sum, l) => sum + l.amount, 0);
    const earlier = read(fixtureText('business-one-2-13-nov-2026'));
    const before9th = earlier.lines.filter((l) => l.date < '2026-11-09');
    // Both files describe the same account, so the later file's closing balance is the earlier
    // file's, less the lines of 2 to 8 November (not in the later file), plus the later lines.
    const sumOf = (list: readonly { amount: number }[]) => list.reduce((s, l) => s + l.amount, 0);
    expect(1491745 - sumOf(earlier.lines) + sumOf(before9th) + total).toBe(1864235);
    expect(statement.closingBalance?.amount).toBe(1864235);
  });

  it('reads a QBO file, which is OFX with the bank’s own extra tags in the sign-on part', () => {
    const text = fixtureText('business-one-2-13-nov-2026');
    const qbo = text.replace(
      '<LANGUAGE>ENG',
      '<LANGUAGE>ENG\n<FI>\n<ORG>WESTPAC\n<FID>9999\n</FI>\n<INTU.BID>9999\n<INTU.USERID>nobody',
    );
    expect(qbo).not.toBe(text);
    const parsed = read(qbo);
    expect(parsed.lines.map((l) => ({ ...l, line: 0 }))).toEqual(
      read(text).lines.map((l) => ({ ...l, line: 0 })),
    );
    expect(parsed).toMatchObject({ accountLastFour: '4821', closingBalance: { amount: 1491745 } });
  });

  it('reads the XML form of OFX the same way, including long dates and time zones', () => {
    const text = read(fixtureText('business-one-2-13-nov-2026'));
    const xml = read(fixtureText('business-one-2-13-nov-2026-xml'));
    expect(xml.lines.map((l) => ({ ...l, line: 0 }))).toEqual(
      text.lines.map((l) => ({ ...l, line: 0 })),
    );
    expect(xml).toMatchObject({
      accountLastFour: '4821',
      periodFrom: '2026-11-02',
      periodTo: '2026-11-13',
      closingBalance: { amount: 1491745, date: '2026-11-13' },
    });
  });

  it('gives one line error for the bad date and reads every other line', () => {
    const statement = read(fixtureText('business-one-16-23-nov-2026-bad-date'));
    expect(statement.lines).toHaveLength(9);
    expect(statement.rejected).toHaveLength(1);
    expect(statement.rejected[0]).toMatchObject({
      reason: 'impossible-date',
      value: '20261131',
      amount: -10000,
      description: 'ENGRAVING SERVICE',
      position: 7,
    });
    // The line number is the line of the file the transaction starts on.
    const lines = fixtureText('business-one-16-23-nov-2026-bad-date').split('\n');
    expect(lines[(statement.rejected[0]?.line ?? 0) - 1]).toBe('<STMTTRN>');
    expect(lines[(statement.rejected[0]?.line ?? 0) + 1]).toBe('<DTPOSTED>20261131');
  });

  it('reads a file with no transactions, and refuses an empty file', () => {
    expect(read(fixtureText('business-one-no-transactions'))).toMatchObject({
      accountLastFour: '4821',
      lines: [],
      rejected: [],
    });
    expect(readStatement(fixtureText('empty'))).toEqual({ ok: false, error: { code: 'empty' } });
    expect(readStatement('   \n  ')).toEqual({ ok: false, error: { code: 'empty' } });
  });

  it('reads the other account from its last four digits', () => {
    expect(read(fixtureText('cash-reserve-jul-nov-2026'))).toMatchObject({
      accountLastFour: '7730',
      closingBalance: { amount: 2500000 },
    });
    expect(read(fixtureText('other-account-16-nov-2026')).accountLastFour).toBe('9999');
  });

  it('reads 10,000 lines quickly, and refuses a file over the limit before reading it', () => {
    const big = hugeOfx(10_000);
    expect(big.length).toBeLessThan(MAX_STATEMENT_CHARS);
    const started = performance.now();
    const statement = read(big);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(statement.lines).toHaveLength(10_000);
    expect(statement.rejected).toHaveLength(0);
    expect(readStatement(`${big}${' '.repeat(MAX_STATEMENT_CHARS)}`)).toEqual({
      ok: false,
      error: { code: 'too-large' },
    });
  });
});

describe('what is not an OFX statement', () => {
  it.each([
    ['plain text', 'This is not a bank file.'],
    ['a CSV file', 'Date,Narrative,Debit,Credit,Balance\n01/11/2026,COFFEE,4.50,,100.00\n'],
    ['JSON', '{"transactions": []}'],
    ['OFX with no statement in it', 'OFXHEADER:100\nDATA:OFXSGML\n\n<OFX>\n</OFX>\n'],
  ])('is %s: not recognised', (_name, text) => {
    expect(readStatement(text)).toEqual({ ok: false, error: { code: 'unknown-format' } });
  });

  it('is refused when it has no account number to match, or the wrong currency', () => {
    const base = fixtureText('business-one-2-13-nov-2026');
    expect(readStatement(base.replace('<ACCTID>100004821', '<ACCTID>12'))).toEqual({
      ok: false,
      error: { code: 'no-account' },
    });
    expect(readStatement(base.replace('<CURDEF>AUD', '<CURDEF>USD'))).toEqual({
      ok: false,
      error: { code: 'not-aud' },
    });
  });

  it('is refused when it holds two accounts, because one account at a time is imported', () => {
    const base = fixtureText('business-one-2-13-nov-2026');
    const twice = base.replace(
      '</BANKMSGSRSV1>',
      `${base.slice(base.indexOf('<STMTRS>'), base.indexOf('</STMTRS>') + 9)}\n</BANKMSGSRSV1>`,
    );
    expect(readStatement(twice)).toEqual({ ok: false, error: { code: 'several-accounts' } });
  });
});

describe('transactions that cannot be read', () => {
  const wrap = (transactions: string, balance = '') =>
    `OFXHEADER:100\n<OFX>\n<STMTRS>\n<CURDEF>AUD\n<BANKACCTFROM>\n<ACCTID>100004821\n</BANKACCTFROM>\n<BANKTRANLIST>\n${transactions}</BANKTRANLIST>\n${balance}</STMTRS>\n</OFX>\n`;
  const one = (fields: string) => `<STMTTRN>\n${fields}</STMTTRN>\n`;

  it.each([
    ['a date that is missing', '<TRNAMT>-5.00\n<FITID>1\n<NAME>A\n', 'missing-date'],
    ['a date that is not a date', '<DTPOSTED>31/11/2026\n<TRNAMT>-5.00\n<NAME>A\n', 'not-a-date'],
    [
      'a day that does not exist',
      '<DTPOSTED>20260230\n<TRNAMT>-5.00\n<NAME>A\n',
      'impossible-date',
    ],
    ['an amount that is missing', '<DTPOSTED>20261101\n<NAME>A\n', 'missing-amount'],
    [
      'an amount that is not a number',
      '<DTPOSTED>20261101\n<TRNAMT>abc\n<NAME>A\n',
      'not-an-amount',
    ],
    [
      'an amount with fractions of a cent',
      '<DTPOSTED>20261101\n<TRNAMT>-5.005\n<NAME>A\n',
      'too-many-decimals',
    ],
    ['an amount of nothing', '<DTPOSTED>20261101\n<TRNAMT>0.00\n<NAME>A\n', 'zero-amount'],
    [
      'an amount too big to hold',
      '<DTPOSTED>20261101\n<TRNAMT>99999999999999999999\n<NAME>A\n',
      'amount-too-large',
    ],
  ])('lists %s with its reason and keeps the rest', (_what, fields, reason) => {
    const good = one('<DTPOSTED>20261102\n<TRNAMT>-1.50\n<FITID>ok\n<NAME>FINE\n');
    const statement = read(wrap(`${good}${one(fields)}${good.replace('ok', 'ok2')}`));
    expect(statement.lines.map((l) => l.bankId)).toEqual(['ok', 'ok2']);
    expect(statement.rejected).toMatchObject([{ reason, position: 2 }]);
  });

  it('accepts a plus sign, whole dollars, and a thousands comma', () => {
    const statement = read(
      wrap(
        one('<DTPOSTED>20261101\n<TRNAMT>+12.30\n<NAME>A\n') +
          one('<DTPOSTED>20261101\n<TRNAMT>-7\n<NAME>B\n') +
          one('<DTPOSTED>20261101\n<TRNAMT>1,234.50\n<NAME>C\n'),
      ),
    );
    expect(statement.lines.map((l) => l.amount)).toEqual([1230, -700, 123450]);
  });

  it('turns entities into text, joins a memo to the name, and keeps a missing id as null', () => {
    const statement = read(
      wrap(
        one('<DTPOSTED>20261101\n<TRNAMT>-5.00\n<NAME>A &amp; B &#39;X&#39;\n<MEMO>Ref 12\n') +
          one('<DTPOSTED>20261101\n<TRNAMT>-5.00\n<NAME>SAME\n<MEMO>SAME\n'),
      ),
    );
    expect(statement.lines.map((l) => l.description)).toEqual(["A & B 'X' Ref 12", 'SAME']);
    expect(statement.lines.map((l) => l.bankId)).toEqual([null, null]);
  });

  it('does not say a closing balance it cannot read, and falls back to the lines for the period', () => {
    const statement = read(
      wrap(
        one('<DTPOSTED>20261105\n<TRNAMT>-5.00\n<NAME>A\n') +
          one('<DTPOSTED>20261101\n<TRNAMT>-5.00\n<NAME>B\n'),
        '<LEDGERBAL>\n<BALAMT>lots\n<DTASOF>20261105\n</LEDGERBAL>\n',
      ),
    );
    expect(statement.closingBalance).toBeNull();
    expect(statement).toMatchObject({ periodFrom: '2026-11-01', periodTo: '2026-11-05' });
  });

  it('never throws, whatever the text, including broken and hostile text', () => {
    const hostile = [
      '<OFX><STMTRS><BANKACCTFROM><ACCTID>12345<STMTTRN><DTPOSTED>',
      `OFXHEADER:100\n<OFX>${'<STMTTRN>'.repeat(5000)}`,
      '\u0000\u0001<OFX>￿',
      `<OFX><STMTRS><ACCTID>${'9'.repeat(10000)}`,
      '<!DOCTYPE x [<!ENTITY a "b">]><OFX>&a;</OFX>',
    ];
    for (const text of hostile) {
      expect(() => readStatement(text)).not.toThrow();
    }
  });
});
