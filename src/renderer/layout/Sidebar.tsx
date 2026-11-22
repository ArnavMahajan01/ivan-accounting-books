import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ROUTES, routeHref, type RouteId, type RouteInfo } from '../routes';
import './Sidebar.css';

export interface SidebarProps {
  /** The business name, or the app name until one is set (spec 030). */
  readonly title: string;
  readonly current: RouteId;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  /** Count badges, such as lines to review. Nothing shows for a missing or zero count. */
  readonly counts?: Partial<Record<RouteId, number>>;
}

function Item({
  route,
  current,
  collapsed,
  count,
}: {
  route: RouteInfo;
  current: boolean;
  collapsed: boolean;
  count: number | undefined;
}) {
  const Icon = route.icon;
  const showCount = count !== undefined && count > 0;
  return (
    <li>
      <a
        href={routeHref(route.id)}
        className={current ? 'sidebar__item sidebar__item--current' : 'sidebar__item'}
        aria-current={current ? 'page' : undefined}
        title={collapsed ? route.label : undefined}
        aria-label={
          collapsed ? `${route.label}${showCount ? `, ${String(count)}` : ''}` : undefined
        }
      >
        <Icon aria-hidden="true" className="sidebar__icon" />
        {!collapsed && <span className="sidebar__label">{route.label}</span>}
        {showCount && !collapsed && <span className="sidebar__count">{count}</span>}
        {showCount && collapsed && <span className="sidebar__dot" aria-hidden="true" />}
      </a>
    </li>
  );
}

export function Sidebar({ title, current, collapsed, onToggle, counts = {} }: SidebarProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <aside className={collapsed ? 'sidebar sidebar--collapsed' : 'sidebar'}>
      <div className="sidebar__head">
        {!collapsed && <span className="sidebar__title">{title}</span>}
        <button
          type="button"
          className="sidebar__toggle"
          aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'}
          aria-expanded={!collapsed}
          title={
            collapsed ? 'Show sidebar (Control-Command-S)' : 'Hide sidebar (Control-Command-S)'
          }
          onClick={onToggle}
        >
          <ToggleIcon aria-hidden="true" className="sidebar__icon" />
        </button>
      </div>
      <nav aria-label="Main" className="sidebar__nav">
        <ul className="sidebar__list">
          {ROUTES.filter((r) => r.place === 'main').map((r) => (
            <Item
              key={r.id}
              route={r}
              current={r.id === current}
              collapsed={collapsed}
              count={counts[r.id]}
            />
          ))}
        </ul>
        <ul className="sidebar__list sidebar__list--bottom">
          {ROUTES.filter((r) => r.place === 'bottom').map((r) => (
            <Item
              key={r.id}
              route={r}
              current={r.id === current}
              collapsed={collapsed}
              count={counts[r.id]}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
