// The Google connection, for every screen (specs 107, 108): Settings shows it, the banner appears
// when Google needs him to sign in again. Also the count of the accountant's changes waiting (117). Asked again when the window comes back to the front and
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
  /** The accountant's changes waiting: the count beside Accountant changes in the sidebar. */
  readonly changesWaiting: number;
  readonly refreshChanges: () => void;
}

/** The main process checks the sheets this often; the count is asked for as often. */
const COUNT_EVERY_MS = 2 * 60 * 1000;

const GoogleStateContext = createContext<GoogleStateValue>({
  status: null,
  refresh: () => undefined,
  changesWaiting: 0,
  refreshChanges: () => undefined,
});

export function GoogleStateProvider({ children }: { readonly children: ReactNode }) {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [changesWaiting, setChangesWaiting] = useState(0);

  const refreshChanges = useCallback(() => {
    const api = bridge();
    void api['changes.count']({}).then((result) => {
      if (result.ok) setChangesWaiting(result.value.count);
    });
  }, []);

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
    refreshChanges();
    const onFocus = () => {
      refresh();
      refreshChanges();
    };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(refreshChanges, COUNT_EVERY_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [refresh, refreshChanges]);

  const value = useMemo(
    () => ({ status, refresh, changesWaiting, refreshChanges }),
    [status, refresh, changesWaiting, refreshChanges],
  );
  return <GoogleStateContext.Provider value={value}>{children}</GoogleStateContext.Provider>;
}

export function useGoogleState(): GoogleStateValue {
  return useContext(GoogleStateContext);
}
