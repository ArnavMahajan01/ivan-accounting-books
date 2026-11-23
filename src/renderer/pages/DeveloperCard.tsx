import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { bridge } from '../bridge';
import { useBooksState } from '../books-state';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ErrorMessage } from '../components/ErrorMessage';
import './SettingsPage.css';

/**
 * Settings, Developer (spec 047): load the invented sample books for a demo, and clear them. It
 * is in the demo builds only, and the release build for go-live removes it. The sample books are
 * a separate file, so clearing them can never touch his own books.
 */
export function DeveloperCard() {
  const { state, apply } = useBooksState();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  if (state === null || !state.sampleSwitch) return null;
  const sample = state.mode === 'sample';

  const run = async (change: 'sample.load' | 'sample.clear') => {
    setBusy(true);
    setFailed(false);
    const result = await bridge()[change]({});
    setBusy(false);
    if (result.ok) apply(result.value);
    else setFailed(true);
  };

  return (
    <section className="page-surface settings-card" aria-labelledby="settings-developer">
      <h2 id="settings-developer" className="settings-card__title">
        <FlaskConical aria-hidden="true" className="settings-card__icon" />
        Developer
      </h2>
      <p className="settings-card__line" data-testid="sample-status">
        {sample
          ? 'Sample data is loaded. You are looking at a made-up business.'
          : 'Your own books are open. No sample data is loaded.'}
      </p>
      <p className="settings-card__line settings-card__line--secondary">
        Sample data is kept apart from your own books, so clearing it never touches them.
      </p>
      {failed && (
        <ErrorMessage message="That did not work. Close the app and open it again, then try once more." />
      )}
      <div className="settings-card__actions">
        <Button
          disabled={busy || sample}
          onClick={() => {
            void run('sample.load');
          }}
        >
          Load sample data
        </Button>
        <Button
          variant="destructive"
          disabled={busy || !sample}
          onClick={() => {
            setConfirming(true);
          }}
        >
          Clear sample data
        </Button>
      </div>
      {busy && (
        <p role="status" className="settings-card__later">
          Working…
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          title="Clear the sample data?"
          change="This removes the sample books and goes back to your own books. Your own books are not touched."
          confirmLabel="Clear sample data"
          destructive
          onCancel={() => {
            setConfirming(false);
          }}
          onConfirm={() => {
            setConfirming(false);
            void run('sample.clear');
          }}
        />
      )}
    </section>
  );
}
