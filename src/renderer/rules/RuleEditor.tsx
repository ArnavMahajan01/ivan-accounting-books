// The Edit rule panel (spec 080, wireframe W05a Option 1): the same fields as his QuickBooks rule
// panel, and a Test that says how many lines the rule would catch before it is saved.

import { FlaskConical, Plus, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';
import type { RulesView } from '@shared/bridge-contract';
import { formatDateAU } from '@shared/dates';
import type { RuleInput } from '@shared/rule-types';
import { RULE_DIRECTIONS } from '@shared/rule-types';
import type { RuleTestResult } from '@shared/views';
import { bridge } from '../bridge';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SidePanel } from '../components/SidePanel';
import { plural } from '../import/import-text';
import { accountLabel, findAccount } from '../review/review-text';
import {
  DIRECTION_WORDS,
  blankCondition,
  ruleFromForm,
  toBridgeRule,
  type ConditionForm,
  type ConditionOp,
  type RuleForm,
} from './rule-text';

const SAVE_REFUSED: Record<string, string> = {
  'bank-account-chosen':
    'A rule cannot post to one of your bank accounts. Use Transfer in To review.',
  'unknown-account': 'One of the accounts is no longer used. Choose another.',
  'unknown-payee': 'That payee is no longer in your contacts.',
};

