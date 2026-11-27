// Publish to Google Sheets (specs 110 to 112; W07a, Option 3): a sheet-style preview of exactly
// what Google will get, where it goes (a new workbook, or the one already published, updated in
// place), which of his tabs are left alone, then Publish, and the result in a sentence with
// "Open in Google Sheets". The preview needs no internet; Publish needs Google connected.

import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  PublishOutcome,
  PublishPreview,
  PublishRefusal,
  PublishRequest,
} from '@shared/sheets';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Sheet } from '../components/Sheet';
import { plural } from '../import/import-text';
import { formatMoment } from '../pages/transaction-labels';
import { PERIOD_WORDS } from '../reports/ready-layouts';
import { toBridge } from '../reports/to-bridge';
import { routeHref } from '../routes';
import { useGoogleState } from './google-state';

/** The request as the bridge takes it. */
function forBridge(request: PublishRequest) {
  return request.kind === 'report'
    ? { kind: 'report' as const, request: toBridge(request.request) }
    : { kind: 'transactions' as const, period: { ...request.period } };
}
import { SheetGrid } from './SheetGrid';
import { SIDE_BY_SIDE_HOW, SideBySide } from './SideBySide';
import './sheets.css';

const REFUSED: Record<PublishRefusal, string> = {
  'not-connected': 'Google is not connected. Connect it in Settings, then publish.',
  'needs-sign-in': 'Google needs you to sign in again in Settings. Nothing was sent.',
  offline:
    'Offline: Google could not be reached, and nothing was sent. Try again when you are online.',
  'bad-period': 'Pick a period with a first and last day, the right way round.',
  'not-set-up': 'Set up the business first.',
  failed: 'Google did not take the workbook. Nothing in your books changed. Try again.',
};

/** "2 rows changed, 1 added" in words, or that nothing changed. */
function changesText(changes: { added: number; changed: number; removed: number }): string {
  const parts = [
    changes.changed > 0 ? `${plural(changes.changed, 'row', 'rows')} changed` : '',
    changes.added > 0 ? `${plural(changes.added, 'row', 'rows')} added` : '',
    changes.removed > 0 ? `${plural(changes.removed, 'row', 'rows')} gone` : '',
  ].filter((p) => p !== '');
  return parts.length === 0
    ? 'Nothing changed since last time.'
    : `${parts.join(', ')} since last time.`;
}

/** The periods the transactions can be published for: whole quarters and years. */
const TRANSACTION_PERIODS = ['this-quarter', 'last-quarter', 'this-year', 'last-year'] as const;

