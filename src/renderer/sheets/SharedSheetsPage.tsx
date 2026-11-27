// Shared sheets (spec 115; W07, Option 2 "People First"): everyone who can see something is listed
// once, with what they can see and as what; the role is changed in the row; sharing stops for one
// sheet or for everything a person can see, each after a confirmation (risk G5). "Only you" lists
// the workbooks published but not shared. Who can see what is asked of Drive each time it opens.

import { ExternalLink, Share2, SquareFunction } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ShareRole } from '@shared/kinds';
import type { PublishedSheet, SharedPeopleView } from '@shared/sheets';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { plural } from '../import/import-text';
import { PageToolbar } from '../layout/PageToolbar';
import { formatMoment } from '../pages/transaction-labels';
import { useBridgeQuery } from '../pages/use-bridge';
import { routeHref } from '../routes';
import { useGoogleState } from './google-state';
import { PublishSheet } from './PublishSheet';
import { ReadyFormulasSheet } from './ReadyFormulasSheet';
import { SheetPanelView } from './SheetPanelView';
import { ROLE_WORDS, SHARE_PROBLEMS, ShareSheet } from './ShareSheet';
import './sheets.css';

type Confirming =
  | {
      readonly kind: 'one';
      readonly email: string;
      readonly linkId: string;
      readonly permissionId: string;
      readonly title: string;
    }
  | { readonly kind: 'all'; readonly email: string; readonly count: number };

const published = (at: string | null) =>
  at === null ? 'not published yet' : `published ${formatMoment(at)}`;

