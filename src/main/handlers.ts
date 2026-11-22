// One handler per bridge function. Each returns a Result and calls at most one service.

import type { App } from 'electron';
import type { OpenError, Store } from '@data/database';
import { ok, type Result } from '@shared/result';
import { dataStatus } from '@services/data-status';
import type { BridgeHandlers } from './bridge';

export interface HandlerDeps {
  readonly app: Pick<App, 'getVersion' | 'isPackaged'>;
  readonly store: Result<Store, OpenError>;
}

export function createHandlers({ app, store }: HandlerDeps): BridgeHandlers {
  return {
    'app.getInfo': () => ok({ version: app.getVersion(), development: !app.isPackaged }),
    'app.getDataStatus': () => ok(dataStatus(store)),
  };
}
