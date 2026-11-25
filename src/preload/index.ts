// The bridge: exposes the contract's functions on `window.bridge`, and nothing else.
// It does no work itself. The main process validates every call.

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { BRIDGE_NAMES, bridgeChannel, type BridgeApi } from '@shared/bridge-contract';

const functions = Object.fromEntries(
  BRIDGE_NAMES.map((name) => [
    name,
    (input: unknown) => ipcRenderer.invoke(bridgeChannel(name), input) as Promise<unknown>,
  ]),
);
// The one thing a screen cannot do for itself: a dropped file's path is known only here.
const api = {
  ...functions,
  pathForFile: (file: File) => webUtils.getPathForFile(file),
} as unknown as BridgeApi;

contextBridge.exposeInMainWorld('bridge', Object.freeze(api));
