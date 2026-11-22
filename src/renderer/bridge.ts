// The screens reach the main process only through `window.bridge`, set by the preload.

import type { BridgeApi } from '@shared/bridge-contract';

declare global {
  interface Window {
    readonly bridge: BridgeApi;
  }
}

export const bridge: BridgeApi = window.bridge;
