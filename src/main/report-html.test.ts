import { describe, expect, it } from 'vitest';
import type { CalendarDate } from '@shared/dates';
import { asCents } from '@shared/money';
import type { ReportView } from '@shared/reports';
import { escapeHtml, reportHtml } from './report-html';

const view: ReportView = {
  title: 'Profit and loss',
  periodText: 'Oct–Dec 2026',
  rowHeading: 'Account',
  from: '2026-10-01' as CalendarDate,
  to: '2026-12-31' as CalendarDate,
  columns: [{ key: 'p0', label: 'Oct–Dec 2026' }],
  rows: [
    {
      kind: 'account',
      key: 'a',
      label: '<script>alert(1)</script>',
      code: '4000',
      cells: [{ kind: 'money', cents: asCents(-123450), drill: null }],
    },
    {
      kind: 'grand',
      key: 'net',
      label: 'Net profit',
      code: null,
      cells: [{ kind: 'percent', bp: null }],
    },
  ],
  check: { ok: true, text: 'Assets equal liabilities plus equity.' },
  note: null,
  locked: false,
};

describe('the PDF page (spec 099)', () => {
  it('escapes every text, so a description can never become markup', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
    const html = reportHtml(view, 'Harbour Lane Joinery & Co');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Harbour Lane Joinery &amp; Co');
  });

  it('shows amounts with a minus sign, "n/a" in words, the check, and A4', () => {
    const html = reportHtml(view, 'Harbour Lane Joinery Pty Ltd');
    expect(html).toContain('-$1,234.50');
    expect(html).toContain('n/a');
    expect(html).toContain('Assets equal liabilities plus equity.');
    expect(html).toContain('size: A4');
    expect(html).toContain("default-src 'none'");
  });
});