export function RuleEditor({
  view,
  ruleId,
  initial,
  onClose,
  onSaved,
  onRemoved,
}: {
  readonly view: RulesView;
  /** Null for a new rule. */
  readonly ruleId: string | null;
  readonly initial: RuleForm;
  readonly onClose: () => void;
  readonly onSaved: (name: string) => void;
  readonly onRemoved: (name: string) => void;
}) {
  const accountsList = useId();
  const contactsList = useId();
  const [form, setForm] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [test, setTest] = useState<RuleTestResult | null>(null);
  const [seeLines, setSeeLines] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const change = (patch: Partial<RuleForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setProblem(null);
    setTest(null);
  };
  const changeCondition = (key: number, patch: Partial<ConditionForm>) => {
    change({ conditions: form.conditions.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  };
  const nextKey = (items: readonly { key: number }[]) =>
    Math.max(0, ...items.map((i) => i.key)) + 1;

  const built = (): RuleInput | null => {
    const result = ruleFromForm(form, view);
    if (result.ok) return result.rule;
    setProblem(result.problem);
    return null;
  };

  const runTest = async () => {
    const rule = built();
    if (rule === null) return;
    const result = await bridge()['rules.test']({ rule: toBridgeRule(rule) });
    if (result.ok) setTest(result.value);
    else setProblem('The test could not be run. Try again.');
  };

  const save = async () => {
    const rule = built();
    if (rule === null) return;
    setBusy(true);
    try {
      const result = await bridge()['rules.save']({ id: ruleId, rule: toBridgeRule(rule) });
      if (!result.ok) setProblem('The rule could not be saved. Try again.');
      else if (result.value.kind === 'saved') onSaved(result.value.rule.name);
      else
        setProblem(
          SAVE_REFUSED[result.value.reason] ?? 'Check the rule: something in it is not complete.',
        );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirmRemove(false);
    if (ruleId === null) return;
    const result = await bridge()['rules.remove']({ id: ruleId });
    if (result.ok && result.value.removed) onRemoved(form.name);
    else setProblem('The rule could not be deleted. Try again.');
  };

  const opOptions = (field: 'description' | 'amount'): { value: ConditionOp; label: string }[] =>
    field === 'description'
      ? [
          { value: 'contains', label: 'contains' },
          { value: 'is', label: 'is' },
          { value: 'starts-with', label: 'starts with' },
        ]
      : [
          { value: 'equals', label: 'is' },
          { value: 'between', label: 'is between' },
        ];

  return (
    <SidePanel title={ruleId === null ? 'New rule' : 'Edit rule'} onClose={onClose}>
      <datalist id={accountsList}>
        {view.accounts.map((a) => (
          <option key={a.id} value={accountLabel(a)} />
        ))}
      </datalist>
      <datalist id={contactsList}>
        {view.contacts.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <div className="rule-editor">
        <label className="rule-editor__field">
          <span>Rule name</span>
          <input
            className="review-field"
            value={form.name}
            onChange={(e) => {
              change({ name: e.target.value });
            }}
          />
        </label>

        <fieldset className="rule-editor__group">
          <legend>For</legend>
          <div className="rule-editor__row">
            <select
              className="review-field"
              aria-label="Money in or out"
              value={form.direction}
              onChange={(e) => {
                change({ direction: e.target.value as RuleForm['direction'] });
              }}
            >
              {RULE_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {DIRECTION_WORDS[d]}
                </option>
              ))}
            </select>
            <span>in</span>
            <select
              className="review-field"
              aria-label="Bank accounts"
              value={form.bankAccountIds[0] ?? ''}
              onChange={(e) => {
                change({ bankAccountIds: e.target.value === '' ? [] : [e.target.value] });
              }}
            >
              <option value="">All bank accounts</option>
              {view.bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset className="rule-editor__group">
          <legend>When</legend>
          {form.conditions.length > 1 && (
            <select
              className="review-field rule-editor__mode"
              aria-label="Which conditions must hold"
              value={form.matchMode}
              onChange={(e) => {
                change({ matchMode: e.target.value as RuleForm['matchMode'] });
              }}
            >
              <option value="all">All of these</option>
              <option value="any">Any one of these</option>
            </select>
          )}
          {form.conditions.map((c, i) => (
            <div key={c.key} className="rule-editor__row">
              <select
                className="review-field"
                aria-label={`Condition ${String(i + 1)}: what it tests`}
                value={c.field}
                onChange={(e) => {
                  const field = e.target.value as ConditionForm['field'];
                  changeCondition(c.key, {
                    field,
                    op: field === 'description' ? 'contains' : 'equals',
                  });
                }}
              >
                <option value="description">Description</option>
                <option value="amount">Amount</option>
              </select>
              <select
                className="review-field"
                aria-label={`Condition ${String(i + 1)}: how`}
                value={c.op}
                onChange={(e) => {
                  changeCondition(c.key, { op: e.target.value as ConditionOp });
                }}
              >
                {opOptions(c.field).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {c.field === 'description' ? (
                <input
                  className="review-field rule-editor__grow"
                  aria-label={`Condition ${String(i + 1)}: words`}
                  value={c.text}
                  onChange={(e) => {
                    changeCondition(c.key, { text: e.target.value });
                  }}
                />
              ) : (
                <>
                  <input
                    className="review-field rule-editor__amount"
                    inputMode="decimal"
                    aria-label={`Condition ${String(i + 1)}: amount`}
                    value={c.amountText}
                    onChange={(e) => {
                      changeCondition(c.key, { amountText: e.target.value });
                    }}
                  />
                  {c.op === 'between' && (
                    <>
                      <span>and</span>
                      <input
                        className="review-field rule-editor__amount"
                        inputMode="decimal"
                        aria-label={`Condition ${String(i + 1)}: largest amount`}
                        value={c.maxText}
                        onChange={(e) => {
                          changeCondition(c.key, { maxText: e.target.value });
                        }}
                      />
                    </>
                  )}
                </>
              )}
              {form.conditions.length > 1 && (
                <button
                  type="button"
                  className="split__remove"
                  aria-label={`Remove condition ${String(i + 1)}`}
                  onClick={() => {
                    change({ conditions: form.conditions.filter((x) => x.key !== c.key) });
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          <Button
            size="small"
            icon={Plus}
            onClick={() => {
              change({
                conditions: [...form.conditions, blankCondition(nextKey(form.conditions))],
              });
            }}
          >
            Condition
          </Button>
        </fieldset>

        <fieldset className="rule-editor__group">
          <legend>Then</legend>
          {!form.split ? (
            <div className="rule-editor__row">
              <input
                className="review-field rule-editor__grow"
                list={accountsList}
                aria-label="Account"
                placeholder="Type an account"
                value={form.accountText}
                onChange={(e) => {
                  const account = findAccount(e.target.value, view.accounts);
                  change({
                    accountText: e.target.value,
                    ...(account === null ? {} : { taxCodeId: account.defaultTaxCodeId }),
                  });
                }}
              />
              <select
                className="review-field"
                aria-label="GST code"
                value={form.taxCodeId ?? ''}
                onChange={(e) => {
                  change({ taxCodeId: e.target.value === '' ? null : e.target.value });
                }}
              >
                <option value="">No code</option>
                {view.taxCodes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortCode}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            form.parts.map((p, i) => (
              <div key={p.key} className="rule-editor__row">
                <input
                  className="review-field rule-editor__grow"
                  list={accountsList}
                  aria-label={`Split ${String(i + 1)}: account`}
                  value={p.accountText}
                  onChange={(e) => {
                    const account = findAccount(e.target.value, view.accounts);
                    change({
                      parts: form.parts.map((x) =>
                        x.key === p.key
                          ? {
                              ...x,
                              accountText: e.target.value,
                              ...(account === null ? {} : { taxCodeId: account.defaultTaxCodeId }),
                            }
                          : x,
                      ),
                    });
                  }}
                />
                <select
                  className="review-field"
                  aria-label={`Split ${String(i + 1)}: GST code`}
                  value={p.taxCodeId ?? ''}
                  onChange={(e) => {
                    change({
                      parts: form.parts.map((x) =>
                        x.key === p.key
                          ? { ...x, taxCodeId: e.target.value === '' ? null : e.target.value }
                          : x,
                      ),
                    });
                  }}
                >
                  <option value="">No code</option>
                  {view.taxCodes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.shortCode}
                    </option>
                  ))}
                </select>
                <input
                  className="review-field rule-editor__percent"
                  inputMode="decimal"
                  aria-label={`Split ${String(i + 1)}: percentage`}
                  value={p.percentText}
                  onChange={(e) => {
                    change({
                      parts: form.parts.map((x) =>
                        x.key === p.key ? { ...x, percentText: e.target.value } : x,
                      ),
                    });
                  }}
                />
                <span>%</span>
              </div>
            ))
          )}
          <div className="rule-editor__row">
            <button
              type="button"
              className="review__link"
              onClick={() => {
                change({ split: !form.split });
              }}
            >
              {form.split ? 'Use one account instead' : '+ Add a split'}
            </button>
            {form.split && (
              <button
                type="button"
                className="review__link"
                onClick={() => {
                  change({
                    parts: [
                      ...form.parts,
                      {
                        key: nextKey(form.parts),
                        accountText: '',
                        taxCodeId: null,
                        percentText: '',
                      },
                    ],
                  });
                }}
              >
                + Another part
              </button>
            )}
          </div>
          <label className="rule-editor__field">
            <span>Payee</span>
            <input
              className="review-field"
              list={contactsList}
              value={form.payeeText}
              onChange={(e) => {
                change({ payeeText: e.target.value });
              }}
            />
          </label>
          <label className="rule-editor__check">
            <input
              type="checkbox"
              checked={form.autoPost}
              onChange={(e) => {
                change({ autoPost: e.target.checked });
              }}
            />
            <span>Post matching lines by themselves, without waiting in To review</span>
          </label>
        </fieldset>

        <div className="rule-editor__test" aria-live="polite">
          <Button size="small" icon={FlaskConical} onClick={() => void runTest()}>
            Test
          </Button>
          {test !== null && (
            <span>
              Test: matches {plural(test.waiting, 'line', 'lines')} in To review and{' '}
              {plural(test.posted, 'posted line', 'posted lines')}.{' '}
              {test.lines.length > 0 && (
                <button
                  type="button"
                  className="review__link"
                  onClick={() => {
                    setSeeLines((v) => !v);
                  }}
                >
                  {seeLines ? 'Hide them' : 'See them'}
                </button>
              )}
            </span>
          )}
        </div>
        {test !== null && seeLines && (
          <ul className="rule-editor__lines">
            {test.lines.map((l) => (
              <li key={l.id}>
                <span>{formatDateAU(l.date)}</span> <span>{l.description}</span>{' '}
                <Amount cents={l.amount} />{' '}
                <span className="review__why">
                  {l.status === 'posted' ? 'posted' : 'in To review'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {problem !== null && (
          <p className="split__problem" role="alert">
            {problem}
          </p>
        )}

        <div className="rule-editor__actions">
          {ruleId !== null && (
            <Button
              variant="destructive"
              icon={Trash2}
              onClick={() => {
                setConfirmRemove(true);
              }}
            >
              Delete
            </Button>
          )}
          <span className="rule-editor__space" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="main" disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>
      {confirmRemove && (
        <ConfirmDialog
          title="Delete this rule?"
          change={`The rule "${form.name}" will be deleted. Lines it posted stay posted.`}
          confirmLabel="Delete rule"
          destructive
          onConfirm={() => void remove()}
          onCancel={() => {
            setConfirmRemove(false);
          }}
        />
      )}
    </SidePanel>
  );
}
