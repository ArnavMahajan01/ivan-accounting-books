// Reads an OFX statement, the form Westpac Online Banking exports for one account (research-notes.md).
// Both layouts of OFX are read the same way: the older text layout, whose tags are never closed
// (`<TRNAMT>-12.50`), and the XML layout, whose tags are. Pure, and it never throws (risk U1): a
// transaction that cannot be read is listed with the line it is on and the reason, and the rest
// are still read.
//
// Dates are taken as the bank wrote them, from the first eight digits. A time zone after the
// time, such as `[+11:AEDT]`, is ignored on purpose: the day on the statement is the bank's day,
// and shifting it to UTC would move it (CLAUDE.md, "Mistakes to avoid").

import { parseCalendarDate, compareDates, type CalendarDate } from '@shared/dates';
import { parseCents, type Cents } from '@shared/money';
import { err, ok, type Result } from '@shared/result';
import {
  MAX_STATEMENT_CHARS,
  type ParsedLine,
  type ParsedStatement,
  type ReadError,
  type RejectedLine,
  type RejectionReason,
} from './statement';

interface Token {
  readonly tag: string;
  readonly closing: boolean;
  readonly offset: number;
  /** The text after the tag, up to the next tag. */
  readonly value: string;
}

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9._]*)\s*>/g;

