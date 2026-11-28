import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookX,
  CircleHelp,
  PictureInPicture2,
  Search,
  SearchX,
  Star,
  Tags,
} from 'lucide-react';
import type { Guide } from '@shared/guide';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { useKeepOnScreen } from '../guides/KeepOnScreen';
import { useHelpPrefs } from '../guides/help-prefs';
import { deleteTag, setGuideTags, tagName, tagsOf, toggleStar } from '../guides/help-prefs-logic';
import { EmptyState } from '../components/EmptyState';
import { groupGuides } from '../guides/group-guides';
import { GUIDES } from '../guides/load-guides';
import { GuideBody } from '../guides/GuideBody';
import { searchGuides } from '../guides/search';
import { PageToolbar } from '../layout/PageToolbar';
import { guideHref, guideIdFromHash, routeHref } from '../routes';
import { useHash } from '../use-route';
import './HelpPage.css';

function backToList(): void {
  window.location.hash = routeHref('help');
}

// A link the person clicked is gone once the page changes, which would leave the keyboard with
// nowhere. When focus was lost like that, it moves to the page's reading surface. It must not
// scroll: a long guide would open part way down, with its title out of sight.
function useRescueFocus() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const active = document.activeElement;
    if (active === null || active === document.body) ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}

function StarButton({ guide }: { readonly guide: Guide }) {
  const { prefs, change } = useHelpPrefs();
  const starred = prefs.starred.includes(guide.id);
  return (
    <button
      type="button"
      className={starred ? 'help-star help-star--on' : 'help-star'}
      aria-label={`Star ${guide.title}`}
      aria-pressed={starred}
      onClick={() => {
        change((p) => toggleStar(p, guide.id));
      }}
    >
      <Star aria-hidden="true" />
    </button>
  );
}

