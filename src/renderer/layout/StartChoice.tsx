import { FlaskConical, NotebookPen } from 'lucide-react';
import { useState } from 'react';
import { bridge } from '../bridge';
import { useBooksState } from '../books-state';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import './StartChoice.css';

/**
 * The first launch with empty books (spec 047): look around with sample data, or begin with his
 * own empty books. It is the author's choice in demos, since his real books start at go-live.
 */
export function StartChoice() {
  const { apply } = useBooksState();
  const [busy, setBusy] = useState<'sample' | 'own' | null>(null);
  const [failed, setFailed] = useState(false);

  const choose = async (choice: 'sample' | 'own') => {
    setBusy(choice);
    setFailed(false);
    const result = await (choice === 'sample'
      ? bridge()['sample.load']({})
      : bridge()['app.startOwnBooks']({}));
    if (result.ok) {
      apply(result.value);
    } else {
      setBusy(null);
      setFailed(true);
    }
  };

  return (
    <main className="start-choice">
      <section className="page-surface start-choice__card" aria-labelledby="start-choice-title">
        <h1 id="start-choice-title" className="start-choice__title">
          How would you like to start?
        </h1>
        <p className="start-choice__intro">
          You can look around with a made-up business first, or begin with your own empty books.
        </p>
        {failed && (
          <ErrorMessage message="That did not work. Close the app and open it again, then try once more." />
        )}
        <div className="start-choice__options">
          <div className="start-choice__option">
            <FlaskConical aria-hidden="true" className="start-choice__icon" />
            <p className="start-choice__text">
              A year of invented books for Harbour Lane Joinery. Nothing in it is real, and every
              page says so.
            </p>
            <Button
              variant="main"
              disabled={busy !== null}
              onClick={() => {
                void choose('sample');
              }}
            >
              Start with sample data
            </Button>
          </div>
          <div className="start-choice__option">
            <NotebookPen aria-hidden="true" className="start-choice__icon" />
            <p className="start-choice__text">
              Empty books, ready for your own business. Sample data can still be loaded later from
              Settings.
            </p>
            <Button
              disabled={busy !== null}
              onClick={() => {
                void choose('own');
              }}
            >
              Start my own books
            </Button>
          </div>
        </div>
        <p role="status" className="start-choice__status">
          {busy === 'sample'
            ? 'Loading the sample data…'
            : busy === 'own'
              ? 'Opening your books…'
              : ''}
        </p>
      </section>
    </main>
  );
}
