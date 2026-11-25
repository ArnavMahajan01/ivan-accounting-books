// The words of the import sheet, in one place so they can be read and tested without drawing
// anything (guide-writing-rules.md: plain sentences, the thing he does first, no codes).

import { formatDateAU } from '@shared/dates';
import { asCents, formatCents } from '@shared/money';
import type {
  ImportBalanceView,
  ImportLineView,
  ImportPreview,
  ImportRefusal,
  RejectionCode,
} from '@shared/views';

export function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString('en-AU')} ${count === 1 ? one : many}`;
}

/** Why a file was turned away, and what to do about it. */
export function refusalText(reason: ImportRefusal, lastFour: string | null): string {
  switch (reason) {
    case 'empty':
      return 'This file is empty. Download the statement again from Westpac Online Banking.';
    case 'too-large':
      return 'This file is too large to be a bank statement, so it was not opened.';
    case 'unreadable-file':
      return 'The file could not be opened. Check that it is still where it was, then choose it again.';
    case 'unknown-format':
      return 'This does not look like a Westpac statement file. Download the statement as an OFX file, as the guide shows, and try again.';
    case 'no-account':
      return 'The file does not say which account it is for, so it cannot be imported.';
    case 'several-accounts':
      return 'This file has more than one account in it. Download the statement for one account at a time.';
    case 'not-aud':
      return 'This file is not in Australian dollars. Only Australian dollar accounts can be imported.';
    case 'no-transactions':
      return 'This file has no transactions in it, so there is nothing to import.';
    case 'unknown-account':
      return `This file is for an account ending ${lastFour ?? '????'}, which is not one of your bank accounts.`;
    case 'ambiguous-account':
      return `More than one of your accounts ends in ${lastFour ?? '????'}, so the app cannot tell which one this file is for.`;
    case 'inactive-account':
      return `This file is for an account ending ${lastFour ?? '????'}, which you have stopped using.`;
  }
}

/** A date as it was written in the file. A plain `20261131` is shown the Australian way. */
function dateAsWritten(value: string): string {
  const plain = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  return plain === null ? value : `${plain[3] ?? ''}/${plain[2] ?? ''}/${plain[1] ?? ''}`;
}

/** What was wrong with one line, as the end of a sentence about it: "has the date ..., which is not a real date". */
export function rejectionProblem(reason: RejectionCode, value: string | null): string {
  const shown = value ?? '';
  switch (reason) {
    case 'missing-date':
      return 'has no date';
    case 'not-a-date':
      return `has the date "${dateAsWritten(shown)}", which is not a date`;
    case 'impossible-date':
      return `has the date "${dateAsWritten(shown)}", which is not a real date`;
    case 'missing-amount':
      return 'has no amount';
    case 'not-an-amount':
      return `has the amount "${shown}", which is not an amount`;
    case 'too-many-decimals':
      return `has the amount "${shown}", which has fractions of a cent`;
    case 'amount-too-large':
      return `has the amount "${shown}", which is too large`;
    case 'zero-amount':
      return 'has an amount of nothing';
  }
}

export type RejectedLineView = Extract<ImportLineView, { status: 'rejected' }>;

/** "line 17 has the date "31/11/2026", which is not a real date." */
export function rejectionSentence(line: RejectedLineView): string {
  return `line ${String(line.fileLine)} ${rejectionProblem(line.reason, line.value)}`;
}

export function periodText(period: ImportPreview['period']): string {
  return period === null ? '' : `, from ${formatDateAU(period.from)} to ${formatDateAU(period.to)}`;
}

export interface BalanceMessage {
  /** `ok` is a tick, `warning` a mark, `info` neither. The words say it too. */
  readonly tone: 'ok' | 'warning' | 'info';
  readonly title: string;
  readonly detail: string;
}

export function balanceMessage(balance: ImportBalanceView, rejected: number): BalanceMessage {
  if (balance.kind === 'no-closing-balance') {
    return {
      tone: 'info',
      title: 'Closing balance not checked.',
      detail: 'This file does not say what the account held at the end.',
    };
  }
  const file = `File: ${formatCents(balance.closing)}${
    balance.closingDate === null ? '' : ` on ${formatDateAU(balance.closingDate)}`
  }.`;
  switch (balance.kind) {
    case 'match':
      return {
        tone: 'ok',
        title: 'Closing balance matches.',
        detail: `${file} Your books after import: ${formatCents(balance.closing)}.`,
      };
    case 'difference': {
      const size = formatCents(asCents(Math.abs(balance.difference)));
      const why = balance.explainedByRejected
        ? ` The difference, ${size}, is ${rejected === 1 ? 'the line' : 'the total of the lines'} that could not be read. You can still import the other lines. The balance will not match until ${rejected === 1 ? 'that line is' : 'those lines are'} in.`
        : ` The difference is ${size}. You can still import. A line may be missing from this file or from an earlier one.`;
      return {
        tone: 'warning',
        title: 'Closing balance does not match.',
        detail: `${file} Your books after import: ${formatCents(balance.expected)}.${why}`,
      };
    }
    case 'first-file':
      return {
        tone: 'info',
        title: 'First file for this account.',
        detail: `${file} Later files are checked against it.`,
      };
    case 'no-starting-point':
      return {
        tone: 'info',
        title: 'Closing balance not checked.',
        detail: `${file} There is no earlier balance to check it against.`,
      };
  }
}
