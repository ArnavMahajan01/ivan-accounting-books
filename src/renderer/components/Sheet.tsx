import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Sheet.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * What can take focus right now. A field inside a closed `<details>` matches the selector but
 * cannot be focused, so it is left out: otherwise it would be "first", and neither the first focus
 * nor Tab wrapping round would land anywhere.
 */
function focusableIn(panel: HTMLElement | null): HTMLElement[] {
  const found = [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
  // Older engines, and the test page, have no way to ask, and then every match counts.
  return found.filter(
    (el) => (el as { checkVisibility?: () => boolean }).checkVisibility?.() ?? true,
  );
}

export interface SheetProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children?: ReactNode;
  /** Buttons along the bottom, main action last (Mac order). */
  readonly actions?: ReactNode;
  /** `alertdialog` for a confirmation that needs an answer. */
  readonly role?: 'dialog' | 'alertdialog';
  readonly description?: string;
  /** `wide` for a sheet that shows a grid, such as the preview before publishing. */
  readonly size?: 'regular' | 'wide';
}

/**
 * A Mac-style panel over the page. While open it keeps keyboard focus inside itself,
 * closes on Escape, and gives focus back to whatever opened it when it closes.
 */
export function Sheet({
  title,
  onClose,
  children,
  actions,
  role = 'dialog',
  description,
  size = 'regular',
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Remembers what had focus, to give it back when the sheet closes.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      opener?.focus();
    };
  }, []);

  // Puts focus inside the sheet when it opens, and again whenever what it says changes (a preview
  // becoming its result): the button that had focus is gone by then, and focus would fall out to
  // the page behind, where Tab and Escape no longer reach the sheet.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel === null || panel.contains(document.activeElement)) return;
    (focusableIn(panel)[0] ?? panel).focus();
  }, [title]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusableIn(panelRef.current);
    const first = items[0];
    const last = items.at(-1);
    if (first === undefined || last === undefined) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="sheet-backdrop">
      <div
        ref={panelRef}
        className={size === 'wide' ? 'sheet sheet--wide' : 'sheet'}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="sheet__title">
          {title}
        </h2>
        {description !== undefined && (
          <p id={descriptionId} className="sheet__description">
            {description}
          </p>
        )}
        {children !== undefined && <div className="sheet__body">{children}</div>}
        {actions !== undefined && <div className="sheet__actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
