import { useEffect, useState } from 'react';
import type { AppInfo, BridgeError, DataStatus } from '@shared/bridge-contract';
import { bridge } from './bridge';

type Loaded<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: T }
  | { readonly status: 'failed'; readonly error: BridgeError };

function useBridge<T>(
  load: () => Promise<{ ok: true; value: T } | { ok: false; error: BridgeError }>,
) {
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

const loadInfo = () => bridge['app.getInfo']({});
const loadData = () => bridge['app.getDataStatus']({});

function describeData(data: DataStatus): string {
  return data.problem === null
    ? `Schema version ${String(data.schemaVersion)}, integrity: ${data.integrity}`
    : `The books could not be opened (${data.problem}).`;
}

export function App() {
  const info = useBridge<AppInfo>(loadInfo);
  const data = useBridge<DataStatus>(loadData);

  return (
    <main>
      <h1>Accounting Books</h1>
      {info.status === 'loading' && <p>Loading…</p>}
      {info.status === 'ready' && (
        <p data-testid="app-info">
          Version {info.value.version}
          {info.value.development ? ', development' : ''}
        </p>
      )}
      {info.status === 'failed' && (
        <p role="alert">Could not read the app version ({info.error.code}).</p>
      )}
      {data.status === 'ready' && (
        <p data-testid="data-status" role={data.value.problem === null ? undefined : 'alert'}>
          {describeData(data.value)}
        </p>
      )}
      {data.status === 'failed' && (
        <p role="alert">Could not read the books status ({data.error.code}).</p>
      )}
    </main>
  );
}