export function SharedSheetsPage() {
  const { status } = useGoogleState();
  const load = useCallback(() => bridge()['sheets.people']({}), []);
  const { state, reload } = useBridgeQuery<SharedPeopleView>(load, status?.kind ?? 'loading');
  const [sharing, setSharing] = useState<{ linkId?: string } | null>(null);
  const [publishing, setPublishing] = useState<PublishedSheet | null>(null);
  const [formulas, setFormulas] = useState(false);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // The real sheet inside the app, when he turned that on in Settings (spec 118).
  const [panelOn, setPanelOn] = useState(false);
  const [viewing, setViewing] = useState<{ linkId: string; title: string } | null>(null);

  useEffect(() => {
    const api = bridge();
    void api['sheetPanel.getSetting']({}).then((result) => {
      if (result.ok) setPanelOn(result.value.on);
    });
  }, []);

  const view = state.status === 'ready' ? state.value : null;

  const open = (linkId: string) => {
    void bridge()['sheets.open']({ linkId });
  };

  const changeRole = async (linkId: string, permissionId: string, role: ShareRole) => {
    setProblem(null);
    const result = await bridge()['sheets.changeRole']({ linkId, permissionId, role });
    if (!result.ok) setProblem(SHARE_PROBLEMS.failed);
    else if (result.value.kind === 'refused') setProblem(SHARE_PROBLEMS[result.value.reason]);
    else setMessage(`Changed to ${ROLE_WORDS[role]}.`);
    reload();
  };

  const stop = async (c: Confirming) => {
    setConfirming(null);
    setProblem(null);
    if (c.kind === 'one') {
      const result = await bridge()['sheets.unshare']({
        linkId: c.linkId,
        permissionId: c.permissionId,
      });
      if (!result.ok) setProblem(SHARE_PROBLEMS.failed);
      else if (result.value.kind === 'refused') setProblem(SHARE_PROBLEMS[result.value.reason]);
      else setMessage(`${c.email} can no longer open "${c.title}".`);
    } else {
      const result = await bridge()['sheets.unshareAll']({ email: c.email });
      if (!result.ok) setProblem(SHARE_PROBLEMS.failed);
      else if (result.value.kind === 'refused') setProblem(SHARE_PROBLEMS[result.value.reason]);
      else setMessage(`${c.email} can no longer open any of your sheets.`);
    }
    reload();
  };

  const actions = (
    <Button
      icon={SquareFunction}
      onClick={() => {
        setFormulas(true);
      }}
    >
      Ready formulas
    </Button>
  );
  const shareButton = (
    <Button
      variant="main"
      icon={Share2}
      disabled={view === null || view.problem !== null || view.sheets.every((s) => s.missing)}
      onClick={() => {
        setSharing({});
      }}
    >
      Share…
    </Button>
  );

  if (viewing !== null) {
    return (
      <SheetPanelView
        linkId={viewing.linkId}
        title={viewing.title}
        onBack={() => {
          setViewing(null);
        }}
      />
    );
  }

  return (
    <div className="shared">
      <PageToolbar title="Shared sheets" actions={actions} mainAction={shareButton} />
      {state.status === 'loading' && <p aria-busy="true">Asking Google who can see your sheets…</p>}
      {state.status === 'failed' && (
        <ErrorMessage message="The shared sheets could not be read. Try again." onRetry={reload} />
      )}
      {message !== null && (
        <p className="publish__line" role="status">
          {message}
        </p>
      )}
      {problem !== null && <ErrorMessage message={problem} />}
      {view !== null && view.sheets.length === 0 && (
        <EmptyState
          icon={Share2}
          message="Publish a report, or the transactions, to Google Sheets from Reports or Transactions. Then share it here."
        />
      )}
      {view !== null && view.sheets.length > 0 && view.problem !== null && (
        <section className="page-surface shared__card" aria-label="Published sheets">
          <p className="publish__line" role="status">
            {view.problem === 'not-connected' ? (
              <>
                Connect Google in <a href={routeHref('settings')}>Settings</a> to see who can see
                your sheets, and to share them.
              </>
            ) : (
              SHARE_PROBLEMS[view.problem]
            )}
          </p>
          <ul className="shared__list">
            {view.sheets.map((s) => (
              <li key={s.linkId} className="shared__row">
                <span className="shared__title">{s.title}</span>
                <span className="shared__when">{published(s.publishedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {view?.problem === null &&
        view.people.map((person) => (
          <section
            key={person.email}
            className="page-surface shared__card"
            aria-label={person.email}
          >
            <header className="shared__person">
              <h2 className="shared__email">
                {person.email}{' '}
                <span className="shared__count">
                  can see {plural(person.sheets.length, 'sheet', 'sheets')}
                </span>
              </h2>
              <Button
                size="small"
                aria-label={`Stop sharing everything with ${person.email}`}
                onClick={() => {
                  setConfirming({ kind: 'all', email: person.email, count: person.sheets.length });
                }}
              >
                Stop sharing everything
              </Button>
            </header>
            <ul className="shared__list">
              {person.sheets.map((s) => (
                <li key={s.linkId} className="shared__row">
                  <span className="shared__title">{s.title}</span>
                  <span className="shared__when">{published(s.publishedAt)}</span>
                  <select
                    className="review-field"
                    aria-label={`What ${person.email} can do with ${s.title}`}
                    value={s.role}
                    onChange={(e) => {
                      const role = (['viewer', 'commenter', 'editor'] as const).find(
                        (r) => r === e.target.value,
                      );
                      if (role !== undefined) void changeRole(s.linkId, s.permissionId, role);
                    }}
                  >
                    {(['viewer', 'commenter', 'editor'] as const).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_WORDS[r]}
                      </option>
                    ))}
                  </select>
                  {panelOn && (
                    <Button
                      size="small"
                      aria-label={`Open ${s.title} here`}
                      onClick={() => {
                        setViewing({ linkId: s.linkId, title: s.title });
                      }}
                    >
                      Open here
                    </Button>
                  )}
                  <Button
                    size="small"
                    icon={ExternalLink}
                    aria-label={`Open ${s.title} in Google Sheets`}
                    onClick={() => {
                      open(s.linkId);
                    }}
                  >
                    Open in Google Sheets
                  </Button>
                  <Button
                    size="small"
                    aria-label={`Stop sharing ${s.title} with ${person.email}`}
                    onClick={() => {
                      setConfirming({
                        kind: 'one',
                        email: person.email,
                        linkId: s.linkId,
                        permissionId: s.permissionId,
                        title: s.title,
                      });
                    }}
                  >
                    Stop sharing
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      {view?.problem === null &&
        (view.onlyYou.length > 0 || view.sheets.some((s) => s.missing)) && (
          <section className="page-surface shared__card" aria-label="Only you">
            <header className="shared__person">
              <h2 className="shared__email">
                Only you <span className="shared__count">published but not shared</span>
              </h2>
            </header>
            <ul className="shared__list">
              {[...view.onlyYou, ...view.sheets.filter((s) => s.missing)].map((s) => (
                <li key={s.linkId} className="shared__row">
                  <span className="shared__title">{s.title}</span>
                  <span className="shared__when">
                    {s.missing ? 'no longer in your Google Drive' : published(s.publishedAt)}
                  </span>
                  {!s.missing && panelOn && (
                    <Button
                      size="small"
                      aria-label={`Open ${s.title} here`}
                      onClick={() => {
                        setViewing({ linkId: s.linkId, title: s.title });
                      }}
                    >
                      Open here
                    </Button>
                  )}
                  {!s.missing && (
                    <Button
                      size="small"
                      icon={ExternalLink}
                      aria-label={`Open ${s.title} in Google Sheets`}
                      onClick={() => {
                        open(s.linkId);
                      }}
                    >
                      Open in Google Sheets
                    </Button>
                  )}
                  <Button
                    size="small"
                    onClick={() => {
                      setPublishing(s);
                    }}
                  >
                    {s.missing ? 'Publish as new' : 'Publish again'}
                  </Button>
                  {!s.missing && (
                    <Button
                      size="small"
                      aria-label={`Share ${s.title}`}
                      onClick={() => {
                        setSharing({ linkId: s.linkId });
                      }}
                    >
                      Share…
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      {sharing !== null && view !== null && (
        <ShareSheet
          sheets={view.sheets}
          {...(sharing.linkId === undefined ? {} : { linkId: sharing.linkId })}
          onClose={() => {
            setSharing(null);
          }}
          onShared={(text) => {
            setSharing(null);
            setMessage(text);
            reload();
          }}
        />
      )}
      {publishing !== null && (
        <PublishSheet
          request={publishing.request}
          onClose={() => {
            setPublishing(null);
            reload();
          }}
        />
      )}
      {formulas && (
        <ReadyFormulasSheet
          onClose={() => {
            setFormulas(false);
          }}
        />
      )}
      {confirming !== null && (
        <ConfirmDialog
          title="Stop sharing?"
          change={
            confirming.kind === 'one'
              ? `${confirming.email} will no longer be able to open "${confirming.title}". The sheet stays in your Google Drive.`
              : `${confirming.email} will no longer be able to open any of your ${plural(confirming.count, 'sheet', 'sheets')}. The sheets stay in your Google Drive.`
          }
          confirmLabel={confirming.kind === 'one' ? 'Stop sharing' : 'Stop sharing everything'}
          destructive
          onConfirm={() => void stop(confirming)}
          onCancel={() => {
            setConfirming(null);
          }}
        />
      )}
    </div>
  );
}
