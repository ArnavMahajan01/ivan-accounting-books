// Contacts that look like one (spec 124; W08b, Option 5): each pair with why, Merge and Keep both.
// Merge asks which name to keep first, and says what moves; nothing changes until he confirms.

import { useState } from 'react';
import type { ContactMergeOutcome, ContactPairReason, ContactPairView } from '@shared/contacts';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { plural } from '../import/import-text';

const REASON_WORDS: Record<ContactPairReason, string> = {
  'same-abn': 'same ABN',
  'same-bank-words': 'same bank description',
  'similar-names': 'similar names',
};

function outcomeText(outcome: ContactMergeOutcome, kept: string, gone: string): string {
  switch (outcome.kind) {
    case 'merged':
      return `Merged ${gone} into ${kept}. ${plural(outcome.moved, 'transaction', 'transactions')} moved.`;
    case 'kept':
      return `Kept ${kept} and ${gone} apart. They will not be offered again.`;
    case 'refused':
      return outcome.reason === 'locked'
        ? `${gone} has transactions in a locked quarter, so it cannot be merged away. Keep the name ${gone} instead.`
        : 'Those contacts are no longer there.';
  }
}

function MergeSheet({
  pair,
  onClose,
  onDone,
}: {
  readonly pair: ContactPairView;
  readonly onClose: () => void;
  readonly onDone: (text: string) => void;
}) {
  const [keepId, setKeepId] = useState(pair.first.id);
  const [busy, setBusy] = useState(false);
  const keep = keepId === pair.first.id ? pair.first : pair.second;
  const gone = keepId === pair.first.id ? pair.second : pair.first;

  const merge = async () => {
    setBusy(true);
    try {
      const result = await bridge()['contacts.merge']({ keepId: keep.id, mergeId: gone.id });
      onDone(
        result.ok ? outcomeText(result.value, keep.name, gone.name) : 'That could not be merged.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={`Merge ${pair.first.name} and ${pair.second.name}`}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="main" disabled={busy} onClick={() => void merge()}>
            Merge
          </Button>
        </>
      }
    >
      <div className="contact-sheet">
        <fieldset className="rule-editor__group">
          <legend>Keep the name</legend>
          {[pair.first, pair.second].map((c) => (
            <label key={c.id} className="contact-pairs__choice">
              <input
                type="radio"
                name="merge-keep"
                checked={keepId === c.id}
                onChange={() => {
                  setKeepId(c.id);
                }}
              />
              {c.name}
            </label>
          ))}
        </fieldset>
        <p className="contact__empty">
          Every transaction, invoice, rule and saved bank description of {gone.name} moves to{' '}
          {keep.name}, and {gone.name} is removed. Each change is recorded in the history.
        </p>
      </div>
    </Sheet>
  );
}

export function ContactPairs({
  pairs,
  onChanged,
}: {
  readonly pairs: readonly ContactPairView[];
  readonly onChanged: (text: string) => void;
}) {
  const [merging, setMerging] = useState<ContactPairView | null>(null);
  if (pairs.length === 0) return null;

  const keepBoth = async (pair: ContactPairView) => {
    const result = await bridge()['contacts.keepBoth']({
      firstId: pair.first.id,
      secondId: pair.second.id,
    });
    onChanged(
      result.ok
        ? outcomeText(result.value, pair.first.name, pair.second.name)
        : 'That could not be saved.',
    );
  };

  return (
    <section className="page-surface contact-pairs" aria-label="Contacts that look the same">
      <p className="contact-pairs__heading">
        {pairs.length === 1
          ? '1 pair looks like the same contact.'
          : `${String(pairs.length)} pairs look like the same contact.`}
      </p>
      <ul className="contact-pairs__list">
        {pairs.map((pair) => (
          <li key={`${pair.first.id} ${pair.second.id}`}>
            <span>
              “{pair.first.name}” and “{pair.second.name}”
              <span className="contact-pairs__reason">{REASON_WORDS[pair.reason]}</span>
            </span>
            <span className="contact-pairs__actions">
              <Button
                size="small"
                aria-label={`Merge ${pair.first.name} and ${pair.second.name}`}
                onClick={() => {
                  setMerging(pair);
                }}
              >
                Merge
              </Button>
              <Button
                size="small"
                aria-label={`Keep ${pair.first.name} and ${pair.second.name} apart`}
                onClick={() => void keepBoth(pair)}
              >
                Keep both
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <p className="contact__empty">
        Merging moves every transaction and invoice to one contact, and is recorded in the history.
      </p>
      {merging !== null && (
        <MergeSheet
          pair={merging}
          onClose={() => {
            setMerging(null);
          }}
          onDone={(text) => {
            setMerging(null);
            onChanged(text);
          }}
        />
      )}
    </section>
  );
}