function ManageTags({ onClose }: { readonly onClose: () => void }) {
  const { prefs, change } = useHelpPrefs();
  return (
    <Sheet title="Manage tags" onClose={onClose} actions={<Button onClick={onClose}>Done</Button>}>
      {prefs.tags.length === 0 ? (
        <p className="help-search__status">No tags yet. Open a guide and click Tags to add one.</p>
      ) : (
        <ul className="help-tags-list">
          {prefs.tags.map((t) => (
            <li key={t.name}>
              <span>
                #{t.name}{' '}
                <span className="help-guide__summary">
                  {t.guides.length === 1 ? '1 guide' : `${String(t.guides.length)} guides`}
                </span>
              </span>
              <Button
                size="small"
                aria-label={`Delete the tag ${t.name}`}
                onClick={() => {
                  change((p) => deleteTag(p, t.name));
                }}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function GuideList({ guides }: { readonly guides: readonly Guide[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [managing, setManaging] = useState(false);
  const { prefs } = useHelpPrefs();
  const surface = useRescueFocus();
  const filtered =
    filter === 'all'
      ? guides
      : filter === 'starred'
        ? guides.filter((g) => prefs.starred.includes(g.id))
        : guides.filter((g) =>
            prefs.tags.some((t) => t.name === filter && t.guides.includes(g.id)),
          );
  const found = searchGuides(filtered, query);
  const searching = query.trim() !== '';
  return (
    <>
      <PageToolbar
        title="Help"
        actions={
          <Button
            icon={Tags}
            onClick={() => {
              setManaging(true);
            }}
          >
            Manage tags
          </Button>
        }
      />
      {managing && (
        <ManageTags
          onClose={() => {
            setManaging(false);
          }}
        />
      )}
      <section ref={surface} tabIndex={-1} className="page-surface help-surface">
        {guides.length === 0 ? (
          <EmptyState icon={BookX} message="There are no guides yet." />
        ) : (
          <>
            <div className="help-search">
              <Search aria-hidden="true" className="help-search__icon" />
              <input
                type="search"
                className="help-search__input"
                aria-label="Search guides"
                placeholder="Search guides"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
              />
            </div>
            <fieldset className="help-filters">
              <legend className="visually-hidden">Show</legend>
              {[
                ['all', 'All guides'],
                ['starred', '★ Starred'],
                ...prefs.tags.map((t) => [t.name, `#${t.name}`]),
              ].map(([value = '', label = '']) => (
                <label key={value} className="help-filter">
                  <input
                    type="radio"
                    name="help-filter"
                    checked={filter === value}
                    onChange={() => {
                      setFilter(value);
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <p role="status" className="help-search__status">
              {searching
                ? `${String(found.length)} ${found.length === 1 ? 'guide matches' : 'guides match'}`
                : ''}
            </p>
            {found.length === 0 ? (
              <EmptyState
                icon={SearchX}
                message={
                  searching
                    ? `No guide mentions "${query.trim()}". Try one word, or a different word.`
                    : filter === 'starred'
                      ? 'No starred guides yet. Click the star beside a guide.'
                      : 'No guides have this tag.'
                }
                action={
                  <Button
                    size="small"
                    onClick={() => {
                      setQuery('');
                    }}
                  >
                    Clear search
                  </Button>
                }
              />
            ) : (
              groupGuides(found).map(({ group, guides: inGroup }, index) => (
                <section key={group} aria-labelledby={`help-group-${String(index)}`}>
                  <h2 id={`help-group-${String(index)}`} className="help-group__title">
                    {group}
                  </h2>
                  <ul className="help-group__list">
                    {inGroup.map((guide) => (
                      <li key={guide.id} className="help-guide-row">
                        <StarButton guide={guide} />
                        <a href={guideHref(guide.id)} className="help-guide">
                          <span className="help-guide__title">{guide.title}</span>
                          <span className="help-guide__summary">{guide.summary}</span>
                          {tagsOf(prefs, guide.id).length > 0 && (
                            <span className="help-guide__tags">
                              {tagsOf(prefs, guide.id)
                                .map((t) => `#${t}`)
                                .join(' ')}
                            </span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </section>
    </>
  );
}

function BackButton() {
  return (
    <Button icon={ArrowLeft} onClick={backToList}>
      All guides
    </Button>
  );
}

function TagSheet({ guide, onClose }: { readonly guide: Guide; readonly onClose: () => void }) {
  const { prefs, change } = useHelpPrefs();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set(tagsOf(prefs, guide.id)));
  const [typed, setTyped] = useState('');
  const names = [...new Set([...prefs.tags.map((t) => t.name), ...chosen])];
  const add = () => {
    const name = tagName(typed);
    if (name === null) return;
    setChosen((c) => new Set([...c, name]));
    setTyped('');
  };
  return (
    <Sheet
      title={`Tags for ${guide.title}`}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="main"
            onClick={() => {
              change((p) => setGuideTags(p, guide.id, [...chosen]));
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="help-tag-sheet">
        {names.map((name) => (
          <label key={name} className="help-tag-choice">
            <input
              type="checkbox"
              checked={chosen.has(name)}
              onChange={() => {
                setChosen((c) => {
                  const next = new Set(c);
                  if (next.has(name)) next.delete(name);
                  else next.add(name);
                  return next;
                });
              }}
            />
            #{name}
          </label>
        ))}
        <div className="help-tag-new">
          <input
            className="help-search__input help-tag-new__input"
            aria-label="New tag"
            placeholder="New tag, such as quarter end"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button size="small" onClick={add}>
            Add tag
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function GuideReader({ guide }: { readonly guide: Guide }) {
  const surface = useRescueFocus();
  const { prefs, change } = useHelpPrefs();
  const { keep } = useKeepOnScreen();
  const [tagging, setTagging] = useState(false);
  const starred = prefs.starred.includes(guide.id);
  const tags = tagsOf(prefs, guide.id);
  return (
    <>
      <PageToolbar
        title={guide.title}
        actions={
          <>
            <BackButton />
            <Button
              icon={Star}
              aria-pressed={starred}
              onClick={() => {
                change((p) => toggleStar(p, guide.id));
              }}
            >
              {starred ? 'Starred' : 'Star'}
            </Button>
            <Button
              icon={Tags}
              onClick={() => {
                setTagging(true);
              }}
            >
              Tags…
            </Button>
            <Button
              icon={PictureInPicture2}
              onClick={() => {
                keep(guide.id);
              }}
            >
              Keep on screen
            </Button>
          </>
        }
      />
      {tagging && (
        <TagSheet
          guide={guide}
          onClose={() => {
            setTagging(false);
          }}
        />
      )}
      <article ref={surface} tabIndex={-1} className="page-surface help-surface help-reader">
        <p className="help-reader__summary">{guide.summary}</p>
        {tags.length > 0 && (
          <p className="help-guide__tags">{tags.map((t) => `#${t}`).join(' ')}</p>
        )}
        <GuideBody guide={guide} />
      </article>
    </>
  );
}

function UnknownGuide() {
  return (
    <>
      <PageToolbar title="Help" actions={<BackButton />} />
      <section className="page-surface help-surface">
        <EmptyState
          icon={CircleHelp}
          message="That guide does not exist. It may have been renamed or removed."
          action={<BackButton />}
        />
      </section>
    </>
  );
}

/** Help: guides grouped by feature with search, and a plain reading page for one guide. */
export function HelpPage({ guides = GUIDES }: { readonly guides?: readonly Guide[] }) {
  const guideId = guideIdFromHash(useHash());
  if (guideId === null) return <GuideList guides={guides} />;
  const guide = guides.find((g) => g.id === guideId);
  return guide === undefined ? <UnknownGuide /> : <GuideReader key={guide.id} guide={guide} />;
}
