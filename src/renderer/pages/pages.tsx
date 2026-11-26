import { Share2, UserCheck } from 'lucide-react';
import { assertNever } from '@shared/kinds';
import type { RouteId } from '../routes';
import { EmptyPage } from './EmptyPage';
import { AccountsPage } from './AccountsPage';
import { BankPage } from './BankPage';
import { HelpPage } from './HelpPage';
import { HomePage } from './HomePage';
import { SettingsPage } from './SettingsPage';
import { ReportsPage } from '../reports/ReportsPage';
import { RulesPage } from './RulesPage';
import { ToReviewPage } from './ToReviewPage';
import { TransactionsPage } from './TransactionsPage';

/** The page for each route. Pages not built yet say what they will hold. */
export function Page({ route }: { readonly route: RouteId }) {
  switch (route) {
    case 'home':
      return <HomePage />;
    case 'to-review':
      return <ToReviewPage />;
    case 'bank':
      return <BankPage />;
    case 'transactions':
      return <TransactionsPage />;
    case 'accounts':
      return <AccountsPage />;
    case 'reports':
      return <ReportsPage />;
    case 'rules':
      return <RulesPage />;
    case 'shared-sheets':
      return (
        <EmptyPage
          title="Shared sheets"
          icon={Share2}
          message="Nothing is shared. Reports you publish to Google Sheets, and who can see them, appear here."
        />
      );
    case 'accountant-changes':
      return (
        <EmptyPage
          title="Accountant changes"
          icon={UserCheck}
          message="No changes waiting. Changes your accountant makes in a shared sheet wait here for you to accept or reject."
        />
      );
    case 'settings':
      return <SettingsPage />;
    case 'help':
      return <HelpPage />;
    default:
      return assertNever(route);
  }
}
