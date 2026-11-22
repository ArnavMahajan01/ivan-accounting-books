// The only way to log (context/code-standards.md). A log holds ids, event names, counts and
// error codes, never private data (context/security-context.md, "Logging"). Passing a private
// field or free text is a bug in the caller, so it throws instead of writing the line.

export type LogLevel = 'info' | 'warn' | 'error';
export type LogValue = string | number | boolean;
export type LogFields = Readonly<Record<string, LogValue>>;

export interface LogRecord {
  readonly level: LogLevel;
  readonly scope: string;
  readonly event: string;
  readonly fields: LogFields;
}

/** Where log records go. The console for now. Spec 010 adds the rotating log file. */
export type LogSink = (record: LogRecord) => void;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

// A field whose name contains one of these is refused, so `payeeName` and `amountCents` are caught too.
const PRIVATE_FIELD_WORDS = ['description', 'amount', 'name', 'email', 'payee', 'token'] as const;
// Scopes, event names and string values are ids or codes: no spaces, so no free text slips in.
const CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;

export class PrivateLogFieldError extends Error {
  override readonly name = 'PrivateLogFieldError';
}

function check(scope: string, event: string, fields: LogFields): void {
  if (!CODE_PATTERN.test(scope) || !CODE_PATTERN.test(event)) {
    throw new PrivateLogFieldError(`Log scope and event must be codes: "${scope}" "${event}"`);
  }
  for (const [key, value] of Object.entries(fields)) {
    const lower = key.toLowerCase();
    const word = PRIVATE_FIELD_WORDS.find((w) => lower.includes(w));
    if (word !== undefined) {
      throw new PrivateLogFieldError(`Log field "${key}" may hold private data (${word})`);
    }
    if (typeof value === 'string' && !CODE_PATTERN.test(value)) {
      throw new PrivateLogFieldError(`Log field "${key}" must be an id or a code, not free text`);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new PrivateLogFieldError(`Log field "${key}" must be a finite number`);
    }
  }
}

export const consoleSink: LogSink = (record) => {
  const line = JSON.stringify(record);
  if (record.level === 'error') console.error(line);
  else if (record.level === 'warn') console.warn(line);
  else console.info(line);
};

export function createLogger(scope: string, sink: LogSink = consoleSink): Logger {
  const write =
    (level: LogLevel) =>
    (event: string, fields: LogFields = {}): void => {
      check(scope, event, fields);
      sink({ level, scope, event, fields });
    };
  return { info: write('info'), warn: write('warn'), error: write('error') };
}
