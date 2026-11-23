import { useEffect, useState } from 'react';
import { routeFromHash, routeHref, type RouteId } from './routes';

/** The address hash, kept current. Back and forward work, and a reload keeps the page. */
export function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
    };
  }, []);
  return hash;
}

/** The current page, from the address hash. */
export function useRoute(): [RouteId, (id: RouteId) => void] {
  const route = routeFromHash(useHash());
  const navigate = (id: RouteId) => {
    window.location.hash = routeHref(id);
  };
  return [route, navigate];
}
