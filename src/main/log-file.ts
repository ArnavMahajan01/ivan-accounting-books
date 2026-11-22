// The rotating log file in the data folder: at most 5 MB, with 3 older files kept
// (context/security-context.md, "Logging"). It holds what the logger allows: ids and counts only.

import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Clock } from '@shared/dates';
import type { LogSink } from '@shared/logger';

export const LOG_FILE_NAME = 'app.log';
export const MAX_LOG_BYTES = 5 * 1024 * 1024;
export const KEPT_OLD_LOGS = 3;

export interface LogFileOptions {
  readonly dir: string;
  readonly clock: Clock;
  readonly maxBytes?: number;
  readonly keptOldFiles?: number;
}

function rotate(dir: string, keptOldFiles: number): void {
  const path = (n: number) => join(dir, n === 0 ? LOG_FILE_NAME : `app.${String(n)}.log`);
  rmSync(path(keptOldFiles), { force: true });
  for (let n = keptOldFiles - 1; n >= 0; n -= 1) {
    if (existsSync(path(n))) renameSync(path(n), path(n + 1));
  }
}

/** A sink that appends one JSON line per record, rotating before a line would pass the limit. */
export function logFileSink({
  dir,
  clock,
  maxBytes = MAX_LOG_BYTES,
  keptOldFiles = KEPT_OLD_LOGS,
}: LogFileOptions): LogSink {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, LOG_FILE_NAME);
  return (record) => {
    const line = `${JSON.stringify({ time: clock.now(), ...record })}\n`;
    const size = existsSync(file) ? statSync(file).size : 0;
    if (size > 0 && size + Buffer.byteLength(line) > maxBytes) rotate(dir, keptOldFiles);
    appendFileSync(file, line, { mode: 0o600 });
  };
}

/** Sends each record to every sink. */
export function teeSinks(...sinks: readonly LogSink[]): LogSink {
  return (record) => {
    for (const sink of sinks) sink(record);
  };
}
