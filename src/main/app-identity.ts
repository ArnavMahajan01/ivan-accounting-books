// Keeps a development run and the real app apart: different names, so different data folders
// and instance locks, and a test can never open the client's books (risk D4).

import { isAbsolute, join } from 'node:path';

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

const DATA_DIR_FLAG = '--data-dir=';

/**
 * A folder to keep the books in instead of the usual one, for trying the app without touching its
 * own data. Only an unpackaged run honours it, and only an absolute path, so the app the client
 * gets can never be pointed anywhere else.
 */
export function parseDataDirArg(argv: readonly string[], isPackaged: boolean): string | null {
  if (isPackaged) return null;
  const arg = argv.find((a) => a.startsWith(DATA_DIR_FLAG));
  const dir = arg?.slice(DATA_DIR_FLAG.length);
  return dir !== undefined && isAbsolute(dir) ? dir : null;
}
