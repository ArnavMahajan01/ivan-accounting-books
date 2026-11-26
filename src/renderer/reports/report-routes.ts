// Where each report lives: `#/reports` (the list), `#/reports/close`, `#/reports/layout/<id>`, and
// `#/reports/<kind>?r=<request>` for a report, with its request in the address so Back works.

import { REPORT_KINDS, plainRequest, type ReportKind, type ReportRequest } from '@shared/reports';
import { reportRequestSchema } from '@shared/report-request-schema';

export const BAS_NOTE =
  'This worksheet is for you or your accountant to fill in the BAS. The app does not lodge anything with the ATO.';

export type ReportsRoute =
  | { readonly kind: 'list' }
  | { readonly kind: 'close' }
  | { readonly kind: 'layout'; readonly id: string }
  | { readonly kind: 'report'; readonly request: ReportRequest };

export function reportHref(request: ReportRequest): string {
  return `#/reports/${request.report}?r=${encodeURIComponent(JSON.stringify(request))}`;
}

export function layoutHref(id: string): string {
  return `#/reports/layout/${encodeURIComponent(id)}`;
}

/** The part of the Reports area an address names. A request that does not read is the plain one. */
export function reportsRouteFromHash(hash: string): ReportsRoute {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?');
  const [, second, third] = path.split('/');
  if (second === undefined || second === '') return { kind: 'list' };
  if (second === 'close') return { kind: 'close' };
  if (second === 'layout' && third !== undefined)
    return { kind: 'layout', id: decodeURIComponent(third) };
  if (!(REPORT_KINDS as readonly string[]).includes(second)) return { kind: 'list' };
  const plain = plainRequest(second as ReportKind);
  const text = new URLSearchParams(query).get('r');
  if (text === null) return { kind: 'report', request: plain };
  try {
    const parsed = reportRequestSchema.safeParse(JSON.parse(text));
    return {
      kind: 'report',
      request: parsed.success && parsed.data.report === second ? parsed.data : plain,
    };
  } catch {
    return { kind: 'report', request: plain };
  }
}
