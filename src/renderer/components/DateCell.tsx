import { formatDateAU, type CalendarDate } from '@shared/dates';

export interface DateCellProps {
  readonly date: CalendarDate;
}

/** A calendar date the Australian way, 21/11/2026, with the ISO date for assistive technology. */
export function DateCell({ date }: DateCellProps) {
  return (
    <time dateTime={date} className="date-cell">
      {formatDateAU(date)}
    </time>
  );
}