export function PublishSheet({
  request: asked,
  onClose,
}: {
  readonly request: PublishRequest;
  readonly onClose: () => void;
}) {
  const { status } = useGoogleState();
  // The transactions can be published for another period from here; a report keeps its own.
  const [request, setRequest] = useState<PublishRequest>(asked);
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<PublishOutcome | null>(null);
  const [sideBySide, setSideBySide] = useState(false);

  useEffect(() => {
    let current = true;
    const api = bridge();
    void api['sheets.preview']({ request: forBridge(request) }).then((result) => {
      if (!current) return;
      if (!result.ok) setProblem('The preview could not be drawn. Close this and try again.');
      else if (result.value.kind === 'refused') setProblem(REFUSED[result.value.reason]);
      else setPreview(result.value.preview);
    });
    return () => {
      current = false;
    };
  }, [request]);

  const publish = async (asNew: boolean) => {
    setBusy(true);
    try {
      const result = await bridge()['sheets.publish']({ request: forBridge(request), asNew });
      setOutcome(result.ok ? result.value : { kind: 'refused', reason: 'failed' });
    } finally {
      setBusy(false);
    }
  };

  const open = (linkId: string) => {
    void bridge()['sheets.open']({ linkId });
  };

  const connected = status?.kind === 'connected';
  const done = outcome?.kind === 'published' ? outcome : null;

  return (
    <Sheet
      title="Publish to Google Sheets"
      size="wide"
      {...(preview === null ? {} : { description: preview.title })}
      onClose={onClose}
      actions={
        done !== null ? (
          <>
            <Button onClick={onClose}>Done</Button>
            <SideBySide
              linkId={done.linkId}
              onOpen={() => {
                setSideBySide(true);
              }}
            />
            <Button
              variant="main"
              icon={ExternalLink}
              onClick={() => {
                open(done.linkId);
              }}
            >
              Open in Google Sheets
            </Button>
          </>
        ) : outcome?.kind === 'missing' ? (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="main" disabled={busy} onClick={() => void publish(true)}>
              Publish as new
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="main"
              disabled={preview === null || !connected || busy}
              onClick={() => void publish(preview?.target === 'missing')}
            >
              {busy ? 'Publishing…' : preview?.target === 'update' ? 'Publish again' : 'Publish'}
            </Button>
          </>
        )
      }
    >
      {request.kind === 'transactions' && done === null && (
        <label className="publish__period">
          <span>Transactions for</span>
          <select
            className="review-field"
            value={request.period.choice}
            onChange={(e) => {
              const choice =
                TRANSACTION_PERIODS.find((p) => p === e.target.value) ?? 'this-quarter';
              setPreview(null);
              setOutcome(null);
              setRequest({ kind: 'transactions', period: { choice, from: null, to: null } });
            }}
          >
            {TRANSACTION_PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_WORDS[p]}
              </option>
            ))}
          </select>
        </label>
      )}
      {problem !== null && <ErrorMessage message={problem} />}
      {preview === null && problem === null && <p aria-busy="true">Drawing the preview…</p>}
      {done !== null && (
        <div className="publish__result" role="status">
          {done.isNew ? (
            <p>
              Published to a new workbook in the &quot;Accounting Books&quot; folder in your Google
              Drive.
            </p>
          ) : (
            <p>
              Updated in place. {done.changes === null ? '' : changesText(done.changes)}
              {done.kept.length > 0 &&
                ` Your own tabs were left as they were: ${done.kept.join(', ')}.`}
            </p>
          )}
        </div>
      )}
      {sideBySide && <p className="publish__line publish__line--note">{SIDE_BY_SIDE_HOW}</p>}
      {outcome?.kind === 'missing' && (
        <p role="status" className="publish__line">
          This workbook is no longer in your Google Drive. It may have been deleted. Publish it as a
          new workbook, with the same name.
        </p>
      )}
      {outcome?.kind === 'refused' && <ErrorMessage message={REFUSED[outcome.reason]} />}
      {preview !== null && done === null && outcome?.kind !== 'missing' && (
        <>
          <p className="publish__line">
            <strong>Goes to: </strong>
            {preview.target === 'new' &&
              'a new workbook in the "Accounting Books" folder in your Google Drive.'}
            {preview.target === 'update' &&
              `the workbook you published${preview.publishedAt === null ? '' : ` on ${formatMoment(preview.publishedAt)}`}, updated in place. The link and who it is shared with stay the same.`}
            {preview.target === 'missing' &&
              'a new workbook: the one published before is no longer in your Google Drive.'}
          </p>
          <p className="publish__line">
            <strong>Tabs: </strong>
            {preview.tabs.map((t) => t.title).join(', ')}.{' '}
            {preview.target === 'update' &&
              (preview.kept.length > 0
                ? `Kept as they are: ${preview.kept.join(', ')}.`
                : 'Your own tabs, and columns to the right, are kept.')}
          </p>
          {!connected && (
            <p className="publish__line publish__line--note">
              Connect Google in <a href={routeHref('settings')}>Settings</a> to publish. The preview
              works without it.
            </p>
          )}
          <SheetGrid tabs={preview.tabs} kept={preview.target === 'update' ? preview.kept : []} />
          <p className="publish__line publish__line--note">
            Preview only. Nothing is sent until you click{' '}
            {preview.target === 'update' ? 'Publish again' : 'Publish'}.
          </p>
        </>
      )}
    </Sheet>
  );
}
