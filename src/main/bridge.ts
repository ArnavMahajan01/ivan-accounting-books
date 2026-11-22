// Registers one IPC handler per bridge function. Each call is checked in this order: it came
// from the app's own page (Electron security checklist, item 17), its input matches the
// contract's schema, then the handler runs. Only the event and an error code are logged.

import type { IpcMain } from 'electron';
import {
  BRIDGE_NAMES,
  bridgeChannel,
  bridgeContract,
  type BridgeError,
  type BridgeName,
  type BridgeResults,
} from '@shared/bridge-contract';
import type { Logger } from '@shared/logger';
import { err, type Result } from '@shared/result';
import { z } from 'zod';

type HandlerInput<N extends BridgeName> = z.output<(typeof bridgeContract)[N]['input']>;

export type BridgeHandlers = {
  readonly [N in BridgeName]: (
    input: HandlerInput<N>,
  ) => Promise<Result<BridgeResults[N], BridgeError>> | Result<BridgeResults[N], BridgeError>;
};

export interface BridgeCall {
  /** The URL of the frame that sent the call, or null if the frame is gone. */
  readonly senderUrl: string | null;
  readonly input: unknown;
}

/** Runs one call through the checks. Separate from Electron so it can be tested. */
export async function handleBridgeCall<N extends BridgeName>(
  name: N,
  call: BridgeCall,
  handlers: BridgeHandlers,
  isAllowedSender: (url: string) => boolean,
  log: Logger,
): Promise<Result<BridgeResults[N], BridgeError>> {
  if (call.senderUrl === null || !isAllowedSender(call.senderUrl)) {
    log.warn('bridge.refused', { bridgeFunction: name, code: 'not-allowed' });
    return err({ code: 'not-allowed' });
  }
  const parsed = bridgeContract[name].input.safeParse(call.input);
  if (!parsed.success) {
    log.warn('bridge.refused', { bridgeFunction: name, code: 'invalid-input' });
    return err({ code: 'invalid-input' });
  }
  try {
    // The handler and the schema are looked up by the same name, so the parsed input fits.
    const handler = handlers[name] as unknown as (
      input: unknown,
    ) => Promise<Result<BridgeResults[N], BridgeError>> | Result<BridgeResults[N], BridgeError>;
    return await handler(parsed.data);
  } catch {
    // A handler that throws has a bug. The page gets a code, never the error text.
    log.error('bridge.failed', { bridgeFunction: name, code: 'internal' });
    return err({ code: 'internal' });
  }
}

export function registerBridge(
  ipc: Pick<IpcMain, 'handle'>,
  handlers: BridgeHandlers,
  isAllowedSender: (url: string) => boolean,
  log: Logger,
): void {
  for (const name of BRIDGE_NAMES) {
    ipc.handle(bridgeChannel(name), (event, input: unknown) =>
      handleBridgeCall(
        name,
        { senderUrl: event.senderFrame?.url ?? null, input },
        handlers,
        isAllowedSender,
        log,
      ),
    );
  }
}
