import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import './SidePanel.css';

export interface SidePanelProps {
  /** The panel's heading, and its accessible name. */
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * A panel beside a list, such as a transaction's lines and history (wireframe W05b, Option 2). It
 * does not cover the page and does not trap focus, so the list stays usable. Escape closes it, and
 * focus goes back to what was focused when it opened.
 */
export function SidePanel({ title, onClose, children }: SidePanelProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    heading.current?.focus();
    return () => {
      if (opener !== null && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <aside
      className="side-panel"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="side-panel__head">
        <h2 ref={heading} tabIndex={-1} className="side-panel__title">
          {title}
        </h2>
        <button type="button" className="side-panel__close" aria-label="Close" onClick={onClose}>
          <X aria-hidden="true" className="side-panel__close-icon" />
        </button>
      </header>
      <div className="side-panel__body">{children}</div>
    </aside>
  );
}
