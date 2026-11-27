// A report request as the bridge takes it: the same request, with plain (not read-only) arrays and
// objects, as the contract's schema types them.

import type { ReportRequest } from '@shared/reports';

export function toBridge(request: ReportRequest) {
  return {
    ...request,
    period: { ...request.period },
    columns: { ...request.columns },
    rows: { ...request.rows },
    ownColumns: request.ownColumns.map((c) =>
      c.kind === 'notes' ? { ...c, notes: { ...c.notes } } : { ...c },
    ),
  };
}
