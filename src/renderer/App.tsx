import { BooksStateProvider, useBooksState } from './books-state';
import { ImportProvider } from './import/ImportProvider';
import { AppLayout } from './layout/AppLayout';
import { StartChoice } from './layout/StartChoice';
import { Page } from './pages/pages';
import { useRoute } from './use-route';
import './layout/StartChoice.css';

function Shell() {
  const [route] = useRoute();
  const { state, status, version, reviewCount } = useBooksState();
  // Until the books say which they are, nothing is drawn, so the first-launch choice never flashes.
  if (status === 'loading') return <div className="app-loading" aria-busy="true" />;
  if (state?.needsStartChoice === true) return <StartChoice />;
  return (
    <AppLayout
      title={state?.businessName ?? 'Accounting Books'}
      current={route}
      counts={{ 'to-review': reviewCount }}
    >
      {/* A new version remounts the page, so loading or clearing sample data refreshes it. */}
      <Page key={version} route={route} />
    </AppLayout>
  );
}

export function App() {
  return (
    <BooksStateProvider>
      <ImportProvider>
        <Shell />
      </ImportProvider>
    </BooksStateProvider>
  );
}
