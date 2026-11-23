// The entry the `ledger` script runs. The logic is in ledger-cli.ts, so tests can call it.
import { runCli } from './ledger-cli';

process.exitCode = runCli(process.argv.slice(2), {
  out: (text) => {
    console.log(text);
  },
  err: (text) => {
    console.error(text);
  },
});
