import { FlaskConical } from 'lucide-react';
import './SampleDataLabel.css';

/**
 * Shown on every screen that holds sample data, until real data is connected at go-live
 * (ui-context.md, "States"). The figures are invented, and the label says so in words.
 */
export function SampleDataLabel() {
  return (
    <span
      className="sample-data-label"
      title="These are invented figures for a made-up business, not real books."
    >
      <FlaskConical aria-hidden="true" className="sample-data-label__icon" />
      Sample data
    </span>
  );
}
