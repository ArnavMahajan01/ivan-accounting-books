import { formatCents, type Cents } from '@shared/money';
import './Amount.css';

export interface AmountProps {
  readonly cents: Cents;
}

/** Money as en-AU AUD: right-aligned, tabular figures, a minus sign for negatives (never colour alone). */
export function Amount({ cents }: AmountProps) {
  return <span className="amount">{formatCents(cents)}</span>;
}
