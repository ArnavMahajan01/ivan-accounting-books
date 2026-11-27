// The Reports area (folder 08, wireframe W06 Option 3 with W06a Option 4): My reports above the
// standard ones, then each report, the BAS worksheet, and Close the last quarter.

import { ChartColumn, Lock, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { REPORT_KINDS, REPORT_TITLES, plainRequest, type ReportKind } from '@shared/reports';
import type { LayoutSummary } from '@shared/views';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorMessage } from '../components/ErrorMessage';
import { Sheet } from '../components/Sheet';
import { PageToolbar } from '../layout/PageToolbar';
import { useBridgeQuery } from '../pages/use-bridge';
import { useHash } from '../use-route';
import { QuarterClose } from './QuarterClose';
import { ReportScreen } from './ReportScreen';
import { toBridge } from './to-bridge';
import { layoutHref, reportHref, reportsRouteFromHash } from './report-routes';
import './reports.css';

const WHAT_IT_SHOWS: Record<ReportKind, string> = {
  'profit-and-loss': 'Income, expenses and profit for a period',
  'balance-sheet': 'What the business owns and owes on a date',
  'trial-balance': "Every account's balance, for your accountant",
  bas: 'G1, 1A and 1B for a quarter',
};

const loadLayouts = () => bridge()['reports.layouts']({});

function ReportsList() {
  const { state, reload } = useBridgeQuery(loadLayouts, 'layouts');
  const [renaming, setRenaming] = useState<{ layout: LayoutSummary; name: string } | null>(null);
  const [removing, setRemoving] = useState<LayoutSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const layouts = state.status === 'ready' ? state.value : [];

  const rename = async () => {
    if (renaming === null) return;
    const api = bridge();
    const opened = await api['reports.openLayout']({ id: renaming.layout.id });
    if (!opened.ok || opened.value === null) return;
    const saved = await api['reports.saveLayout']({
      id: renaming.layout.id,
      name: renaming.name,
      request: toBridge(opened.value.request),
    });
    if (saved.ok && saved.value.kind === 'saved') {
      setNotice(`Renamed to "${renaming.name.trim()}".`);
      setRenaming(null);
      reload();
    } else setNotice('Another of your reports has that name, or it is empty.');
  };
  const remove = async (layout: LayoutSummary) => {
    setRemoving(null);
    const api = bridge();
    const result = await api['reports.removeLayout']({ id: layout.id });
    setNotice(
      result.ok && result.value.removed ? `Deleted "${layout.name}".` : 'It could not be deleted.',
    );
    reload();
  };

  return (
    <>
      <PageToolbar
        title="Reports"
        mainAction={
          <Button
            variant="main"
            icon={Lock}
            onClick={() => {
              window.location.hash = '#/reports/close';
            }}
          >
            Close the last quarter
          </Button>
        }
      />
      {notice !== null && (
        <p className="review__notice" role="status">
          {notice}
        </p>
      )}
      {state.status === 'failed' && (
        <ErrorMessage message="Your saved reports could not be read." onRetry={reload} />
      )}
      {layouts.length > 0 && (
        <section className="page-surface reports__section" aria-labelledby="my-reports">
          <h2 id="my-reports" className="reports__heading">
            My reports
          </h2>
          <ul className="reports__list">
            {layouts.map((l) => (
              <li key={l.id} className="reports__item">
                <a href={layoutHref(l.id)} className="reports__link">
                  {l.name}
                </a>
                <span className="reports__what">{REPORT_TITLES[l.report]}</span>
                <Button
                  size="small"
                  icon={Pencil}
                  aria-label={`Rename ${l.name}`}
                  onClick={() => {
                    setRenaming({ layout: l, name: l.name });
                  }}
                >
                  Rename
                </Button>
                <Button
                  size="small"
                  icon={Trash2}
                  aria-label={`Delete ${l.name}`}
                  onClick={() => {
                    setRemoving(l);
                  }}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="page-surface reports__section" aria-labelledby="standard-reports">
        <h2 id="standard-reports" className="reports__heading">
          Reports
        </h2>
        <ul className="reports__list">
          {REPORT_KINDS.map((kind) => (
            <li key={kind} className="reports__item">
              <ChartColumn aria-hidden="true" className="reports__icon" />
              <a href={reportHref(plainRequest(kind))} className="reports__link">
                {REPORT_TITLES[kind]}
              </a>
              <span className="reports__what">{WHAT_IT_SHOWS[kind]}</span>
            </li>
          ))}
        </ul>
      </section>
      {renaming !== null && (
        <Sheet
          title={`Rename ${renaming.layout.name}`}
          onClose={() => {
            setRenaming(null);
          }}
          actions={
            <>
              <Button
                onClick={() => {
                  setRenaming(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="main"
                disabled={renaming.name.trim() === ''}
                onClick={() => void rename()}
              >
                Rename
              </Button>
            </>
          }
        >
          <label className="rule-editor__field">
            <span>Name</span>
            <input
              className="review-field"
              value={renaming.name}
              onChange={(e) => {
                setRenaming({ ...renaming, name: e.target.value });
              }}
            />
          </label>
        </Sheet>
      )}
      {removing !== null && (
        <ConfirmDialog
          title={`Delete "${removing.name}"?`}
          change="Your saved columns and notes for it go. The books do not change, and the standard reports stay."
          confirmLabel="Delete report"
          destructive
          onConfirm={() => void remove(removing)}
          onCancel={() => {
            setRemoving(null);
          }}
        />
      )}
    </>
  );
}

function SavedReport({ id }: { readonly id: string }) {
  const [layout, setLayout] = useState<
    { name: string; request: Parameters<typeof reportHref>[0] } | null | 'missing'
  >(null);
  useEffect(() => {
    const api = bridge();
    void api['reports.openLayout']({ id }).then((result) => {
      setLayout(result.ok && result.value !== null ? result.value : 'missing');
    });
  }, [id]);
  if (layout === null) return <p aria-busy="true">Opening your report…</p>;
  if (layout === 'missing') return <ErrorMessage message="That report is no longer saved." />;
  return <ReportScreen key={id} initial={layout.request} layout={{ id, name: layout.name }} />;
}

export function ReportsPage() {
  const hash = useHash();
  const where = reportsRouteFromHash(hash);
  switch (where.kind) {
    case 'list':
      return <ReportsList />;
    case 'close':
      return <QuarterClose />;
    case 'layout':
      return <SavedReport id={where.id} />;
    case 'report':
      return <ReportScreen key={hash} initial={where.request} layout={null} />;
  }
}
