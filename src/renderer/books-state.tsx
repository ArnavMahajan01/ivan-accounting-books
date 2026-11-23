// Which books are open, for every screen: the sample books or the real ones, the business's
// name, and whether the first-launch choice is due. Loading or clearing sample data replaces the
// state and bumps `version`, which remounts the pages so each fetches its figures again.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BooksState } from '@shared/views';
import { bridge } from './bridge';

export interface BooksStateValue {
  /** Null while it loads, and when it could not be read. */
  readonly state: BooksState | null;
  readonly status: 'loading' | 'ready' | 'failed';
  /** Changes whenever the books change, so pages can start again. */
  readonly version: number;
  /** Use the state a bridge call returned (after loading, clearing or choosing). */
  readonly apply: (next: BooksState) => void;
}

const NOT_LOADED: BooksStateValue = {
  state: null,
  status: 'ready',
  version: 0,
  apply: () => undefined,
};

export const BooksStateContext = createContext<BooksStateValue>(NOT_LOADED);

export function BooksStateProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<BooksState | null>(null);
  const [status, setStatus] = useState<BooksStateValue['status']>('loading');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const api = bridge();
    void api['app.getBooksState']({}).then((result) => {
      if (result.ok) {
        setState(result.value);
        setStatus('ready');
      } else {
        setStatus('failed');
      }
    });
  }, []);

  const apply = useCallback((next: BooksState) => {
    setState(next);
    setStatus('ready');
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(() => ({ state, status, version, apply }), [state, status, version, apply]);
  return <BooksStateContext.Provider value={value}>{children}</BooksStateContext.Provider>;
}

export function useBooksState(): BooksStateValue {
  return useContext(BooksStateContext);
}
