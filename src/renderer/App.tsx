import { useEffect } from 'react';
import { bridge } from './bridge';
import { applyAppearance } from './settings/AppearanceCard';
import { HelpPrefsProvider } from './guides/help-prefs';
import { KeepOnScreenProvider } from './guides/KeepOnScreen';
import { BooksStateProvider, useBooksState } from './books-state';
import { ImportProvider } from './import/ImportProvider';
import { GoogleStateProvider, useGoogleState } from './sheets/google-state';
import { AppLayout } from './layout/AppLayout';
import { StartChoice } from './layout/StartChoice';
import { Page } from './pages/pages';
import { useRoute } from './use-route';
import './layout/StartChoice.css';

function Shell() {
  const [route] = useRoute();
  const { state, status, version, reviewCount } = useBooksState();
  const { changesWaiting } = useGoogleState();
  // Until the books say which they are, nothing is drawn, so the first-launch choice never flashes.
  if (status === 'loading') return <div className="app-loading" aria-busy="true" />;
  if (state?.needsStartChoice === true) return <StartChoice />;
  return (
    <AppLayout
      title={state?.businessName ?? 'Accounting Books'}
      current={route}
      counts={{ 'to-review': reviewCount, 'accountant-changes': changesWaiting }}
    >
      {/* A new version remounts the page, so loading or clearing sample data refreshes it. */}
      <Page key={version} route={route} />
    </AppLayout>
  );
}

export function App() {
  // The appearance chosen in Settings, on every launch (spec 133).
  useEffect(() => {
    const api = bridge();
    void api['appearance.get']({}).then((result) => {
      if (result.ok) applyAppearance(result.value.appearance);
    });
  }, []);
  return (
    <BooksStateProvider>
      <GoogleStateProvider>
        <ImportProvider>
          <HelpPrefsProvider>
            <KeepOnScreenProvider>
              <Shell />
            </KeepOnScreenProvider>
          </HelpPrefsProvider>
        </ImportProvider>
      </GoogleStateProvider>
    </BooksStateProvider>
  );
}
