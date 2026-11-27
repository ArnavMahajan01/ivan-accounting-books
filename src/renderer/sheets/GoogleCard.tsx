// The Google card in Settings (specs 107, 108; wireframe/2111-settings, Option 3): connected or
// not, in one line, with the one button that changes it. Connecting opens his web browser.

import { Link2 } from 'lucide-react';
import { useState } from 'react';
import type { ConnectProblem } from '@shared/sheets';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorMessage } from '../components/ErrorMessage';
import { useGoogleState } from './google-state';
import './sheets.css';

const PROBLEMS: Record<ConnectProblem, string> = {
  'not-set-up': 'Google sign-in is not set up in this copy of the app yet.',
  cancelled: 'Signing in was not finished, and nothing changed. Try again when you are ready.',
  offline: 'Could not reach Google. Check the internet connection, then try again.',
  'scope-refused':
    'Google was not allowed to let the app see the files it makes, so sheets cannot be published. Try again and leave that box ticked.',
  'no-keychain': "Your Mac's Keychain could not keep the sign-in, so nothing was saved.",
  busy: 'A Google sign-in is already open in your web browser. Finish it there.',
  failed: 'Google did not accept the sign-in. Try again.',
};

export function GoogleCard() {
  const { status, refresh } = useGoogleState();
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const connect = async () => {
    setWaiting(true);
    setMessage(null);
    try {
      const result = await bridge()['google.connect']({});
      if (!result.ok) setMessage(PROBLEMS.failed);
      else if (result.value.kind === 'connected') refresh(result.value.status);
      else setMessage(PROBLEMS[result.value.reason]);
    } finally {
      setWaiting(false);
    }
  };

  const disconnect = async () => {
    setConfirming(false);
    const result = await bridge()['google.disconnect']({});
    refresh();
    setMessage(
      result.ok && result.value.outcome === 'not-revoked'
        ? "Disconnected on this Mac. Google could not be reached to remove the app's access: you can remove it in your Google account's security settings."
        : null,
    );
  };

  return (
    <section className="page-surface settings-card" aria-labelledby="settings-google">
      <h2 id="settings-google" className="settings-card__title">
        <Link2 aria-hidden="true" className="settings-card__icon" />
        Google
      </h2>
      {status === null && <p aria-busy="true">Checking…</p>}
      {status?.kind === 'not-set-up' && (
        <p className="settings-card__line settings-card__line--secondary">
          {PROBLEMS['not-set-up']} Everything else works without it.
        </p>
      )}
      {status?.kind === 'not-connected' && (
        <>
          <p className="settings-card__line">Not connected</p>
          <p className="settings-card__line settings-card__line--secondary">
            Connect opens your web browser to sign in to Google. Only needed to publish and share
            sheets. Everything else works without it.
          </p>
        </>
      )}
      {status?.kind === 'connected' && (
        <>
          <p className="settings-card__line" data-testid="google-status">
            {status.email === null ? 'Connected' : `Connected as ${status.email}`}
          </p>
          <p className="settings-card__line settings-card__line--secondary">
            Published sheets go in the &quot;Accounting Books&quot; folder in your Google Drive. The
            app can see only the files it created.
          </p>
        </>
      )}
      {status?.kind === 'needs-sign-in' && (
        <p className="settings-card__line" role="status">
          Google needs you to sign in again
          {status.email === null ? '' : ` as ${status.email}`}.
        </p>
      )}
      {waiting && (
        <p className="settings-card__line settings-card__line--secondary" role="status">
          Finish signing in in your web browser…
        </p>
      )}
      {message !== null && <ErrorMessage message={message} />}
      <div className="settings-card__actions">
        {status?.kind === 'not-connected' && (
          <Button variant="main" disabled={waiting} onClick={() => void connect()}>
            Connect Google
          </Button>
        )}
        {status?.kind === 'needs-sign-in' && (
          <Button variant="main" disabled={waiting} onClick={() => void connect()}>
            Sign in again
          </Button>
        )}
        {(status?.kind === 'connected' || status?.kind === 'needs-sign-in') && (
          <Button
            onClick={() => {
              setConfirming(true);
            }}
          >
            Disconnect
          </Button>
        )}
      </div>
      {confirming && (
        <ConfirmDialog
          title="Disconnect Google?"
          change="Your published sheets stay in your Google Drive, and the people you shared them with keep their access. The app stops publishing and checking for your accountant's changes until you connect again."
          confirmLabel="Disconnect"
          destructive
          onConfirm={() => void disconnect()}
          onCancel={() => {
            setConfirming(false);
          }}
        />
      )}
    </section>
  );
}
