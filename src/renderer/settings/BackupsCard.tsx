// Settings, Backups (specs 136 to 138; wireframe/2111-settings, Option 3): where backups go, the
// daily backup, Back up now, the last backup in words, and Restore from a backup… Turning backups
// on shows the recovery key once, to write down: without it, a backup cannot be opened on another
// Mac. Restoring says plainly what it replaces, and asks first.

import { ArchiveRestore, DatabaseBackup } from 'lucide-react';
import { useState } from 'react';
import type { BackupRow, BackupStatus, RestoreOutcome } from '@shared/settings';
import { bridge } from '../bridge';
import { useBooksState } from '../books-state';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { formatMoment } from '../pages/transaction-labels';
import '../pages/SettingsPage.css';
import '../review/review.css';
import '../rules/rules.css';

const DAY_MS = 24 * 60 * 60 * 1000;

// Restoring refreshes every page, so the card is drawn again: what it said is kept here for it.
let afterRestore: string | null = null;

/** Whole days since a moment, on this Mac's clock. */
export function daysSince(at: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(at)) / DAY_MS));
}

/** "Last backup: 21/11/2026, 09:14", and how long ago once it is more than a day. */
export function lastBackupText(status: BackupStatus, now: Date): string {
  if (status.lastBackupAt === null) return 'There is no backup yet.';
  const days = daysSince(status.lastBackupAt, now);
  const when = `Last backup: ${formatMoment(status.lastBackupAt)}`;
  return days >= 2 ? `${when}, ${String(days)} days ago.` : `${when}.`;
}

const RESTORE_REFUSED: Record<Extract<RestoreOutcome, { kind: 'refused' }>['reason'], string> = {
  'needs-recovery-key':
    'This backup was made with a key this Mac does not have. Type your recovery key to open it.',
  'bad-recovery-key': 'That recovery key is not complete. It is 13 groups of 4 letters and digits.',
  'wrong-key': 'That recovery key does not open this backup.',
  'not-a-backup': 'That file is not a backup this app made.',
  damaged: 'That backup is damaged, so nothing was changed.',
  'other-mode': 'That backup is of the other books (sample or your own), so nothing was changed.',
  unreadable: 'That backup could not be read. Check the drive is connected.',
  'checks-failed': 'That backup did not pass the books check, so nothing was changed.',
  'no-folder': 'Choose the backup folder first.',
  failed: 'The restore did not finish, and your books are as they were.',
};