/** Splits the text into tags with the text that follows each. */
function tokenise(text: string): Token[] {
  const tokens: Token[] = [];
  const matches = [...text.matchAll(TAG)];
  for (const [index, match] of matches.entries()) {
    const end = match.index + match[0].length;
    const next = matches[index + 1];
    tokens.push({
      tag: (match[2] ?? '').toUpperCase(),
      closing: match[1] === '/',
      offset: match.index,
      value: decodeEntities(text.slice(end, next?.index ?? text.length).trim()),
    });
  }
  return tokens;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(/&(#\d{1,6}|#x[0-9a-fA-F]{1,5}|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body.startsWith('#x')
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** The line of the file an offset is on, counting from 1. */
function lineFinder(text: string): (offset: number) => number {
  const breaks: number[] = [];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) breaks.push(i);
  return (offset) => {
    let low = 0;
    let high = breaks.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((breaks[mid] ?? 0) < offset) low = mid + 1;
      else high = mid;
    }
    return low + 1;
  };
}

/** Whether the text is an OFX file, from its start. The file's name is never used. */
export function looksLikeOfx(text: string): boolean {
  const start = text
    .slice(0, 4000)
    .replace(/^\uFEFF/, '')
    .trimStart();
  return /^OFXHEADER\s*:/i.test(start) || /<OFX[\s>]/i.test(start);
}

type DateProblem = Extract<RejectionReason, 'missing-date' | 'not-a-date' | 'impossible-date'>;

function ofxDate(text: string | undefined): Result<CalendarDate, DateProblem> {
  if (text === undefined || text === '') return err('missing-date');
  const parsed = parseCalendarDate(text.slice(0, 8), 'YYYYMMDD');
  if (parsed.ok) return parsed;
  return err(parsed.error.code === 'impossible-date' ? 'impossible-date' : 'not-a-date');
}

type AmountProblem = Extract<
  RejectionReason,
  'missing-amount' | 'not-an-amount' | 'too-many-decimals' | 'amount-too-large'
>;

function ofxAmount(text: string | undefined): Result<Cents, AmountProblem> {
  if (text === undefined || text === '') return err('missing-amount');
  const parsed = parseCents(text.startsWith('+') ? text.slice(1) : text);
  if (parsed.ok) return parsed;
  const code = parsed.error.code;
  return err(
    code === 'too-many-decimals'
      ? 'too-many-decimals'
      : code === 'too-large'
        ? 'amount-too-large'
        : 'not-an-amount',
  );
}

/** Tags found inside one block, first one wins. */
function fieldsOf(tokens: readonly Token[]): Map<string, string> {
  const fields = new Map<string, string>();
  for (const token of tokens) {
    if (!token.closing && !fields.has(token.tag)) fields.set(token.tag, token.value);
  }
  return fields;
}

const STATEMENT_BLOCKS = new Set(['STMTRS', 'CCSTMTRS']);

export function readOfx(text: string): Result<ParsedStatement, ReadError> {
  if (text.trim() === '') return err({ code: 'empty' });
  if (text.length > MAX_STATEMENT_CHARS) return err({ code: 'too-large' });
  if (!looksLikeOfx(text)) return err({ code: 'unknown-format' });

  const tokens = tokenise(text);
  const statements = tokens.filter((t) => !t.closing && STATEMENT_BLOCKS.has(t.tag));
  if (statements.length === 0) return err({ code: 'unknown-format' });
  if (statements.length > 1) return err({ code: 'several-accounts' });

  const currency = tokens.find((t) => !t.closing && t.tag === 'CURDEF')?.value.toUpperCase();
  if (currency !== undefined && currency !== 'AUD') return err({ code: 'not-aud' });

  const accountAt = tokens.findIndex(
    (t) => !t.closing && (t.tag === 'BANKACCTFROM' || t.tag === 'CCACCTFROM'),
  );
  const accountBlock = accountAt === -1 ? [] : tokens.slice(accountAt + 1, accountAt + 8);
  const accountId = fieldsOf(accountBlock).get('ACCTID')?.replace(/\D/g, '') ?? '';
  if (accountId.length < 4) return err({ code: 'no-account' });
  const accountLastFour = accountId.slice(-4);

  const lineAt = lineFinder(text);
  const lines: ParsedLine[] = [];
  const rejected: RejectedLine[] = [];

  // Each transaction runs from its opening tag to the next opening, or to the end of the list.
  const starts = tokens.flatMap((t, i) => (!t.closing && t.tag === 'STMTTRN' ? [i] : []));
  for (const [n, start] of starts.entries()) {
    const stop = starts[n + 1] ?? tokens.length;
    const block: Token[] = [];
    for (let i = start + 1; i < stop; i += 1) {
      const token = tokens[i];
      if (token === undefined || token.tag === 'BANKTRANLIST' || token.tag === 'LEDGERBAL') break;
      if (token.closing && token.tag === 'STMTTRN') break;
      block.push(token);
    }
    const fields = fieldsOf(block);
    const position = n + 1;
    const line = lineAt(tokens[start]?.offset ?? 0);
    const name = fields.get('NAME') ?? '';
    const memo = fields.get('MEMO') ?? '';
    const description = (memo === '' || memo === name ? name : `${name} ${memo}`).trim();

    const rawDate = fields.get('DTPOSTED');
    const date = ofxDate(rawDate);
    const rawAmount = fields.get('TRNAMT');
    const amount = ofxAmount(rawAmount);
    const reject = (reason: RejectionReason, value: string | undefined): void => {
      rejected.push({
        position,
        line,
        reason,
        value: value === undefined || value === '' ? null : value,
        amount: amount.ok ? amount.value : null,
        description,
      });
    };
    if (!date.ok) {
      reject(date.error, rawDate);
    } else if (!amount.ok) {
      reject(amount.error, rawAmount);
    } else if (amount.value === 0) {
      reject('zero-amount', rawAmount);
    } else {
      const fitid = fields.get('FITID');
      lines.push({
        position,
        line,
        date: date.value,
        description,
        amount: amount.value,
        bankId: fitid === undefined || fitid === '' ? null : fitid,
        balance: null,
      });
    }
  }

  const listStart = ofxDate(tokens.find((t) => !t.closing && t.tag === 'DTSTART')?.value);
  const listEnd = ofxDate(tokens.find((t) => !t.closing && t.tag === 'DTEND')?.value);
  const dates = lines.map((l) => l.date).sort(compareDates);
  const balanceAt = tokens.findIndex((t) => !t.closing && t.tag === 'LEDGERBAL');
  const balanceFields =
    balanceAt === -1
      ? new Map<string, string>()
      : fieldsOf(tokens.slice(balanceAt + 1, balanceAt + 6));
  const closing = ofxAmount(balanceFields.get('BALAMT'));
  const closingDate = ofxDate(balanceFields.get('DTASOF'));

  return ok({
    format: 'ofx',
    accountLastFour,
    periodFrom: listStart.ok ? listStart.value : (dates[0] ?? null),
    periodTo: listEnd.ok ? listEnd.value : (dates.at(-1) ?? null),
    lines,
    rejected,
    closingBalance: closing.ok
      ? { amount: closing.value, date: closingDate.ok ? closingDate.value : null }
      : null,
  });
}
