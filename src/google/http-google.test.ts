import { describe, expect, it } from 'vitest';
import { asCents } from '@shared/money';
import { ok } from '@shared/result';
import type { CalendarDate } from '@shared/dates';
import { planWorkbook, type AppTab } from '@domain/workbook';
import { createHttpGoogle, rawValue, structureRequests, valueWrites } from './http-google';
import type { Fetch } from './oauth';

const TAB: AppTab = {
  key: 'transactions',
  title: 'Transactions',
  columns: 4,
  rows: [
    [
      { kind: 'text', text: 'Date' },
      { kind: 'text', text: 'Description' },
      { kind: 'text', text: 'Amount' },
      { kind: 'text', text: 'Account' },
    ],
    [
      { kind: 'date', date: '2026-10-15' as CalendarDate },
      { kind: 'text', text: '=HYPERLINK("http://evil.example","click")' },
      { kind: 'amount', cents: asCents(-38910) },
      { kind: 'text', text: 'Materials and supplies' },
    ],
  ],
  editable: { fromRow: 1, columns: [3] },
};

const plan = planWorkbook({
  tabs: [TAB],
  now: [{ sheetId: 0, title: 'Sheet1', key: null, protectionIds: [] }],
  isNew: true,
  previousRows: {},
});

describe('what is sent to Sheets', () => {
  it('writes every value as RAW: a description starting with = stays text', () => {
    const { raw, formulas } = valueWrites(plan);
    expect(raw).toEqual([
      {
        range: "'Transactions'!A1:D2",
        values: [
          ['Date', 'Description', 'Amount', 'Account'],
          [46310, '=HYPERLINK("http://evil.example","click")', -389.1, 'Materials and supplies'],
        ],
      },
    ]);
    expect(formulas).toEqual([]);
  });

  it('turns cents into an exact two-decimal number, and a date into Sheets’ day count', () => {
    expect(rawValue({ kind: 'amount', cents: asCents(123456) })).toBe(1234.56);
    expect(rawValue({ kind: 'amount', cents: asCents(-5) })).toBe(-0.05);
    expect(rawValue({ kind: 'date', date: '1899-12-31' as CalendarDate })).toBe(1);
  });

  it('marks the new tab, removes Google’s blank one, and protects all but the editable column', () => {
    const requests = JSON.stringify(structureRequests(plan));
    expect(requests).toContain(
      '"metadataKey":"accounting-books-tab","metadataValue":"transactions"',
    );
    expect(requests).toContain('"deleteSheet":{"sheetId":0}');
    const protect = structureRequests(plan).find(
      (r) => typeof r === 'object' && r !== null && 'addProtectedRange' in r,
    );
    expect(protect).toEqual({
      addProtectedRange: {
        protectedRange: {
          range: {
            sheetId: 1000,
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: 4,
          },
          description: 'accounting-books',
          warningOnly: false,
          unprotectedRanges: [
            {
              sheetId: 1000,
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 3,
              endColumnIndex: 4,
            },
          ],
        },
      },
    });
  });
});

describe('the HTTP calls', () => {
  function recorder(answer: (url: string) => Response) {
    const calls: { url: string; method: string; body: string | null; auth: string | null }[] = [];
    const fetchFn: Fetch = (url, init) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? init.body : null,
        auth: headers.get('Authorization'),
      });
      return Promise.resolve(answer(url));
    };
    return { calls, api: createHttpGoogle(fetchFn, () => Promise.resolve(ok('tok'))) };
  }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it('writes the values with valueInputOption=RAW, with the access token', async () => {
    const { calls, api } = recorder(() => json({}));
    expect(await api.write('file1', plan)).toEqual({ ok: true, value: undefined });
    expect(calls.map((c) => c.url)).toEqual([
      'https://sheets.googleapis.com/v4/spreadsheets/file1:batchUpdate',
      'https://sheets.googleapis.com/v4/spreadsheets/file1/values:batchUpdate',
    ]);
    expect(JSON.parse(calls[1]?.body ?? '{}')).toMatchObject({ valueInputOption: 'RAW' });
    expect(calls.every((c) => c.auth === 'Bearer tok')).toBe(true);
  });

  it('shares with one named person and asks Google to email them', async () => {
    const { calls, api } = recorder(() => json({ id: 'p1' }));
    await api.share('file1', 'accountant@example.com', 'writer');
    expect(calls[0]?.url).toBe(
      'https://www.googleapis.com/drive/v3/files/file1/permissions?sendNotificationEmail=true',
    );
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      type: 'user',
      role: 'writer',
      emailAddress: 'accountant@example.com',
    });
  });

  it('finds the app’s tabs by their marker', async () => {
    const { api } = recorder(() =>
      json({
        sheets: [
          {
            properties: { sheetId: 1000, title: 'Renamed by him' },
            developerMetadata: [{ metadataKey: 'accounting-books-tab', metadataValue: 'report' }],
            protectedRanges: [{ protectedRangeId: 9, description: 'accounting-books' }],
          },
          { properties: { sheetId: 5, title: 'My workings' } },
        ],
      }),
    );
    expect(await api.tabs('file1')).toEqual({
      ok: true,
      value: [
        { sheetId: 1000, title: 'Renamed by him', key: 'report', protectionIds: [9] },
        { sheetId: 5, title: 'My workings', key: null, protectionIds: [] },
      ],
    });
  });

  it('says not-found for a deleted file, sign in again for 401, and offline with no network', async () => {
    expect(await recorder(() => json({}, 404)).api.fileState('gone')).toEqual({
      ok: false,
      error: 'not-found',
    });
    expect(await recorder(() => json({}, 401)).api.fileState('x')).toEqual({
      ok: false,
      error: 'needs-sign-in',
    });
    const offline = createHttpGoogle(
      () => Promise.reject(new TypeError('fetch failed')),
      () => Promise.resolve(ok('tok')),
    );
    expect(await offline.fileState('x')).toEqual({ ok: false, error: 'offline' });
  });
});
