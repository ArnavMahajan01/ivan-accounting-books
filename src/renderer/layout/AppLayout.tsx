import { useState, type ReactNode } from 'react';
import type { RouteId } from '../routes';
import { GoogleBanner } from '../sheets/GoogleBanner';
import { Sidebar } from './Sidebar';
import { useShortcuts } from './use-shortcuts';
import './AppLayout.css';

const COLLAPSED_KEY = 'sidebar-collapsed';

// A per-window preference only. Storage may be unavailable, so every access is guarded.
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, String(value));
  } catch {
    // Not remembered this time. Nothing else depends on it.
  }
}

export interface AppLayoutProps {
  readonly title: string;
  readonly current: RouteId;
  readonly counts?: Partial<Record<RouteId, number>>;
  readonly children: ReactNode;
}

/** The frame every page sits in: the sidebar, then the page, which scrolls on its own. */
export function AppLayout({ title, current, counts, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggle = () => {
    setCollapsed((c) => {
      writeCollapsed(!c);
      return !c;
    });
  };

  useShortcuts(toggle);

  return (
    <div className="app-layout">
      <Sidebar
        title={title}
        current={current}
        collapsed={collapsed}
        onToggle={toggle}
        {...(counts === undefined ? {} : { counts })}
      />
      <main className="app-layout__page">
        <GoogleBanner />
        {children}
      </main>
    </div>
  );
}
