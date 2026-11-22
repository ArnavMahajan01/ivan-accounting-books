// The bridge: exposes the contract's functions on `window.bridge`, and nothing else.
// It does no work itself. The main process validates every call.

import { contextBridge, ipcRenderer } from 'electron';
import { BRIDGE_NAMES, bridgeChannel, type BridgeApi } from '@shared/bridge-contract';

const api = Object.fromEntries(
  BRIDGE_NAMES.map((name) => [
    name,
    (input: unknown) => ipcRenderer.invoke(bridgeChannel(name), input) as Promise<unknown>,
  ]),
) as unknown as BridgeApi;

contextBridge.exposeInMainWorld('bridge', Object.freeze(api));
