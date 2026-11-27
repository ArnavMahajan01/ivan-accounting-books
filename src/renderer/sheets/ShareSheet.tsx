// Share a workbook (spec 114; W07, the share dialog): an email and a role, each role explained in
// plain words, then "Check before sharing" with the full email and role before anything is sent
// (risk G2). Only that one person, never a link anyone can open.

import { useState } from 'react';
import type { ShareRole } from '@shared/kinds';
import type { PublishedSheet, ShareRefusal } from '@shared/sheets';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Sheet } from '../components/Sheet';

export const ROLE_WORDS: Record<ShareRole, string> = {
  viewer: 'Viewer',
  commenter: 'Commenter',
  editor: 'Editor',
};

export const SHARE_PROBLEMS: Record<ShareRefusal, string> = {
  'not-connected': 'Google is not connected. Connect it in Settings first.',
  'needs-sign-in': 'Google needs you to sign in again in Settings. Nothing was changed.',
  offline:
    'Offline: Google could not be reached, and nothing was changed. Try again when you are online.',
  missing: 'That workbook is no longer in your Google Drive. Publish it again first.',
  'bad-email': 'That does not look like an email address. Check it and try again.',
  failed: 'Google did not accept that. Nothing was changed. Try again.',
};

function roleHelp(role: ShareRole, transactions: boolean): string {
  switch (role) {
    case 'viewer':
      return 'can see the sheet';
    case 'commenter':
      return 'can see it and leave comments';
    case 'editor':
      return transactions
        ? 'can change the Account, GST and Note columns. Changes come back to you to accept'
        : 'can add their own tabs and columns. The figures from the app are protected';
  }
}

/** A quick look at the address before the main process checks it properly. */
const looksLikeEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

export function ShareSheet({
  sheets,
  linkId: chosen,
  onClose,
  onShared,
}: {
  /** The workbooks he can pick from. */
  readonly sheets: readonly PublishedSheet[];
  /** The workbook to share, when he started from its row. */
  readonly linkId?: string;
  readonly onClose: () => void;
  readonly onShared: (text: string) => void;
}) {
  const choices = sheets.filter((s) => !s.missing);
  const [linkId, setLinkId] = useState(chosen ?? choices[0]?.linkId ?? '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('viewer');
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sheet = choices.find((s) => s.linkId === linkId);
  const transactions = sheet?.request.kind === 'transactions';

  const share = async () => {
    setBusy(true);
    try {
      const result = await bridge()['sheets.share']({ linkId, email: email.trim(), role });
      if (!result.ok) setProblem(SHARE_PROBLEMS.failed);
      else if (result.value.kind === 'refused') setProblem(SHARE_PROBLEMS[result.value.reason]);
      else onShared(`Shared "${sheet?.title ?? ''}" with ${email.trim()} as ${ROLE_WORDS[role]}.`);
    } finally {
      setBusy(false);
    }
  };

  if (checking && sheet !== undefined) {
    return (
      <Sheet
        title="Check before sharing"
        role="alertdialog"
        onClose={onClose}
        actions={
          <>
            <Button
              onClick={() => {
                setChecking(false);
                setProblem(null);
              }}
            >
              Back
            </Button>
            <Button variant="main" disabled={busy} onClick={() => void share()}>
              {busy ? 'Sharing…' : 'Share'}
            </Button>
          </>
        }
      >
        <p className="share__check">
          Share <strong>{sheet.title}</strong> with <strong>{email.trim()}</strong> as{' '}
          <strong>{ROLE_WORDS[role]}</strong>.
        </p>
        <p className="publish__line publish__line--note">
          Google will email them a link. Only this sheet is shared, not your books or other sheets.
        </p>
        {problem !== null && <ErrorMessage message={problem} />}
      </Sheet>
    );
  }

  return (
    <Sheet
      title={sheet === undefined ? 'Share a sheet' : `Share "${sheet.title}"`}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="main"
            disabled={sheet === undefined || !looksLikeEmail(email)}
            onClick={() => {
              setChecking(true);
            }}
          >
            Continue
          </Button>
        </>
      }
    >
      <div className="share">
        {chosen === undefined && (
          <label className="share__field">
            <span>Sheet</span>
            <select
              value={linkId}
              onChange={(e) => {
                setLinkId(e.target.value);
              }}
            >
              {choices.map((s) => (
                <option key={s.linkId} value={s.linkId}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="share__field">
          <span>Email</span>
          <input
            type="email"
            className="review-field"
            autoComplete="off"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </label>
        <fieldset className="share__roles">
          <legend>What they can do</legend>
          {(['viewer', 'commenter', 'editor'] as const).map((r) => (
            <label key={r} className="share__role">
              <input
                type="radio"
                name="share-role"
                value={r}
                checked={role === r}
                onChange={() => {
                  setRole(r);
                }}
              />
              <span>
                <strong>{ROLE_WORDS[r]}</strong> · {roleHelp(r, transactions)}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </Sheet>
  );
}
