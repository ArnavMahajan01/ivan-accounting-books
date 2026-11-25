import { Inbox } from 'lucide-react';
import { useBooksState } from '../books-state';
import { plural } from '../import/import-text';
import { EmptyPage } from './EmptyPage';

/**
 * Reviewing and posting bank lines is built in folder 06. Until then this page says what is waiting,
 * so the count on the sidebar is not left unexplained.
 */
export function ToReviewPage() {
  const { reviewCount } = useBooksState();
  return (
    <EmptyPage
      title="To review"
      icon={Inbox}
      message={
        reviewCount > 0
          ? `${plural(reviewCount, 'imported line is', 'imported lines are')} waiting here. Choosing an account and posting them comes in the next version of the app.`
          : 'Nothing to review. Bank lines you import wait here for an account and a GST code, then you post them.'
      }
    />
  );
}
