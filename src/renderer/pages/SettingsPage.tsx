import { Info } from 'lucide-react';
import type { AppInfo, DataStatus } from '@shared/bridge-contract';
import { PageToolbar } from '../layout/PageToolbar';
import { COMING_LATER } from './EmptyPage';
import { describeData, loadDataStatus, loadInfo } from './data-status';
import { useBridge } from './use-bridge';
import './SettingsPage.css';

// Option 3, Status Cards (wireframe/2111-settings/): Backups and Google first, because they are the
// two things that can quietly go wrong. Only About works in Demo 1.
const LATER_CARDS = [
  { title: 'Backups', detail: 'Encrypted copies of your books, and restoring from one.' },
  { title: 'Google', detail: 'The Google account used to share sheets with your accountant.' },
  { title: 'Business', detail: 'Business name, ABN, GST basis, BAS frequency and financial year.' },
  { title: 'Bank accounts', detail: 'Your Westpac accounts.' },
  { title: 'Appearance', detail: 'Light, dark, or following your Mac.' },
] as const;

export function SettingsPage() {
  const info = useBridge<AppInfo>(loadInfo);
  const data = useBridge<DataStatus>(loadDataStatus);
  return (
    <>
      <PageToolbar title="Settings" />
      <div className="settings-cards">
        {LATER_CARDS.map((card) => (
          <section key={card.title} className="page-surface settings-card" aria-label={card.title}>
            <h2 className="settings-card__title">{card.title}</h2>
            <p className="settings-card__line settings-card__line--secondary">{card.detail}</p>
            <p className="settings-card__later">{COMING_LATER}</p>
          </section>
        ))}
        <section className="page-surface settings-card" aria-labelledby="settings-about">
          <h2 id="settings-about" className="settings-card__title">
            <Info aria-hidden="true" className="settings-card__icon" />
            About
          </h2>
          {info.status === 'ready' && (
            <p data-testid="app-info" className="settings-card__line">
              Version {info.value.version}
              {info.value.development ? ', development' : ''}
            </p>
          )}
          {info.status === 'failed' && (
            <p role="alert">Could not read the app version ({info.error.code}).</p>
          )}
          {data.status === 'ready' && (
            <p
              data-testid="data-status"
              className="settings-card__line"
              role={data.value.problem === null ? undefined : 'alert'}
            >
              {describeData(data.value)}
            </p>
          )}
          {data.status === 'failed' && (
            <p role="alert">Could not read the books status ({data.error.code}).</p>
          )}
        </section>
      </div>
    </>
  );
}
