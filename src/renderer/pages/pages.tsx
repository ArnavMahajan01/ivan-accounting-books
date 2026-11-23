import {
  ArrowLeftRight,
  BookOpen,
  ChartColumn,
  Inbox,
  Landmark,
  Share2,
  UserCheck,
} from 'lucide-react';
import { assertNever } from '@shared/kinds';
import type { RouteId } from '../routes';
import { EmptyPage } from './EmptyPage';
import { HelpPage } from './HelpPage';
import { HomePage } from './HomePage';
import { SettingsPage } from './SettingsPage';

/** The page for each route. Pages not built yet say what they will hold. */
export function Page({ route }: { readonly route: RouteId }) {
  switch (route) {
    case 'home':
      return <HomePage />;
    case 'to-review':
      return (
        <EmptyPage
          title="To review"
          icon={Inbox}
          message="Nothing to review. Bank lines you import wait here for an account and a GST code, then you post them."
        />
      );
    case 'bank':
      return (
        <EmptyPage
          title="Bank"
          icon={Landmark}
          message="No bank accounts yet. Your Westpac accounts appear here, and you import their statement files from here."
        />
      );
    case 'transactions':
      return (
        <EmptyPage
          title="Transactions"
          icon={ArrowLeftRight}
          message="No transactions yet. Everything you post appears here, with its history."
        />
      );
    case 'accounts':
      return (
        <EmptyPage
          title="Accounts"
          icon={BookOpen}
          message="Your chart of accounts appears here, grouped by type, with balances."
        />
      );
    case 'reports':
      return (
        <EmptyPage
          title="Reports"
          icon={ChartColumn}
          message="Profit and loss, balance sheet, trial balance and the BAS worksheet appear here once there are transactions."
        />
      );
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
