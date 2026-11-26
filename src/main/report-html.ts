// A report as a page to print to PDF (spec 099): the business's name, the report, the period, the
// figures and its check, at A4, with page numbers added by the printer. No script, no outside file,
// no motion. Every text is escaped, so a bank description can never become markup.

import { formatCents } from '@shared/money';
import type { ReportCell, ReportView } from '@shared/reports';
import { percentText } from '@domain/report-calcs';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cell(c: ReportCell): string {
  switch (c.kind) {
    case 'money':
      return `<td class="n">${escapeHtml(formatCents(c.cents))}</td>`;
    case 'percent':
      return `<td class="n">${escapeHtml(percentText(c.bp))}</td>`;
    case 'text':
      return `<td>${escapeHtml(c.text)}</td>`;
    case 'flag':
      return `<td>${c.on ? 'Over' : ''}</td>`;
    case 'empty':
      return '<td></td>';
  }
}

// Plain black on white, the system font, tabular figures: a report to keep, not a screen.
const STYLE = `
@page { size: A4; margin: 18mm 16mm; }
body { font: 10pt -apple-system, "Helvetica Neue", Arial, sans-serif; color: #000; }
h1 { font-size: 15pt; margin: 0 0 2pt; }
.biz { font-size: 10pt; margin: 0; }
.period { font-size: 10pt; margin: 0 0 12pt; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 3pt 4pt; text-align: left; vertical-align: top; }
th { border-bottom: 1px solid #000; font-weight: 600; }
.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
tr.heading td { font-weight: 600; padding-top: 8pt; }
tr.total td { border-top: 1px solid #000; font-weight: 600; }
tr.grand td { border-top: 2px solid #000; font-weight: 700; }
.check, .note { margin-top: 10pt; font-size: 9pt; }
`;

export function reportHtml(view: ReportView, business: string): string {
  const head = `<tr><th>Account</th>${view.columns.map((c) => `<th class="n">${escapeHtml(c.label)}</th>`).join('')}</tr>`;
  const body = view.rows
    .map((row) => {
      const label = `${row.code === null ? '' : `${escapeHtml(row.code)} `}${escapeHtml(row.label)}`;
      return `<tr class="${row.kind}"><td>${label}</td>${row.cells.map(cell).join('')}</tr>`;
    })
    .join('');
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>${escapeHtml(view.title)}</title><style>${STYLE}</style></head><body>
<p class="biz">${escapeHtml(business)}</p><h1>${escapeHtml(view.title)}</h1>
<p class="period">${escapeHtml(view.periodText)}</p>
<table>${head}${body}</table>
${view.check === null ? '' : `<p class="check">${escapeHtml(view.check.text)}</p>`}
${view.note === null ? '' : `<p class="note">${escapeHtml(view.note)}</p>`}
</body></html>`;
}
