import { Building2, CircleCheck, Cloud, Landmark, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { COMING_LATER } from './EmptyPage';
import './HomePage.css';

interface Step {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly detail: string;
}

// The "Brand-new book" state of Home, Option 2, Next Steps (wireframe/2111-app-shell-and-home/).
const GETTING_STARTED: readonly Step[] = [
  {
    icon: Building2,
    title: 'Add your business details',
    detail: 'Your business name, ABN, GST basis and BAS frequency.',
  },
  {
    icon: Landmark,
    title: 'Add your bank accounts',
    detail: 'Your Westpac accounts, by name and last four digits.',
  },
  {
    icon: Upload,
    title: 'No bank lines yet',
    detail: 'Download a statement file (OFX or CSV) from Westpac Online Banking, then import it.',
  },
  {
    icon: Cloud,
    title: 'Connect Google',
    detail: 'Only needed when you want to share sheets with your accountant.',
  },
];

/** What Home shows for books with nothing in them yet. */
export function GettingStarted() {
  return (
    <section className="page-surface home-start" aria-labelledby="home-start-title">
      <h2 id="home-start-title" className="home-start__title">
        Getting started
      </h2>
      <ol className="home-start__list">
        {GETTING_STARTED.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="home-start__step">
              <span className="home-start__number" aria-hidden="true">
                {index + 1}
              </span>
              <Icon aria-hidden="true" className="home-start__icon" />
              <div className="home-start__text">
                <span className="home-start__step-title">{step.title}</span>
                <span className="home-start__detail">{step.detail}</span>
              </div>
              <span className="home-start__later">{COMING_LATER}</span>
            </li>
          );
        })}
      </ol>
      <p className="home-start__done">
        <CircleCheck aria-hidden="true" className="home-start__done-icon" />
        Your books are set up on this Mac and work offline.
      </p>
    </section>
  );
}
