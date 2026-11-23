import type { ReactNode } from 'react';
import { formatDateAU } from '@shared/dates';
import type { HomeSummary } from '@shared/views';
import { Amount } from '../components/Amount';
import { routeHref, type RouteId } from '../routes';
import './HomePage.css';

interface NumberItem {
  readonly key: string;
  readonly label: string;
  readonly figure: ReactNode;
  readonly note: string;
  readonly route: RouteId;
}

// Each number opens the page that shows what it is made of. The Bank page, the BAS worksheet and
// Reports do not exist yet, so the figures open Accounts, where the same balances are.
function items(summary: HomeSummary): NumberItem[] {
  const accounts = summary.bank.accountCount;
  const { count, oldest } = summary.linesToReview;
  return [
    {
      key: 'bank',
      label: 'Bank balance',
      figure: <Amount cents={summary.bank.balance} />,
      note: `${String(accounts)} ${accounts === 1 ? 'account' : 'accounts'}`,
      route: 'accounts',
    },
    {
      key: 'review',
      label: 'Lines to review',
      figure: <span className="amount">{count}</span>,
      note: oldest === null ? 'none waiting' : `oldest ${formatDateAU(oldest)}`,
      route: 'to-review',
    },
    {
      key: 'gst',
      label: `GST owing, ${summary.gst.periodLabel}`,
      figure: <Amount cents={summary.gst.owing} />,
      note: 'so far this period',
      route: 'accounts',
    },
    {
      key: 'profit',
      label: `Profit, ${summary.profit.yearLabel}`,
      figure: <Amount cents={summary.profit.amount} />,
      note: `since ${formatDateAU(summary.profit.from)}`,
      route: 'accounts',
    },
  ];
}

export function HomeNumbers({ summary }: { readonly summary: HomeSummary }) {
  return (
    <ul className="home-numbers__list">
      {items(summary).map((item) => (
        <li key={item.key}>
          <a href={routeHref(item.route)} className="home-number">
            <span className="home-number__label">{item.label}</span>
            <span className="home-number__figure">{item.figure}</span>
            <span className="home-number__note">{item.note}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
