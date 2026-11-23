import { useCallback, useEffect, useRef, useState } from 'react';
import type { BridgeError } from '@shared/bridge-contract';

export type Loaded<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'failed'; readonly error: BridgeError };

type BridgeResult<T> = { ok: true; value: T } | { ok: false; error: BridgeError };

/** Calls one bridge function when the page opens. `load` must be a stable function. */
export function useBridge<T>(load: () => Promise<BridgeResult<T>>): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  useEffect(() => {
    void load().then((result) => {
      setState(
        result.ok
          ? { status: 'ready', value: result.value }
          : { status: 'failed', error: result.error },
      );
    });
  }, [load]);
  return state;
}

/**
 * Calls a bridge function again whenever `key` changes (the filters, a page number), and when
 * `reload` is called. While the next answer is on its way the last one stays, so a table does not
 * flash empty on every keystroke. An answer that arrives after a newer request is ignored.
 */
export function useBridgeQuery<T>(
  load: () => Promise<BridgeResult<T>>,
  key: string,
): { readonly state: Loaded<T>; readonly loading: boolean; readonly reload: () => void } {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });
  const [loading, setLoading] = useState(true);
  const [reloads, setReloads] = useState(0);
  const latest = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    latest.current += 1;
    const request = latest.current;
    setLoading(true);
    void loadRef.current().then((result) => {
      if (request !== latest.current) return;
      setLoading(false);
      setState(
        result.ok
          ? { status: 'ready', value: result.value }
          : { status: 'failed', error: result.error },
      );
    });
  }, [key, reloads]);

  const reload = useCallback(() => {
    setReloads((n) => n + 1);
  }, []);
  return { state, loading, reload };
}
