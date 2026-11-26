// The Rules page (spec 079, wireframe W05a Option 1): his rules in the order they are tried, with
// what each catches and what it gives. The order decides which rule wins when two fit, as in
// QuickBooks. A rule is turned on or off in its row, moved with the arrows (or Option with the up
// and down keys), and made or changed in the Edit rule panel.

import { ArrowDown, ArrowUp, ListChecks, Plus, Search } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import type { RulesView } from '@shared/bridge-contract';
import type { Rule } from '@shared/rule-types';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { PageToolbar } from '../layout/PageToolbar';
import { queryFromHash } from '../routes';
import { RuleEditor } from '../rules/RuleEditor';
import {
  bankAccountsText,
  emptyForm,
  formFromRule,
  thenText,
  whenText,
  type RuleForm,
} from '../rules/rule-text';
import { useBridgeQuery } from './use-bridge';
import '../review/review.css';
import '../rules/rules.css';

const loadRules = () => bridge()['rules.list']({});

type Editing = { readonly id: string | null; readonly form: RuleForm } | null;

export function RulesPage() {
  const { state, reload } = useBridgeQuery(loadRules, 'rules');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const view: RulesView | null = state.status === 'ready' ? state.value : null;

  // From To review's "Do this every time?": the rule comes filled in from the line (spec 082).
  const fromLine = queryFromHash(window.location.hash).get('from');
  useEffect(() => {
    if (fromLine === null || view === null || editing !== null) return;
    const api = bridge();
    void api['rules.offerFor']({ lineId: fromLine }).then((result) => {
      if (result.ok && result.value.offer !== null) {
        setEditing({ id: null, form: formFromRule(result.value.offer.rule, view) });
      }
      window.location.hash = '#/rules';
    });
  }, [fromLine, view, editing]);

  const move = async (rule: Rule, by: -1 | 1) => {
    const result = await bridge()['rules.move']({
      id: rule.id,
      toPosition: Math.max(0, rule.position + by),
    });
    if (result.ok) reload();
  };
  const toggle = async (rule: Rule) => {
    const result = await bridge()['rules.setActive']({ id: rule.id, active: !rule.active });
    if (result.ok) {
      setNotice(`${rule.name} is ${rule.active ? 'off' : 'on'}.`);
      reload();
    }
  };

  const rules = (view?.rules ?? []).filter((r) => {
    const text = search.trim().toLowerCase();
    return (
      text === '' || r.name.toLowerCase().includes(text) || whenText(r).toLowerCase().includes(text)
    );
  });
  const last = (view?.rules.length ?? 0) - 1;

  const columns: readonly TableColumn<Rule>[] =
    view === null
      ? []
      : [
          {
            key: 'order',
            header: 'Order',
            fit: true,
            cell: (rule) => (
              <span className="rules__order">
                <span>{rule.position + 1}</span>
                <button
                  type="button"
                  className="split__remove"
                  aria-label={`Move ${rule.name} up`}
                  disabled={rule.position === 0}
                  onClick={() => void move(rule, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="split__remove"
                  aria-label={`Move ${rule.name} down`}
                  disabled={rule.position === last}
                  onClick={() => void move(rule, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </button>
              </span>
            ),
          },
          {
            key: 'rule',
            header: 'Rule',
            cell: (rule) => (
              <span className="review__stack">
                <span>{rule.name}</span>
                {!rule.active && <span className="review__why">Off</span>}
              </span>
            ),
          },
          {
            key: 'accounts',
            header: 'Bank accounts',
            cell: (rule) => bankAccountsText(rule, view),
          },
          { key: 'when', header: 'When', cell: (rule) => whenText(rule) },
          { key: 'then', header: 'Then', cell: (rule) => thenText(rule, view) },
          {
            key: 'auto',
            header: 'Post by itself',
            fit: true,
            cell: (rule) => (rule.autoPost ? 'Yes' : 'No'),
          },
          {
            key: 'on',
            header: 'On',
            fit: true,
            cell: (rule) => (
              <input
                type="checkbox"
                aria-label={`${rule.name} is on`}
                checked={rule.active}
                onChange={() => void toggle(rule)}
              />
            ),
          },
          {
            key: 'edit',
            header: '',
            fit: true,
            cell: (rule) => (
              <Button
                size="small"
                aria-label={`Edit ${rule.name}`}
                onClick={() => {
                  setEditing({ id: rule.id, form: formFromRule(rule, view) });
                }}
              >
                Edit
              </Button>
            ),
          },
        ];

  const onRowKey = (event: KeyboardEvent<HTMLTableRowElement>, rule: Rule) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    void move(rule, event.key === 'ArrowUp' ? -1 : 1);
  };

  return (
    <div className="rules">
      <PageToolbar
        title="Rules"
        mainAction={
          view === null ? undefined : (
            <Button
              variant="main"
              icon={Plus}
              onClick={() => {
                setEditing({ id: null, form: emptyForm() });
              }}
            >
              New rule
            </Button>
          )
        }
      />
      {notice !== null && (
        <p className="review__notice" role="status">
          {notice}
        </p>
      )}
      <div className="rules__body">
        <div className="rules__list">
          {state.status === 'loading' && (
            <section className="page-surface" aria-busy="true" aria-label="Loading rules">
              <Table
                label="Rules"
                columns={[{ key: 'x', header: 'Rule', cell: () => null }]}
                rows={[]}
                rowKey={() => ''}
                loading
              />
            </section>
          )}
          {state.status === 'failed' && (
            <ErrorMessage
              message="The rules could not be read. Close the app and open it again."
              onRetry={reload}
            />
          )}
          {view !== null && view.rules.length === 0 && (
            <section className="page-surface">
              <EmptyState
                icon={ListChecks}
                message="No rules yet. A rule gives lines like these an account by itself, every time."
                action={
                  <Button
                    size="small"
                    onClick={() => {
                      setEditing({ id: null, form: emptyForm() });
                    }}
                  >
                    New rule
                  </Button>
                }
              />
            </section>
          )}
          {view !== null && view.rules.length > 0 && (
            <>
              <div className="review__filters">
                <label className="review__search rules__search">
                  <Search aria-hidden="true" className="review__search-icon" />
                  <input
                    type="search"
                    aria-label="Search rules"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                    }}
                  />
                </label>
              </div>
              <Table
                label="Rules"
                columns={columns}
                rows={rules}
                rowKey={(r) => r.id}
                onRowAction={(rule) => {
                  setEditing({ id: rule.id, form: formFromRule(rule, view) });
                }}
                onRowKeyDown={onRowKey}
              />
              <p className="review__keys">
                Rules are tried in order, and the first that fits a line wins. Use the arrows, or{' '}
                <kbd>⌥ ↑</kbd> <kbd>⌥ ↓</kbd> on a row, to change the order.
              </p>
            </>
          )}
        </div>
        {editing !== null && view !== null && (
          <RuleEditor
            key={editing.id ?? 'new'}
            view={view}
            ruleId={editing.id}
            initial={editing.form}
            onClose={() => {
              setEditing(null);
            }}
            onSaved={(name) => {
              setEditing(null);
              setNotice(`Saved the rule ${name}.`);
              reload();
            }}
            onRemoved={(name) => {
              setEditing(null);
              setNotice(`Deleted the rule ${name}.`);
              reload();
            }}
          />
        )}
      </div>
    </div>
  );
}
