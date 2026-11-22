import { useEffect, useState } from 'react';
import type { BridgeError } from '@shared/bridge-contract';

export type Loaded<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'failed'; readonly error: BridgeError };

/** Calls one bridge function when the page opens. `load` must be a stable function. */
export function useBridge<T>(
  load: () => Promise<{ ok: true; value: T } | { ok: false; error: BridgeError }>,
): Loaded<T> {
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
