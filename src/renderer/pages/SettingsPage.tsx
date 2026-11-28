import { CircleAlert, Info } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import type { AppInfo, DataStatus } from '@shared/bridge-contract';
import type { BankAccountsSettings, BusinessView } from '@shared/settings';
import { bridge } from '../bridge';
import { Button } from '../components/Button';
import { PageToolbar } from '../layout/PageToolbar';
import { AdminDashboardCard } from '../invoices/AdminDashboardCard';
import { AppearanceCard } from '../settings/AppearanceCard';
import { BankAccountsCard } from '../settings/BankAccountsCard';
import { BusinessCard } from '../settings/BusinessCard';
import { GoogleCard } from '../sheets/GoogleCard';
import { useGoogleState } from '../sheets/google-state';
import { DeveloperCard } from './DeveloperCard';
import { COMING_LATER } from './EmptyPage';
import { describeData, loadDataStatus, loadInfo } from './data-status';
import { useBridge, useBridgeQuery } from './use-bridge';
import './SettingsPage.css';

// Option 3, Status Cards (wireframe/2111-settings/; spec 133): each area is a card that says in
// one line whether all is well, with the button that fixes it. Cards with a problem come first,
// under one line that says how many things need attention.

const loadBanks = () => bridge()['bankAccounts.settings']({});
const loadBusiness = () => bridge()['business.get']({});

/** "Google is not connected, and no bank accounts are set up." */
export function attentionSentence(problems: readonly string[]): string {
  const [first = '', ...rest] = problems;
  const joined =
    rest.length === 0
      ? first
      : `${[first, ...rest.slice(0, -1)].join(', ')} and ${rest.at(-1) ?? ''}`;
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

function AboutCard() {
  const info = useBridge<AppInfo>(loadInfo);
  const data = useBridge<DataStatus>(loadDataStatus);
  return (
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
      <p className="settings-card__line settings-card__line--secondary">
        Your books are one file in the Library folder on this Mac.
      </p>
      <div className="settings-card__actions">
        <Button onClick={() => void bridge()['app.showBooksFolder']({})}>Show in Finder</Button>
      </div>
    </section>
  );
}

function BackupsCard() {
  return (
    <section className="page-surface settings-card" aria-label="Backups">
      <h2 className="settings-card__title">Backups</h2>
      <p className="settings-card__line settings-card__line--secondary">
        Encrypted copies of your books, and restoring from one.
      </p>
      <p className="settings-card__later">{COMING_LATER}</p>
    </section>
  );
}

export function SettingsPage() {
  const { status: google } = useGoogleState();
  const [version, setVersion] = useState(0);
  const banks = useBridgeQuery<BankAccountsSettings>(loadBanks, `b${String(version)}`).state;
  const business = useBridgeQuery<BusinessView | null>(loadBusiness, `s${String(version)}`).state;
  const changed = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const googleProblem =
    google?.kind === 'not-connected'
      ? 'Google is not connected'
      : google?.kind === 'needs-sign-in'
        ? 'Google needs you to sign in again'
        : null;
  const bankView = banks.status === 'ready' ? banks.value : null;
  const bankProblem =
    bankView !== null && !bankView.accounts.some((a) => a.active)
      ? 'no bank accounts are set up'
      : null;
  const businessProblem =
    business.status === 'ready' && business.value === null ? 'the business is not set up' : null;

  const cards: { id: string; problem: string | null; node: ReactNode }[] = [
    { id: 'backups', problem: null, node: <BackupsCard /> },
    { id: 'google', problem: googleProblem, node: <GoogleCard /> },
    { id: 'business', problem: businessProblem, node: <BusinessCard /> },
    {
      id: 'banks',
      problem: bankProblem,
      node: <BankAccountsCard view={bankView} onChanged={changed} />,
    },
    { id: 'admin', problem: null, node: <AdminDashboardCard /> },
    { id: 'appearance', problem: null, node: <AppearanceCard /> },
    { id: 'about', problem: null, node: <AboutCard /> },
  ];
  const problems = cards.flatMap((c) => (c.problem === null ? [] : [c.problem]));
  // Problems first; otherwise the cards keep their order.
  const ordered = [
    ...cards.filter((c) => c.problem !== null),
    ...cards.filter((c) => c.problem === null),
  ];

  return (
    <>
      <PageToolbar title="Settings" />
      {problems.length > 0 && (
        <div className="page-surface settings-attention" role="status">
          <CircleAlert aria-hidden="true" className="settings-card__icon" />
          <p>
            <strong>
              {problems.length === 1 ? '1 thing needs' : `${String(problems.length)} things need`}{' '}
              attention:
            </strong>{' '}
            {attentionSentence(problems)}
          </p>
        </div>
      )}
      <div className="settings-cards">
        {ordered.map((c) => (
          <div
            key={c.id}
            className={
              c.problem === null ? 'settings-slot' : 'settings-slot settings-slot--attention'
            }
          >
            {c.node}
          </div>
        ))}
        <DeveloperCard />
      </div>
    </>
  );
}
