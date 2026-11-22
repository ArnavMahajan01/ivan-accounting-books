import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Sheet.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children?: ReactNode;
  /** Buttons along the bottom, main action last (Mac order). */
  readonly actions?: ReactNode;
  /** `alertdialog` for a confirmation that needs an answer. */
  readonly role?: 'dialog' | 'alertdialog';
  readonly description?: string;
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
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => {
      opener?.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
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
        className="sheet"
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
