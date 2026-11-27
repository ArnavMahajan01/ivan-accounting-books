// To review (specs 068 to 075, wireframe W05 Option 1 with Option 3's "Post all suggested"): the
// imported bank lines waiting for an account, laid out like his QuickBooks "For review" tab. Each
// row is a match with an entry already in the books, a transfer, or an account and GST code he
// chooses. He posts one (Post, or Enter), the ones ticked (⌘Return), or every suggested one, and
// Undo (or ⌘Z) takes the last post back.

import { Inbox, Search } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { formatDateAU } from '@shared/dates';
import { pageHash } from '@shared/pages';
import type {
  PostOutcome,
  ReviewAction,
  ReviewLineView,
  ReviewShow,
  ReviewView,
} from '@shared/views';
import { REVIEW_PAGE_LIMIT } from '@shared/views';
import { bridge } from '../bridge';
import { useBooksState } from '../books-state';
import { Amount } from '../components/Amount';
import { Button } from '../components/Button';
import { DateCell } from '../components/DateCell';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, type TableColumn } from '../components/Table';
import { plural } from '../import/import-text';
import { PageToolbar } from '../layout/PageToolbar';
import { formatCents } from '@shared/money';
import { SplitSheet, type SplitPartInput } from '../review/SplitSheet';
import { InvoiceSplitSheet } from '../invoices/InvoiceSplitSheet';
import { TransferSheet } from '../review/TransferSheet';
import {
  REASON_TEXT,
  accountLabel,
  actionFor,
  findAccount,
  followsFound,
  hasSuggestion,
  initialDraft,
  outcomeText,
  payeeIdFor,
  payeeSavedText,
  spentAndReceived,
  splitRuleText,
  type RowDraft,
} from '../review/review-text';
import { useBridgeQuery } from './use-bridge';
import { useDebounced } from './use-debounced';
import '../review/review.css';

const SHOWS: readonly { value: ReviewShow; label: string; count: keyof ReviewView['counts'] }[] = [
  { value: 'all', label: 'All', count: 'all' },
  { value: 'suggested', label: 'Suggested', count: 'suggested' },
  { value: 'no-suggestion', label: 'No suggestion', count: 'noSuggestion' },
];

/** What the page says after an action, with the action that takes it back. */
type Notice =
  | { readonly kind: 'posted'; readonly text: string; readonly lineIds: readonly string[] }
  | {
      readonly kind: 'payee';
      readonly text: string;
      readonly contactId: string;
      readonly words: string;
    }
  | { readonly kind: 'info'; readonly text: string }
  | { readonly kind: 'problem'; readonly text: string };

const COULD_NOT = 'That could not be done, and nothing was changed. Try again.';

/** How long a row takes to leave, from the motion token (1ms under reduced motion). */
function motionMs(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--motion-duration');
  const ms = Number.parseFloat(value);
  return Number.isFinite(ms) ? (value.trim().endsWith('ms') ? ms : ms * 1000) : 0;
}

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

const SKELETON_COLUMNS: readonly TableColumn<ReviewLineView>[] = [
  'Date',
  'Bank description',
  'Spent',
  'Received',
  'Match or account',
  'Post',
].map((header) => ({ key: header, header, cell: () => null }));

