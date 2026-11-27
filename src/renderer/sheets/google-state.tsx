// The Google connection, for every screen (specs 107, 108): Settings shows it, the banner appears
// when Google needs him to sign in again. Asked again when the window comes back to the front and
// after any Google action, so the banner never waits for a restart.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GoogleStatus } from '@shared/sheets';
import { bridge } from '../bridge';

export interface GoogleStateValue {
  /** Null until the first answer. */
  readonly status: GoogleStatus | null;
  /** Use a status a bridge call returned, or ask again. */
  readonly refresh: (next?: GoogleStatus) => void;
}

const GoogleStateContext = createContext<GoogleStateValue>({
  status: null,
  refresh: () => undefined,
});

export function GoogleStateProvider({ children }: { readonly children: ReactNode }) {
  const [status, setStatus] = useState<GoogleStatus | null>(null);

  const refresh = useCallback((next?: GoogleStatus) => {
    if (next !== undefined) {
      setStatus(next);
      return;
    }
    const api = bridge();
    void api['google.getStatus']({}).then((result) => {
      if (result.ok) setStatus(result.value);
    });
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => {
      refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const value = useMemo(() => ({ status, refresh }), [status, refresh]);
  return <GoogleStateContext.Provider value={value}>{children}</GoogleStateContext.Provider>;
}

export function useGoogleState(): GoogleStateValue {
  return useContext(GoogleStateContext);
}
