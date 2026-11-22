import { useEffect, useState } from 'react';
import { routeFromHash, routeHref, type RouteId } from './routes';

/** The current page, from the address hash. Back and forward work, and a reload keeps the page. */
export function useRoute(): [RouteId, (id: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() => routeFromHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(routeFromHash(window.location.hash));
    };
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
    };
  }, []);
  const navigate = (id: RouteId) => {
    window.location.hash = routeHref(id);
  };
  return [route, navigate];
}
