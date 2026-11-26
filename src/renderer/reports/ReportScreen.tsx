// One report on screen (specs 090 to 095, 098 to 102): the period, the figures (each opening its
// lines), Export CSV and PDF, and for the profit and loss, Customise and Save as my report.
// Publish to Google Sheets waits for folder 09, so it is shown greyed with the reason.

import { ChevronLeft, Download, FileText, Settings2, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Drill, PeriodChoice, ReportRequest } from '@shared/reports';
import { PERIOD_CHOICES } from '@shared/reports';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Sheet } from '../components/Sheet';
import { PageToolbar } from '../layout/PageToolbar';
import { useBridgeQuery } from '../pages/use-bridge';
import { routeHref } from '../routes';
import { CustomisePanel } from './CustomisePanel';
import { DrillSheet } from './DrillSheet';
import { NewColumnSheet } from './NewColumnSheet';
import { ReportTable } from './ReportTable';
import { PERIOD_WORDS } from './ready-layouts';

const EXPORT_WORDS = {
  saved: 'Saved.',
  cancelled: null,
  failed: 'The file could not be saved. Try another place.',
  'bad-period': 'Check the dates: the first day must not be after the last day.',
} as const;

export function ReportScreen({
  initial,
  layout,
}: {
  readonly initial: ReportRequest;
  /** Set when the report is one of his saved ones. */
  readonly layout: { readonly id: string; readonly name: string } | null;
}) {
  const [request, setRequest] = useState(initial);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [customising, setCustomising] = useState(false);
  const [newColumn, setNewColumn] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveProblem, setSaveProblem] = useState<string | null>(null);

  // Notes are typed straight into the table; the figures are asked for again only when the rest changes.
  const figuresKey = useMemo(
    () =>
      JSON.stringify({
        ...request,
        ownColumns: request.ownColumns.map((c) => (c.kind === 'notes' ? { ...c, notes: {} } : c)),
      }),
    [request],
  );
  const { state, reload } = useBridgeQuery(
    () => bridge()['reports.get']({ request: toBridge(request) }),
    figuresKey,
  );
  const view = state.status === 'ready' && state.value.kind === 'report' ? state.value.view : null;
  const isPl = request.report === 'profit-and-loss';
  const periodChoices: readonly PeriodChoice[] =
    request.report === 'bas' ? ['this-quarter', 'last-quarter', 'custom'] : PERIOD_CHOICES;

  const exportAs = async (format: 'csv' | 'pdf') => {
    const api = bridge();
    const result = await api['reports.export']({ request: toBridge(request), format });
    setNotice(
      result.ok ? EXPORT_WORDS[result.value.result] : 'The file could not be saved. Try again.',
    );
  };

  const saveLayout = async () => {
    if (saving === null) return;
    const api = bridge();
    const result = await api['reports.saveLayout']({
      id: layout?.id ?? null,
      name: saving,
      request: toBridge(request),
    });
    if (!result.ok) setSaveProblem('That could not be saved. Try again.');
    else if (result.value.kind === 'saved') {
      setSaving(null);
      setNotice(`Saved as "${saving.trim()}" under My reports.`);
    } else
      setSaveProblem(
        result.value.reason === 'name-in-use'
          ? 'Another of your reports has that name. Choose another.'
          : 'Give the report a name.',
      );
  };

  return (
    <div className="report-page">
      <a href={routeHref('reports')} className="report-page__back">
        <ChevronLeft aria-hidden="true" /> Reports
      </a>
      <PageToolbar
        title={layout?.name ?? view?.title ?? ''}
        status={view?.locked === true ? <span className="review__count">Locked</span> : undefined}
        actions={
          <>
            {isPl && (
              <Button
                icon={Settings2}
                aria-pressed={customising}
                onClick={() => {
                  setCustomising((v) => !v);
                }}
              >
                Customise
              </Button>
            )}
          </>
        }
        mainAction={
          isPl ? (
            <Button
              variant="main"
              onClick={() => {
                setSaveProblem(null);
                setSaving(layout?.name ?? '');
              }}
            >
              {layout === null ? 'Save as my report' : 'Save'}
            </Button>
          ) : undefined
        }
      />
      <div className="review__filters" role="group" aria-label="Period">
        {request.report === 'balance-sheet' ? (
          <label className="report-page__field">
            <span>As at</span>
            <input
              type="date"
              className="review-field"
              value={request.asAt ?? view?.to ?? ''}
              onChange={(e) => {
                setRequest({ ...request, asAt: e.target.value === '' ? null : e.target.value });
              }}
            />
          </label>
        ) : (
          <>
            <select
              aria-label="Period"
              value={request.period.choice}
              onChange={(e) => {
                const choice = e.target.value as PeriodChoice;
                setRequest({
                  ...request,
                  period: { choice, from: view?.from ?? null, to: view?.to ?? null },
                });
              }}
            >
              {periodChoices.map((c) => (
                <option key={c} value={c}>
                  {PERIOD_WORDS[c]}
                </option>
              ))}
            </select>
            {request.period.choice === 'custom' && (
              <>
                <input
                  type="date"
                  aria-label="From date"
                  className="review-field"
                  value={request.period.from ?? ''}
                  onChange={(e) => {
                    setRequest({
                      ...request,
                      period: { ...request.period, from: e.target.value || null },
                    });
                  }}
                />
                <input
                  type="date"
                  aria-label="To date"
                  className="review-field"
                  value={request.period.to ?? ''}
                  onChange={(e) => {
                    setRequest({
                      ...request,
                      period: { ...request.period, to: e.target.value || null },
                    });
                  }}
                />
              </>
            )}
          </>
        )}
        {view !== null && <span className="report-page__period">{view.periodText}</span>}
        <span className="report-page__exports">
          <Button icon={Download} onClick={() => void exportAs('csv')}>
            Export CSV
          </Button>
          <Button icon={FileText} onClick={() => void exportAs('pdf')}>
            Export PDF
          </Button>
          <Button icon={Share2} disabled title="Comes with Google Sheets, in a later version.">
            Publish to Google Sheets
          </Button>
        </span>
      </div>
      {notice !== null && (
        <p className="review__notice" role="status">
          {notice}
        </p>
      )}
      <div className="report-page__body">
        <div className="report-page__main">
          {state.status === 'loading' && <p aria-busy="true">Working out the figures…</p>}
          {state.status === 'failed' && (
            <ErrorMessage
              message="The report could not be made. Close the app and open it again."
              onRetry={reload}
            />
          )}
          {state.status === 'ready' && state.value.kind === 'refused' && (
            <ErrorMessage
              message={
                state.value.reason === 'bad-period'
                  ? 'Choose both dates, with the first on or before the last.'
                  : 'Reports appear once your business is set up.'
              }
            />
          )}
          {view !== null && (
            <section className="page-surface report-page__surface">
              <ReportTable
                view={view}
                request={request}
                onDrill={(d) => {
                  setDrill(d);
                }}
                onNote={(column, rowKey, text) => {
                  setRequest({
                    ...request,
                    ownColumns: request.ownColumns.map((c, i) =>
                      i === column && c.kind === 'notes'
                        ? { ...c, notes: { ...c.notes, [rowKey]: text } }
                        : c,
                    ),
                  });
                }}
              />
              {view.check !== null && (
                <p
                  className={
                    view.check.ok
                      ? 'report-page__check'
                      : 'report-page__check report-page__check--bad'
                  }
                >
                  {view.check.ok ? '✓ ' : '✗ '}
                  {view.check.text}
                </p>
              )}
              {view.note !== null && <p className="report-page__note">{view.note}</p>}
            </section>
          )}
        </div>
        {customising && isPl && (
          <CustomisePanel
            request={request}
            onChange={setRequest}
            onNewColumn={() => {
              setNewColumn(true);
            }}
            onClose={() => {
              setCustomising(false);
            }}
          />
        )}
      </div>
      {drill !== null && (
        <DrillSheet
          drill={drill}
          onClose={() => {
            setDrill(null);
          }}
        />
      )}
      {newColumn && view !== null && (
        <NewColumnSheet
          request={request}
          view={view}
          onCancel={() => {
            setNewColumn(false);
          }}
          onAdd={(column) => {
            setNewColumn(false);
            setRequest({ ...request, ownColumns: [...request.ownColumns, column] });
          }}
        />
      )}
      {saving !== null && (
        <Sheet
          title={layout === null ? 'Save as my report' : 'Save my report'}
          onClose={() => {
            setSaving(null);
          }}
          actions={
            <>
              <Button
                onClick={() => {
                  setSaving(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="main"
                disabled={saving.trim() === ''}
                onClick={() => void saveLayout()}
              >
                Save
              </Button>
            </>
          }
        >
          <label className="rule-editor__field">
            <span>Name</span>
            <input
              className="review-field"
              placeholder="Quarterly P&L for accountant"
              value={saving}
              onChange={(e) => {
                setSaving(e.target.value);
                setSaveProblem(null);
              }}
            />
          </label>
          <p className="transfer__note">
            It is listed under My reports, with these columns and rows.
          </p>
          {saveProblem !== null && (
            <p className="split__problem" role="alert">
              {saveProblem}
            </p>
          )}
        </Sheet>
      )}
    </div>
  );
}

/** A request as the bridge takes it: the same request, with plain arrays and objects. */
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
