// The sheet check (spec 116): every two minutes while the app is open, and when the Accountant
// changes page opens. Read only. For each published Transactions workbook it asks Drive whether
// the file changed since it was last read; if so, it reads the columns the accountant may change
// and the Ref column from the app's tab (found by its marker), and keeps each difference from what
// was published as a waiting proposal. It never changes the books.

import { checkedTime, setCheckedTime } from '@data/accountant-change-repository';
import { blockA1 } from '@domain/workbook';
import {
  EDITABLE_TRANSACTION_COLUMNS,
  FIRST_TRANSACTION_ROW,
  REF_COLUMN,
} from '@domain/sheet-tabs';
import { recordReadBack, type ReadBackRow } from '@services/accountant-changes';
import type { ServiceContext } from '@services/context';
import { listSheetLinks, markMissing } from '@services/sheet-links';
import type { GoogleApi } from './google-api';
import type { GoogleFailure } from './oauth';

/** Rows past the published ones that are read too, in case he inserted some. */
const EXTRA_ROWS = 200;

export interface CheckResult {
  /** Workbooks read because they had changed. */
  readonly read: number;
  /** New proposals. */
  readonly added: number;
  /** Why the check stopped early: offline, or Google needs him to sign in again. */
  readonly stopped: GoogleFailure | null;
}

export async function checkSheets(ctx: ServiceContext, api: GoogleApi): Promise<CheckResult> {
  let read = 0;
  let added = 0;
  const links = listSheetLinks(ctx.db).filter(
    (l) => l.kind === 'transactions' && l.status === 'ok' && l.publishedAt !== null,
  );
  for (const link of links) {
    const state = await api.fileState(link.fileId);
    if (!state.ok) {
      if (state.error === 'not-found') {
        markMissing(ctx, link);
        continue;
      }
      return { read, added, stopped: state.error };
    }
    if (state.value.trashed) {
      markMissing(ctx, link);
      continue;
    }
    if (checkedTime(ctx.db, link.id) === state.value.modifiedTime) continue;
    const tabs = await api.tabs(link.fileId);
    if (!tabs.ok) return { read, added, stopped: tabs.error };
    const tab = tabs.value.find((t) => t.key === 'transactions');
    if (tab === undefined) {
      setCheckedTime(ctx.db, link.id, state.value.modifiedTime);
      continue;
    }
    const first = FIRST_TRANSACTION_ROW;
    const last = (link.tabRows.transactions ?? first) + EXTRA_ROWS;
    const range = blockA1(tab.title, EDITABLE_TRANSACTION_COLUMNS.account, first, REF_COLUMN, last);
    const values = await api.read(link.fileId, [range]);
    if (!values.ok) return { read, added, stopped: values.error };
    const rows: ReadBackRow[] = (values.value[0] ?? []).flatMap((cells, i) => {
      const at = (column: number) => cells[column - EDITABLE_TRANSACTION_COLUMNS.account] ?? '';
      const rowKey = at(REF_COLUMN).trim();
      return rowKey === ''
        ? []
        : [
            {
              rowKey,
              sheetRow: first + i + 1,
              account: at(EDITABLE_TRANSACTION_COLUMNS.account),
              gst: at(EDITABLE_TRANSACTION_COLUMNS.gst),
              note: at(EDITABLE_TRANSACTION_COLUMNS.note),
            },
          ];
    });
    added += recordReadBack(ctx, link, rows, state.value.modifiedBy);
    setCheckedTime(ctx.db, link.id, state.value.modifiedTime);
    read += 1;
  }
  return { read, added, stopped: null };
}