function RecoveryKeySheet({
  text,
  onClose,
}: {
  readonly text: string;
  readonly onClose: () => void;
}) {
  const [written, setWritten] = useState(false);
  return (
    <Sheet
      title="Write down your recovery key"
      role="alertdialog"
      onClose={onClose}
      actions={
        <Button variant="main" disabled={!written} onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="settings-sheet">
        <p className="settings-card__line">
          Your backups are encrypted. This Mac keeps the key in its Keychain. To open a backup on
          another Mac, or if this one is lost, you need this recovery key. Write it on paper and
          keep it somewhere safe, away from the backups.
        </p>
        <p className="backup-key" aria-label="Recovery key">
          {text}
        </p>
        <label className="settings-choice">
          <input
            type="checkbox"
            checked={written}
            onChange={(e) => {
              setWritten(e.target.checked);
            }}
          />
          I have written down the recovery key
        </label>
      </div>
    </Sheet>
  );
}

function RestoreSheet({
  rows,
  onClose,
  onRestored,
}: {
  readonly rows: readonly BackupRow[];
  readonly onClose: () => void;
  readonly onRestored: (text: string) => void;
}) {
  const { apply } = useBooksState();
  const [chosen, setChosen] = useState(rows[0]?.name ?? '');
  const [recovery, setRecovery] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const result = await bridge()['backup.restore']({ name: chosen, recoveryKey: recovery });
      if (!result.ok) {
        setProblem('The restore did not finish, and your books are as they were.');
        return;
      }
      const { outcome, state } = result.value;
      if (outcome.kind === 'restored') {
        afterRestore = `Restored. Your books are as they were at that backup, with ${String(outcome.entries)} transactions.`;
        apply(state);
        onRestored(
          `Restored. Your books are as they were at that backup, with ${String(outcome.entries)} transactions.`,
        );
      } else {
        if (outcome.reason === 'needs-recovery-key') setRecovery('');
        setProblem(RESTORE_REFUSED[outcome.reason]);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Restore from a backup?"
      role="alertdialog"
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={busy || chosen === ''}
            onClick={() => void restore()}
          >
            Restore and replace
          </Button>
        </>
      }
    >
      <div className="settings-sheet">
        <fieldset className="rule-editor__group">
          <legend>Backup</legend>
          {rows.map((r) => (
            <label key={r.name} className="settings-choice">
              <input
                type="radio"
                name="backup"
                checked={chosen === r.name}
                onChange={() => {
                  setChosen(r.name);
                }}
              />
              {formatMoment(r.createdAt)} · {r.entries.toLocaleString('en-AU')} transactions
            </label>
          ))}
        </fieldset>
        <p className="settings-card__warning">
          This replaces the books on this Mac with the backup you picked. Anything entered after
          that backup was made will be gone. Your current books are kept until the restore has
          finished and been checked.
        </p>
        {recovery !== null && (
          <label className="rule-editor__field">
            <span>Recovery key</span>
            <input
              className="review-field"
              autoComplete="off"
              spellCheck={false}
              value={recovery}
              onChange={(e) => {
                setRecovery(e.target.value);
              }}
            />
          </label>
        )}
        {problem !== null && (
          <p className="split__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </Sheet>
  );
}

export function BackupsCard({
  status,
  onChanged,
}: {
  readonly status: BackupStatus | null;
  readonly onChanged: () => void;
}) {
  const [message, setMessage] = useState<string | null>(() => {
    const text = afterRestore;
    afterRestore = null;
    return text;
  });
  const [keyText, setKeyText] = useState<string | null>(null);
  const [rows, setRows] = useState<readonly BackupRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const on = status !== null && status.daily && status.folderName !== null;

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await job();
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const choose = () =>
    run(async () => {
      await bridge()['backup.chooseFolder']({});
    });
  const turnOn = () =>
    run(async () => {
      const result = await bridge()['backup.turnOn']({});
      if (!result.ok) setMessage('Backups could not be turned on.');
      else if (result.value.kind === 'on') setKeyText(result.value.recoveryKey);
      else
        setMessage(
          result.value.reason === 'no-folder'
            ? 'Choose where to keep the backups first.'
            : "This Mac's Keychain could not keep the backup key, so backups are still off.",
        );
    });
  const backUp = () =>
    run(async () => {
      const result = await bridge()['backup.now']({});
      setMessage(
        !result.ok
          ? 'The backup was not made.'
          : result.value.kind === 'done'
            ? 'Backed up.'
            : result.value.reason === 'no-folder'
              ? 'The backup folder cannot be found. Connect the drive, or choose the folder again.'
              : result.value.reason === 'no-key'
                ? 'Turn backups on first.'
                : 'The backup was not made.',
      );
    });
  const setDaily = (value: boolean) =>
    run(async () => {
      await bridge()['backup.setDaily']({ on: value });
    });
  const openRestore = async () => {
    const result = await bridge()['backup.list']({});
    if (result.ok && result.value.length > 0) setRows(result.value);
    else setMessage('There are no backups in the backup folder yet.');
  };
  const showKey = async () => {
    const result = await bridge()['backup.recoveryKey']({});
    if (result.ok && result.value.recoveryKey !== null) setKeyText(result.value.recoveryKey);
  };

  return (
    <section className="page-surface settings-card" aria-labelledby="settings-backups">
      <h2 id="settings-backups" className="settings-card__title">
        <DatabaseBackup aria-hidden="true" className="settings-card__icon" />
        Backups
      </h2>
      {status === null && <p aria-busy="true">Reading…</p>}
      {status !== null && (
        <>
          <p className="settings-card__line">
            {on ? 'On' : 'Off'}
            {status.folderName !== null && ` · To: ${status.folderName} · Encrypted`}
          </p>
          <p className="settings-card__line settings-card__line--secondary">
            {lastBackupText(status, new Date())}
          </p>
          {status.folderName === null && (
            <p className="settings-card__line settings-card__line--secondary">
              Choose a folder on an external drive, or your Google Drive folder, so a copy is kept
              off this Mac.
            </p>
          )}
          {status.folderName !== null && status.keyReady && (
            <label className="settings-choice settings-card__check">
              <input
                type="checkbox"
                checked={status.daily}
                disabled={busy}
                onChange={(e) => void setDaily(e.target.checked)}
              />
              Back up automatically every day, and after each import
            </label>
          )}
        </>
      )}
      {message !== null && (
        <p className="settings-card__line" role="status">
          {message}
        </p>
      )}
      {status !== null && (
        <div className="settings-card__actions">
          {status.folderName === null || !status.keyReady ? (
            <>
              <Button disabled={busy} onClick={() => void choose()}>
                {status.folderName === null ? 'Choose folder…' : 'Change folder…'}
              </Button>
              {status.folderName !== null && (
                <Button variant="main" disabled={busy} onClick={() => void turnOn()}>
                  Turn on backups
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="main" disabled={busy} onClick={() => void backUp()}>
                Back up now
              </Button>
              <Button disabled={busy} onClick={() => void choose()}>
                Change folder…
              </Button>
              <Button icon={ArchiveRestore} disabled={busy} onClick={() => void openRestore()}>
                Restore from a backup…
              </Button>
              <Button disabled={busy} onClick={() => void showKey()}>
                Show recovery key
              </Button>
            </>
          )}
        </div>
      )}
      {keyText !== null && (
        <RecoveryKeySheet
          text={keyText}
          onClose={() => {
            setKeyText(null);
          }}
        />
      )}
      {rows !== null && (
        <RestoreSheet
          rows={rows}
          onClose={() => {
            setRows(null);
          }}
          onRestored={(text) => {
            setRows(null);
            setMessage(text);
            onChanged();
          }}
        />
      )}
    </section>
  );
}
