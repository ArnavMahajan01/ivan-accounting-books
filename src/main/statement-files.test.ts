import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_STATEMENT_CHARS } from '@import/index';
import { fixtureText } from '../../tests/fixtures/westpac/fixtures';
import { readStatementFile } from './statement-files';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'statement-files-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('readStatementFile', () => {
  it('reads a file’s text and its name, never its folder', async () => {
    const path = join(dir, 'Westpac_4821.ofx');
    writeFileSync(path, fixtureText('business-one-2-13-nov-2026'));
    const result = await readStatementFile(path);
    expect(result).toMatchObject({ ok: true, value: { fileName: 'Westpac_4821.ofx' } });
    expect(result.ok && result.value.text).toBe(fixtureText('business-one-2-13-nov-2026'));
  });

  it('reads the Windows-1252 text of an older export without losing its letters', async () => {
    const path = join(dir, 'old.ofx');
    // 0xE9 is "é" in Windows-1252 and is not valid UTF-8 on its own.
    writeFileSync(path, Buffer.from([...Buffer.from('CAF'), 0xe9]));
    const result = await readStatementFile(path);
    expect(result.ok && result.value.text).toBe('CAFé');
  });

  it('says a file of zero bytes is empty', async () => {
    const path = join(dir, 'empty.ofx');
    writeFileSync(path, '');
    expect(await readStatementFile(path)).toEqual({ ok: false, error: 'empty' });
  });

  it('refuses a file over the limit without reading it', async () => {
    const path = join(dir, 'big.ofx');
    writeFileSync(path, Buffer.alloc(MAX_STATEMENT_CHARS * 2 + 1, 0x20));
    expect(await readStatementFile(path)).toEqual({ ok: false, error: 'too-large' });
  });

  it('refuses a folder, and a file that is not there', async () => {
    const folder = join(dir, 'a-folder.ofx');
    mkdirSync(folder);
    expect(await readStatementFile(folder)).toEqual({ ok: false, error: 'unreadable-file' });
    expect(await readStatementFile(join(dir, 'missing.ofx'))).toEqual({
      ok: false,
      error: 'unreadable-file',
    });
  });
});
