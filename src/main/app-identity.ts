// Keeps a development run and the real app apart: different names, so different data folders
// and instance locks, and a test can never open the client's books (risk D4).

import { join } from 'node:path';

export const DEV_SUFFIX = ' Dev';

/** The name to run under: the product name, plus " Dev" whenever the app is not packaged. */
export function runName(productName: string, isPackaged: boolean): string {
  if (isPackaged || productName.endsWith(DEV_SUFFIX)) return productName;
  return `${productName}${DEV_SUFFIX}`;
}

/** The data folder for a name, inside the system's application data folder. */
export function dataFolder(appDataDir: string, name: string): string {
  return join(appDataDir, name);
}
