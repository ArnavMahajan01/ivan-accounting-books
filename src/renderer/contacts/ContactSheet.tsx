// New contact and Edit details (specs 122, 123): the name, customer or supplier, and the optional
// details. Checked again in the main process; a refusal is said in words beside the fields.

import { useState } from 'react';
import { CONTACT_KINDS, type ContactKind } from '@shared/kinds';
import type { ContactPageView } from '@shared/contacts';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { KIND_WORDS, REFUSED_WORDS } from './contact-text';
import '../review/review.css';
import '../rules/rules.css';
import './contacts.css';

export function ContactSheet({
  contact,
  onClose,
  onSaved,
}: {
  /** Null for a new contact. */
  readonly contact: ContactPageView['contact'] | null;
  readonly onClose: () => void;
  readonly onSaved: (id: string, text: string) => void;
}) {
  const [name, setName] = useState(contact?.name ?? '');
  const [kind, setKind] = useState<ContactKind>(contact?.kind ?? 'customer');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [abn, setAbn] = useState(contact?.abn ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const input = { name, kind, email, phone, abn, notes };
      const api = bridge();
      const result =
        contact === null
          ? await api['contacts.add'](input)
          : await api['contacts.edit']({ ...input, id: contact.id });
      if (!result.ok) setProblem('That could not be saved. Try again.');
      else if (result.value.kind === 'refused') setProblem(REFUSED_WORDS[result.value.reason]);
      else onSaved(result.value.id, `Saved ${name.trim()}.`);
    } finally {
      setBusy(false);
    }
  };

  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    type: 'text' | 'email' | 'tel' = 'text',
  ) => (
    <label className="rule-editor__field">
      <span>{label}</span>
      <input
        className="review-field"
        type={type}
        value={value}
        onChange={(e) => {
          set(e.target.value);
        }}
      />
    </label>
  );

  return (
    <Sheet
      title={contact === null ? 'New contact' : `Edit ${contact.name}`}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="main" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="contact-sheet">
        {field('Name', name, setName)}
        <label className="rule-editor__field">
          <span>Is a</span>
          <select
            className="review-field"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ContactKind);
            }}
          >
            {CONTACT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_WORDS[k]}
              </option>
            ))}
          </select>
        </label>
        {field('Email (optional)', email, setEmail, 'email')}
        {field('Phone (optional)', phone, setPhone, 'tel')}
        {field('ABN (optional)', abn, setAbn)}
        <label className="rule-editor__field">
          <span>Notes (optional)</span>
          <textarea
            className="review-field"
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
          />
        </label>
        {problem !== null && (
          <p className="split__problem" role="alert">
            {problem}
          </p>
        )}
      </div>
    </Sheet>
  );
}
