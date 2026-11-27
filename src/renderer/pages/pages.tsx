import { assertNever } from '@shared/kinds';
import type { RouteId } from '../routes';
import { AccountsPage } from './AccountsPage';
import { BankPage } from './BankPage';
import { HelpPage } from './HelpPage';
import { HomePage } from './HomePage';
import { SettingsPage } from './SettingsPage';
import { ReportsPage } from '../reports/ReportsPage';
import { RulesPage } from './RulesPage';
import { ToReviewPage } from './ToReviewPage';
import { TransactionsPage } from './TransactionsPage';
import { SharedSheetsPage } from '../sheets/SharedSheetsPage';
import { InvoicesPage } from '../invoices/InvoicesPage';
import { ContactsPage } from '../contacts/ContactsPage';
import { AccountantChangesPage } from '../sheets/AccountantChangesPage';

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
    case 'invoices':
      return <InvoicesPage />;
    case 'contacts':
      return <ContactsPage />;
    case 'shared-sheets':
      return <SharedSheetsPage />;
    case 'accountant-changes':
      return <AccountantChangesPage />;
    case 'settings':
      return <SettingsPage />;
    case 'help':
      return <HelpPage />;
    default:
      return assertNever(route);
  }
}