export function ToReviewPage() {
  const { refreshReviewCount } = useBooksState();
  const accountsListId = useId();
  const contactsListId = useId();
  const [bankAccountId, setBankAccountId] = useState('');
  const [show, setShow] = useState<ReviewShow>('all');
  const [search, setSearch] = useState('');
  const settledSearch = useDebounced(search.trim(), 250);
  const [drafts, setDrafts] = useState<ReadonlyMap<string, RowDraft>>(new Map());
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [offer, setOffer] = useState<{ lineId: string; words: string } | null>(null);
  const [sheet, setSheet] = useState<{
    kind: 'split' | 'transfer' | 'invoices';
    lineId: string;
  } | null>(null);
  const accountInputs = useRef(new Map<string, HTMLInputElement>());

  const input = useMemo(
    () => ({
      ...(bankAccountId === '' ? {} : { bankAccountId }),
      ...(show === 'all' ? {} : { show }),
      ...(settledSearch === '' ? {} : { search: settledSearch }),
    }),
    [bankAccountId, show, settledSearch],
  );
  const { state, loading, reload } = useBridgeQuery(
    () => bridge()['review.list'](input),
    JSON.stringify(input),
  );
  const view = state.status === 'ready' ? state.value : null;
  const lines = view?.lines ?? [];

  const draftOf = (line: ReviewLineView): RowDraft =>
    drafts.get(line.id) ??
    (view === null ? initialDraft(line, { accounts: [] }) : initialDraft(line, view));
  const setDraft = (line: ReviewLineView, patch: Partial<RowDraft>) => {
    setDrafts((current) => new Map(current).set(line.id, { ...draftOf(line), ...patch }));
  };

  const shownIds = new Set(lines.map((l) => l.id));
  const selectedHere = new Set([...selected].filter((id) => shownIds.has(id)));
  const suggestedHere = lines.filter(
    (l) =>
      hasSuggestion(l) && (followsFound(l, draftOf(l)) !== null || draftOf(l).accountText !== ''),
  );
  const filtered = bankAccountId !== '' || show !== 'all' || search.trim() !== '';
  // A row names its bank account only when the list holds lines from more than one.
  const severalAccounts = new Set(lines.map((l) => l.bankAccountId)).size > 1;

  /** After the books change: the rows leave, then the list and the sidebar's count are asked again. */
  const afterChange = (gone: readonly string[]) => {
    setLeaving(new Set(gone));
    setSelected((current) => new Set([...current].filter((id) => !gone.includes(id))));
    window.setTimeout(() => {
      setLeaving(new Set());
      reload();
    }, motionMs());
    refreshReviewCount();
  };

  const run = async (actions: readonly ReviewAction[]) => {
    if (actions.length === 0 || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await bridge()['review.post']({ actions: [...actions] });
      if (!result.ok) {
        setNotice({ kind: 'problem', text: COULD_NOT });
        return;
      }
      report(result.value);
      // One line posted with an account he chose: offer to do it every time (spec 082).
      const only = actions[0];
      if (
        actions.length === 1 &&
        only?.kind === 'account' &&
        result.value.posted.includes(only.lineId)
      ) {
        const api = bridge();
        const offered = await api['rules.offerFor']({ lineId: only.lineId });
        if (offered.ok && offered.value.offer !== null) {
          setOffer({ lineId: only.lineId, words: offered.value.offer.words });
        }
      }
    } catch {
      setNotice({ kind: 'problem', text: COULD_NOT });
    } finally {
      setBusy(false);
    }
  };

  const report = (outcome: PostOutcome) => {
    setOffer(null);
    const gone = [...outcome.posted, ...outcome.alsoPosted];
    setNotice(
      gone.length === 0
        ? { kind: 'problem', text: outcomeText(outcome) }
        : { kind: 'posted', text: outcomeText(outcome), lineIds: outcome.posted },
    );
    if (gone.length > 0) afterChange(gone);
  };

  const postRow = (line: ReviewLineView) => {
    if (view !== null) void run([actionFor(line, draftOf(line), view)]);
  };
  const postSelected = () => {
    if (view !== null) {
      void run(
        lines.filter((l) => selectedHere.has(l.id)).map((l) => actionFor(l, draftOf(l), view)),
      );
    }
  };
  const postSuggested = () => {
    if (view !== null) void run(suggestedHere.map((l) => actionFor(l, draftOf(l), view)));
  };

  const undo = async () => {
    if (notice === null || busy) return;
    setBusy(true);
    try {
      if (notice.kind === 'posted') {
        const result = await bridge()['review.undo']({ lineIds: [...notice.lineIds] });
        if (!result.ok) setNotice({ kind: 'problem', text: COULD_NOT });
        else if (result.value.kind === 'undone') {
          setNotice({
            kind: 'info',
            text: `Undone. ${plural(result.value.lines, 'line is', 'lines are')} back in To review.`,
          });
          refreshReviewCount();
          reload();
        } else {
          setNotice({
            kind: 'problem',
            text:
              result.value.reason === 'locked'
                ? 'That is in a locked period now, so it can no longer be undone.'
                : 'That has already been undone.',
          });
        }
      } else if (notice.kind === 'payee') {
        const result = await bridge()['review.undoPayee']({
          contactId: notice.contactId,
          words: notice.words,
        });
        setNotice(
          result.ok && result.value.undone
            ? { kind: 'info', text: 'Undone. The From/To was not saved.' }
            : { kind: 'problem', text: 'That has already been undone.' },
        );
        reload();
      }
    } catch {
      setNotice({ kind: 'problem', text: COULD_NOT });
    } finally {
      setBusy(false);
    }
  };

  const savePayee = async (line: ReviewLineView, text: string) => {
    const name = text.trim();
    if (name === '' || name.toLowerCase() === line.payee?.name.toLowerCase()) return;
    try {
      const result = await bridge()['review.savePayee']({ lineId: line.id, name });
      if (!result.ok) {
        setNotice({ kind: 'problem', text: COULD_NOT });
      } else if (result.value.kind === 'saved') {
        setNotice({
          kind: 'payee',
          text: payeeSavedText(result.value),
          contactId: result.value.contactId,
          words: result.value.words,
        });
        reload();
      } else if (result.value.reason === 'no-words') {
        setNotice({
          kind: 'info',
          text: 'This line’s description has no words to remember, so the From/To applies to this line only.',
        });
      }
    } catch {
      setNotice({ kind: 'problem', text: COULD_NOT });
    }
  };

  const saveSplit = async (line: ReviewLineView, parts: readonly SplitPartInput[]) => {
    const payeeId = view === null ? null : payeeIdFor(line, draftOf(line), view.contacts);
    try {
      const result = await bridge()['review.split']({
        lineId: line.id,
        parts: [...parts],
        payeeId,
      });
      if (!result.ok) return COULD_NOT;
      const failed = result.value.failed[0];
      if (failed !== undefined) return outcomeText(result.value);
      setSheet(null);
      report(result.value);
      return null;
    } catch {
      return COULD_NOT;
    }
  };

  // A deposit paying invoices from the Admin Dashboard (spec 129).
  const saveInvoices = async (
    line: ReviewLineView,
    invoices: readonly { number: string; amount: number }[],
    leftover: { accountId: string; taxCodeId: string | null } | null,
  ) => {
    try {
      const result = await bridge()['review.matchInvoices']({
        lineId: line.id,
        invoices: invoices.map((i) => ({ ...i })),
        leftover,
      });
      if (!result.ok) return COULD_NOT;
      if (result.value.failed.length > 0) return outcomeText(result.value);
      setSheet(null);
      report(result.value);
      return null;
    } catch {
      return COULD_NOT;
    }
  };

  /** The suggested invoice, when this deposit pays all or part of it. */
  const invoiceFor = (line: ReviewLineView) => {
    const first = line.invoices[0];
    return first !== undefined && draftOf(line).mode === 'auto' && line.amount <= first.owing
      ? first
      : null;
  };

  const saveTransfer = async (line: ReviewLineView, otherBankAccountId: string) => {
    try {
      const result = await bridge()['review.post']({
        actions: [{ kind: 'transfer', lineId: line.id, otherBankAccountId }],
      });
      if (!result.ok) return COULD_NOT;
      if (result.value.failed.length > 0) return outcomeText(result.value);
      setSheet(null);
      report(result.value);
      return null;
    } catch {
      return COULD_NOT;
    }
  };

  const onRowKey = (event: KeyboardEvent<HTMLTableRowElement>, line: ReviewLineView) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 's' || key === 't') {
      event.preventDefault();
      setSheet({ kind: key === 's' ? 'split' : 'transfer', lineId: line.id });
      return;
    }
    // Any other letter or digit starts typing an account (wireframe: "type to change the account").
    if (event.key.length === 1 && /\S/.test(event.key)) {
      event.preventDefault();
      setDraft(line, { mode: 'account', accountText: event.key });
      window.setTimeout(() => accountInputs.current.get(line.id)?.focus(), 0);
    }
  };

  const columns: readonly TableColumn<ReviewLineView>[] =
    view === null
      ? SKELETON_COLUMNS
      : [
          { key: 'date', header: 'Date', fit: true, cell: (line) => <DateCell date={line.date} /> },
          {
            key: 'description',
            header: 'Bank description',
            cell: (line) => (
              <span className="review__stack">
                <span className="review__description">{line.description}</span>
                {severalAccounts && <span className="review__sub">{line.bankAccountName}</span>}
                {followsFound(line, draftOf(line)) === null && (
                  <input
                    className="review-field review__payee"
                    list={contactsListId}
                    placeholder="From/To"
                    aria-label={`From/To for ${line.description}`}
                    value={draftOf(line).payeeText}
                    onChange={(event) => {
                      setDraft(line, { payeeText: event.target.value });
                    }}
                    onBlur={(event) => {
                      void savePayee(line, event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                  />
                )}
              </span>
            ),
          },
          {
            key: 'spent',
            header: 'Spent',
            align: 'end',
            fit: true,
            cell: (line) => {
              const { spent } = spentAndReceived(line.amount);
              return spent === null ? null : <Amount cents={spent} />;
            },
          },
          {
            key: 'received',
            header: 'Received',
            align: 'end',
            fit: true,
            cell: (line) => {
              const { received } = spentAndReceived(line.amount);
              return received === null ? null : <Amount cents={received} />;
            },
          },
          {
            key: 'account',
            header: 'Match or account',
            cell: (line) => accountCell(line),
          },
          {
            key: 'post',
            header: '',
            fit: true,
            cell: (line) => {
              const invoice = invoiceFor(line);
              return (
                <Button
                  size="small"
                  disabled={busy}
                  aria-label={
                    invoice === null
                      ? `Post ${line.description}`
                      : `Match ${line.description} to ${invoice.number}`
                  }
                  onClick={() => {
                    if (invoice === null) postRow(line);
                    else
                      void saveInvoices(
                        line,
                        [{ number: invoice.number, amount: line.amount }],
                        null,
                      );
                  }}
                >
                  {invoice !== null || followsFound(line, draftOf(line)) === 'match'
                    ? 'Match'
                    : 'Post'}
                </Button>
              );
            },
          },
        ];

  // A plain function, not a component, so the fields keep their focus while he types.
  function accountCell(line: ReviewLineView) {
    if (view === null) return null;
    const draft = draftOf(line);
    const found = followsFound(line, draft);
    const useAccount = (
      <button
        type="button"
        className="review__link"
        onClick={() => {
          setDraft(line, { mode: 'account' });
          window.setTimeout(() => accountInputs.current.get(line.id)?.focus(), 0);
        }}
      >
        Choose an account instead
      </button>
    );
    const invoice = line.invoices[0];
    if (invoice !== undefined && draft.mode === 'auto') {
      return (
        <span className="review__account-cell">
          <span className="review__found">
            <span className="review__tag">Invoice</span> {invoice.number} · {invoice.customer}
          </span>
          <span className="review__why">
            {invoice.because === 'number'
              ? 'its number is in the description'
              : 'owes exactly this amount'}
            {invoice.owing === line.amount ? '' : `, ${formatCents(invoice.owing)} owed`}
          </span>
          <span>
            <button
              type="button"
              className="review__link"
              onClick={() => {
                setSheet({ kind: 'invoices', lineId: line.id });
              }}
            >
              Split across invoices…
            </button>
          </span>
          {useAccount}
        </span>
      );
    }
    if (found === 'match' && line.match !== null) {
      return (
        <span className="review__account-cell">
          <span className="review__found">
            <span className="review__tag">Match</span> {line.match.text}
          </span>
          <span className="review__why">
            same amount in your books
            {line.match.date === line.date ? '' : `, ${formatDateAU(line.match.date)}`}
          </span>
          {useAccount}
        </span>
      );
    }
    if (found === 'transfer' && line.transfer !== null) {
      const other = line.transfer;
      return (
        <span className="review__account-cell">
          <span className="review__found">
            <span className="review__tag">Pair</span>
            <button
              type="button"
              className="review__link"
              onClick={() => {
                setSheet({ kind: 'transfer', lineId: line.id });
              }}
            >
              Transfer {line.amount < 0 ? 'to' : 'from'} {other.bankAccountName}…
            </button>
          </span>
          <span className="review__why">
            {other.alreadyPosted ? 'posted' : 'same amount'} in {other.bankAccountName} on{' '}
            {formatDateAU(other.date)}
          </span>
          {useAccount}
        </span>
      );
    }
    const splitRule = draft.mode === 'auto' ? (line.suggestion?.rule?.split ?? null) : null;
    if (splitRule !== null) {
      return (
        <span className="review__account-cell">
          <span className="review__found">
            <span className="review__tag">Split</span> {splitRuleText(splitRule)}
          </span>
          <span className="review__why">from your rule</span>
          {useAccount}
        </span>
      );
    }
    const account = findAccount(draft.accountText, view.accounts);
    const why =
      draft.accountText.trim() !== '' && account === null
        ? 'choose an account from the list'
        : line.suggestion !== null && account?.id === line.suggestion.accountId
          ? REASON_TEXT[line.suggestion.reason]
          : '';
    return (
      <span className="review__account-cell">
        <input
          ref={(el) => {
            if (el === null) accountInputs.current.delete(line.id);
            else accountInputs.current.set(line.id, el);
          }}
          className="review-field review__account"
          list={accountsListId}
          placeholder="Type an account"
          title={draft.accountText === '' ? undefined : draft.accountText}
          aria-label={`Account for ${line.description}`}
          aria-invalid={draft.accountText.trim() !== '' && account === null}
          value={draft.accountText}
          onChange={(event) => {
            const accountText = event.target.value;
            const chosen = findAccount(accountText, view.accounts);
            setDraft(line, {
              mode: 'account',
              accountText,
              ...(chosen === null ? {} : { taxCodeId: chosen.defaultTaxCodeId }),
            });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.metaKey && account !== null) {
              event.preventDefault();
              postRow(line);
            }
          }}
        />
        <span className="review__under">
          <select
            className="review-field review__gst"
            aria-label={`GST code for ${line.description}`}
            value={draft.taxCodeId ?? ''}
            onChange={(event) => {
              setDraft(line, {
                mode: 'account',
                taxCodeId: event.target.value === '' ? null : event.target.value,
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
          <button
            type="button"
            className="review__link"
            aria-label={`Split ${line.description}`}
            onClick={() => {
              setSheet({ kind: 'split', lineId: line.id });
            }}
          >
            Split…
          </button>
          <button
            type="button"
            className="review__link"
            aria-label={`Transfer ${line.description}`}
            onClick={() => {
              setSheet({ kind: 'transfer', lineId: line.id });
            }}
          >
            Transfer…
          </button>
        </span>
        {why !== '' && <span className="review__why">{why}</span>}
        {(line.match !== null || line.transfer !== null) && (
          <button
            type="button"
            className="review__link"
            onClick={() => {
              setDraft(line, { mode: 'auto' });
            }}
          >
            {line.match !== null ? 'Use the match' : 'Use the transfer'}
          </button>
        )}
      </span>
    );
  }

  const sheetLine = sheet === null ? undefined : lines.find((l) => l.id === sheet.lineId);
  const count = selectedHere.size;

  return (
    <div
      className="review"
      onKeyDownCapture={(event) => {
        if (event.metaKey && event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          postSelected();
        } else if (
          event.metaKey &&
          !event.shiftKey &&
          event.key.toLowerCase() === 'z' &&
          !isTextField(event.target)
        ) {
          event.preventDefault();
          event.stopPropagation();
          void undo();
        }
      }}
    >
      <PageToolbar
        title="To review"
        status={
          view !== null && view.waiting > 0 ? (
            <span className="review__count">{plural(view.waiting, 'line', 'lines')}</span>
          ) : undefined
        }
        actions={
          <>
            <Button
              onClick={() => {
                window.location.hash = pageHash('rules');
              }}
            >
              Rules
            </Button>
            {count > 0 && suggestedHere.length > 0 && (
              <Button disabled={busy} onClick={postSuggested}>
                Post all suggested ({suggestedHere.length})
              </Button>
            )}
          </>
        }
        mainAction={
          view !== null && view.waiting > 0 ? (
            count > 0 ? (
              <Button variant="main" disabled={busy} onClick={postSelected}>
                Post {count} selected
              </Button>
            ) : suggestedHere.length > 0 ? (
              <Button variant="main" disabled={busy} onClick={postSuggested}>
                Post all suggested ({suggestedHere.length})
              </Button>
            ) : undefined
          ) : undefined
        }
      />

      {view !== null && (
        <>
          <datalist id={accountsListId}>
            {view.accounts.map((a) => (
              <option key={a.id} value={accountLabel(a)} />
            ))}
          </datalist>
          <datalist id={contactsListId}>
            {view.contacts.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </>
      )}

      {view !== null && view.waiting > 0 && (
        <div className="review__filters" role="search" aria-label="Filter bank lines">
          <select
            aria-label="Bank account"
            value={bankAccountId}
            onChange={(event) => {
              setBankAccountId(event.target.value);
            }}
          >
            <option value="">All bank accounts</option>
            {view.bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <fieldset className="review__show">
            <legend className="visually-hidden">Show</legend>
            {SHOWS.map((s) => (
              <label key={s.value} className="review__show-option">
                <input
                  type="radio"
                  name="review-show"
                  value={s.value}
                  checked={show === s.value}
                  onChange={() => {
                    setShow(s.value);
                  }}
                />
                <span>
                  {s.label} {view.counts[s.count].toLocaleString('en-AU')}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="review__search">
            <Search aria-hidden="true" className="review__search-icon" />
            <input
              type="search"
              aria-label="Search descriptions and amounts"
              placeholder="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          </label>
        </div>
      )}

      {notice !== null && (
        <div
          className={
            notice.kind === 'problem' ? 'review__notice review__notice--problem' : 'review__notice'
          }
          role={notice.kind === 'problem' ? 'alert' : 'status'}
        >
          <span>{notice.text}</span>
          {(notice.kind === 'posted' || notice.kind === 'payee') && (
            <Button
              size="small"
              disabled={busy}
              onClick={() => {
                void undo();
              }}
            >
              Undo
            </Button>
          )}
          {offer !== null && notice.kind === 'posted' && (
            <span className="review__offer">
              Do this every time for &ldquo;{offer.words}&rdquo;?
              <Button
                size="small"
                onClick={() => {
                  window.location.hash = `${pageHash('rules')}?from=${offer.lineId}`;
                }}
              >
                New rule from this line
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setOffer(null);
                }}
              >
                Not now
              </Button>
            </span>
          )}
        </div>
      )}

      <div className="review__body">
        {state.status === 'loading' && (
          <section className="page-surface" aria-busy="true" aria-label="Loading bank lines">
            <Table
              label="Bank lines"
              columns={SKELETON_COLUMNS}
              rows={[]}
              rowKey={() => ''}
              loading
            />
          </section>
        )}
        {state.status === 'failed' && (
          <ErrorMessage
            message="The bank lines could not be read. Close the app and open it again."
            onRetry={reload}
          />
        )}
        {view !== null && view.waiting === 0 && (
          <section className="page-surface">
            <EmptyState
              icon={Inbox}
              message="Nothing to review. Import a file from the Bank page."
              action={
                <Button
                  size="small"
                  onClick={() => {
                    window.location.hash = pageHash('bank');
                  }}
                >
                  Go to Bank
                </Button>
              }
            />
          </section>
        )}
        {view !== null && view.waiting > 0 && lines.length === 0 && (
          <section className="page-surface">
            <EmptyState
              icon={Inbox}
              message="No lines match these filters."
              action={
                filtered ? (
                  <Button
                    size="small"
                    onClick={() => {
                      setBankAccountId('');
                      setShow('all');
                      setSearch('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </section>
        )}
        {view !== null && lines.length > 0 && (
          <div
            className={loading ? 'review__table review__table--busy' : 'review__table'}
            aria-busy={loading}
          >
            <Table
              label="Bank lines"
              columns={columns}
              rows={lines}
              rowKey={(line) => line.id}
              rowLabel={(line) => line.description}
              selection={{ selected: selectedHere, onChange: setSelected }}
              onRowAction={postRow}
              onRowKeyDown={onRowKey}
              rowClassName={(line) => (leaving.has(line.id) ? 'review__row--leaving' : undefined)}
            />
          </div>
        )}
        {view !== null &&
          view.counts[SHOWS.find((s) => s.value === show)?.count ?? 'all'] > lines.length && (
            <p className="review__more">
              Showing the oldest {REVIEW_PAGE_LIMIT.toLocaleString('en-AU')} lines. Post these to
              see the rest.
            </p>
          )}
      </div>

      {view !== null && view.waiting > 0 && (
        <p className="review__keys" aria-label="Keyboard shortcuts">
          <kbd>↑</kbd> <kbd>↓</kbd> move <kbd>Space</kbd> select <kbd>Return</kbd> post{' '}
          <kbd>⌘ Return</kbd> post selected · type to choose the account <kbd>S</kbd> split{' '}
          <kbd>T</kbd> transfer <kbd>⌘ Z</kbd> undo
        </p>
      )}

      {sheet !== null && sheetLine !== undefined && view !== null && sheet.kind === 'split' && (
        <SplitSheet
          line={sheetLine}
          view={view}
          firstAccountText={
            followsFound(sheetLine, draftOf(sheetLine)) === null
              ? draftOf(sheetLine).accountText
              : ''
          }
          firstTaxCodeId={draftOf(sheetLine).taxCodeId}
          onCancel={() => {
            setSheet(null);
          }}
          onSave={(parts) => saveSplit(sheetLine, parts)}
        />
      )}
      {sheet !== null && sheetLine !== undefined && view !== null && sheet.kind === 'invoices' && (
        <InvoiceSplitSheet
          line={sheetLine}
          view={view}
          onCancel={() => {
            setSheet(null);
          }}
          onSave={(invoices, leftover) => saveInvoices(sheetLine, invoices, leftover)}
        />
      )}
      {sheet !== null && sheetLine !== undefined && view !== null && sheet.kind === 'transfer' && (
        <TransferSheet
          line={sheetLine}
          view={view}
          onCancel={() => {
            setSheet(null);
          }}
          onSave={(other) => saveTransfer(sheetLine, other)}
        />
      )}
    </div>
  );
}
