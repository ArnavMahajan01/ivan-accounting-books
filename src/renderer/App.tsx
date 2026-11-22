import { AppLayout } from './layout/AppLayout';
import { Page } from './pages/pages';
import { useRoute } from './use-route';

export function App() {
  const [route] = useRoute();
  return (
    <AppLayout title="Accounting Books" current={route}>
      <Page route={route} />
    </AppLayout>
  );
}
