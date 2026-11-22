// The only way the screens talk to the main process (context/code-standards.md, "Bridge").
// Each function has a name, a Zod schema for its input, and a result type. The main process
// validates every input against the schema before doing anything.

import { z } from 'zod';
import type { StoreProblem } from './kinds';
import type { Result } from './result';

export const bridgeContract = {
  'app.getInfo': { input: z.object({}).strict() },
  'app.getDataStatus': { input: z.object({}).strict() },
} as const;

export interface AppInfo {
  readonly version: string;
  readonly development: boolean;
}

/** Whether the books opened. Open books passed the integrity check; otherwise there is a problem. */
export type DataStatus =
  | { readonly schemaVersion: number; readonly integrity: 'ok'; readonly problem: null }
  | { readonly schemaVersion: null; readonly integrity: null; readonly problem: StoreProblem };

/** What each function returns on success. */
export interface BridgeResults {
  'app.getInfo': AppInfo;
  'app.getDataStatus': DataStatus;
}

export type BridgeName = keyof typeof bridgeContract;
export const BRIDGE_NAMES = Object.keys(bridgeContract) as BridgeName[];

export type BridgeInput<N extends BridgeName> = z.input<(typeof bridgeContract)[N]['input']>;

export type BridgeErrorCode = 'invalid-input' | 'not-allowed' | 'internal';
export interface BridgeError {
  readonly code: BridgeErrorCode;
}

export type BridgeResult<N extends BridgeName> = Result<BridgeResults[N], BridgeError>;

/** The object the preload puts on `window.bridge`. */
export type BridgeApi = {
  readonly [N in BridgeName]: (input: BridgeInput<N>) => Promise<BridgeResult<N>>;
};

/** The IPC channel for one function. Only the preload and the main process use it. */
export function bridgeChannel(name: BridgeName): string {
  return `bridge:${name}`;
}
