import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookX, CircleHelp, Search, SearchX } from 'lucide-react';
import type { Guide } from '@shared/guide';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { groupGuides } from '../guides/group-guides';
import { GUIDES, guideImageUrl } from '../guides/load-guides';
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

function GuideList({ guides }: { readonly guides: readonly Guide[] }) {
  const [query, setQuery] = useState('');
  const surface = useRescueFocus();
  const found = searchGuides(guides, query);
  const searching = query.trim() !== '';
  return (
    <>
      <PageToolbar title="Help" />
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
            <p role="status" className="help-search__status">
              {searching
                ? `${String(found.length)} ${found.length === 1 ? 'guide matches' : 'guides match'}`
                : ''}
            </p>
            {found.length === 0 ? (
              <EmptyState
                icon={SearchX}
                message={`No guide mentions "${query.trim()}". Try one word, or a different word.`}
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
                      <li key={guide.id}>
                        <a href={guideHref(guide.id)} className="help-guide">
                          <span className="help-guide__title">{guide.title}</span>
                          <span className="help-guide__summary">{guide.summary}</span>
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

function GuideReader({ guide }: { readonly guide: Guide }) {
  const surface = useRescueFocus();
  return (
    <>
      <PageToolbar title={guide.title} actions={<BackButton />} />
      <article ref={surface} tabIndex={-1} className="page-surface help-surface help-reader">
        <p className="help-reader__summary">{guide.summary}</p>
        {guide.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="help-reader__section">
            <h2 className="help-reader__heading">{section.heading}</h2>
            {section.paragraphs.map((text, index) => (
              <p key={index} className="help-reader__text">
                {text}
              </p>
            ))}
            {section.steps.length > 0 && (
              <ol className="help-reader__steps">
                {section.steps.map((step, index) => {
                  const url = step.image === undefined ? undefined : guideImageUrl(step.image.file);
                  return (
                    <li key={index}>
                      {step.text}
                      {step.image !== undefined && url !== undefined && (
                        <img
                          src={url}
                          alt={step.image.description}
                          className="help-reader__image"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        ))}
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
