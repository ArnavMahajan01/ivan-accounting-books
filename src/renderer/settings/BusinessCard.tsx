// Settings, Business (spec 132; wireframe/2111-settings, Option 3): the name, ABN, GST basis and BAS
// frequency in two lines, and Change… to edit them. Changing the basis or the frequency warns first,
// because reports and the BAS for periods not yet locked are then worked out the new way.

import { Building2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { BasFrequency, GstBasis } from '@shared/kinds';
import type { BusinessChangeOutcome, BusinessView } from '@shared/settings';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { formatAbn } from '../contacts/contact-text';
import { useBridgeQuery } from '../pages/use-bridge';
import '../review/review.css';
import '../rules/rules.css';
import '../pages/SettingsPage.css';

const REFUSED: Record<Extract<BusinessChangeOutcome, { kind: 'refused' }>['reason'], string> = {
  'not-set-up': 'The books are not set up yet.',
  'empty-name': 'Type the business name.',
  'bad-abn': 'That ABN is not a real one. Check its 11 digits.',
  unchanged: 'Nothing was changed.',
};

export function businessLines(b: BusinessView): [string, string] {
  return [
    `${b.name} · ABN ${formatAbn(b.abn)}`,
    `GST on a ${b.gstBasis} basis · BAS ${b.basFrequency} · Year from 1 July`,
  ];
}

function BusinessSheet({
  business,
  onClose,
  onSaved,
}: {
  readonly business: BusinessView;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const [name, setName] = useState(business.name);
  const [abn, setAbn] = useState(formatAbn(business.abn));
  const [gstBasis, setGstBasis] = useState<GstBasis>(business.gstBasis);
  const [basFrequency, setBasFrequency] = useState<BasFrequency>(business.basFrequency);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changesPeriods = gstBasis !== business.gstBasis || basFrequency !== business.basFrequency;

  const save = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const result = await bridge()['business.change']({ name, abn, gstBasis, basFrequency });
      if (!result.ok) setProblem('That could not be saved. Try again.');
      else if (result.value.kind === 'refused') setProblem(REFUSED[result.value.reason]);
      else onSaved();
    } finally {
      setBusy(false);
    }
  };

  const choice = <T extends string>(
    legend: string,
    name: string,
    value: T,
    set: (v: T) => void,
    options: readonly (readonly [T, string])[],
  ) => (
    <fieldset className="rule-editor__group">
      <legend>{legend}</legend>
      {options.map(([v, label]) => (
        <label key={v} className="settings-choice">
          <input
            type="radio"
            name={name}
            checked={value === v}
            onChange={() => {
              set(v);
            }}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );

  return (
    <Sheet
      title="Business"
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
      <div className="settings-sheet">
        <label className="rule-editor__field">
          <span>Business name</span>
          <input
            className="review-field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
        <label className="rule-editor__field">
          <span>ABN</span>
          <input
            className="review-field"
            value={abn}
            inputMode="numeric"
            onChange={(e) => {
              setAbn(e.target.value);
            }}
          />
        </label>
        {choice('GST basis', 'gst-basis', gstBasis, setGstBasis, [
          ['cash', 'Cash'],
          ['accrual', 'Accrual'],
        ])}
        {choice('BAS frequency', 'bas-frequency', basFrequency, setBasFrequency, [
          ['quarterly', 'Quarterly'],
          ['monthly', 'Monthly'],
        ])}
        <p className="settings-card__line settings-card__line--secondary">
          Financial year: 1 July to 30 June
        </p>
        {changesPeriods && (
          <p className="settings-card__warning" role="status">
            Reports and the BAS worksheet for periods not yet locked will be worked out the new way.
            Locked periods do not change. Check with your accountant first.
          </p>
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

const loadBusiness = () => bridge()['business.get']({});

export function BusinessCard() {
  const [version, setVersion] = useState(0);
  const { state } = useBridgeQuery<BusinessView | null>(loadBusiness, String(version));
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const business = state.status === 'ready' ? state.value : null;
  const close = useCallback(() => {
    setEditing(false);
  }, []);

  return (
    <section className="page-surface settings-card" aria-labelledby="settings-business">
      <h2 id="settings-business" className="settings-card__title">
        <Building2 aria-hidden="true" className="settings-card__icon" />
        Business
      </h2>
      {state.status === 'loading' && <p aria-busy="true">Reading…</p>}
      {state.status === 'failed' && <p role="alert">The business details could not be read.</p>}
      {state.status === 'ready' && business === null && (
        <p className="settings-card__line">Not set up yet.</p>
      )}
      {business !== null &&
        businessLines(business).map((line, i) => (
          <p
            key={line}
            className={
              i === 0 ? 'settings-card__line' : 'settings-card__line settings-card__line--secondary'
            }
          >
            {line}
          </p>
        ))}
      {saved && (
        <p className="settings-card__line" role="status">
          Saved.
        </p>
      )}
      {business !== null && (
        <div className="settings-card__actions">
          <Button
            onClick={() => {
              setSaved(false);
              setEditing(true);
            }}
          >
            Change…
          </Button>
        </div>
      )}
      {editing && business !== null && (
        <BusinessSheet
          business={business}
          onClose={close}
          onSaved={() => {
            setEditing(false);
            setSaved(true);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </section>
  );
}
