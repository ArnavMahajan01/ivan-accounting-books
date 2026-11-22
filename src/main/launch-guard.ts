// The packaged app refuses to start with debugging flags (context/rules/desktop-app.md).
// The fuses already make Node ignore --inspect. This also covers Chromium's remote debugging.

const DEBUG_FLAGS =
  /^--(inspect|inspect-brk|inspect-port|debug|debug-brk|remote-debugging-port|remote-debugging-pipe|remote-allow-origins|js-flags)(=|$)/;

/** The debugging flags found in a command line, by name only. */
export function debuggingFlags(argv: readonly string[]): string[] {
  return argv.flatMap((arg) => {
    const match = DEBUG_FLAGS.exec(arg);
    return match?.[1] === undefined ? [] : [match[1]];
  });
}
