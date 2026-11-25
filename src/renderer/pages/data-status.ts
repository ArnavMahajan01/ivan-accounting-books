import type { DataStatus } from '@shared/bridge-contract';
import { bridge } from '../bridge';

export const loadInfo = () => bridge()['app.getInfo']({});
export const loadDataStatus = () => bridge()['app.getDataStatus']({});

export function describeData(data: DataStatus): string {
  return data.problem === null
    ? `Schema version ${String(data.schemaVersion)}, integrity: ${data.integrity}`
    : `The books could not be opened (${data.problem}).`;
}

export const loadBooksState = () => bridge()['app.getBooksState']({});
export const loadHomeSummary = () => bridge()['home.getSummary']({});
export const loadAccounts = () => bridge()['accounts.list']({});
export const loadBank = () => bridge()['bank.list']({});
