import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseCalendarDate, type CalendarDate } from '@shared/dates';
import { openBackup, readBackupHeader, sealBackup, type BackupHeader } from './backup-file';
import { parseRecoveryKey, recoveryKeyText } from './recovery-key';
import { backupsToRemove } from './retention';

const header: BackupHeader = {
  createdAt: '2026-11-28T00:14:00.000Z',
  appVersion: '1.0.0',
  schemaVersion: 18,
  entries: 94,
  mode: 'sample',
};
const day = (t: string): CalendarDate => {
  const p = parseCalendarDate(t, 'YYYY-MM-DD');
  if (!p.ok) throw new Error(t);
  return p.value;
};

describe('the backup file (spec 136)', () => {
  const key = randomBytes(32);
  const books = Buffer.from('SQLite format 3\0 invented books');
  const file = sealBackup(books, header, key, randomBytes(12));

  it('opens with its key, and says what it holds without it', () => {
    expect(readBackupHeader(file)).toMatchObject({ ok: true, value: { header } });
    expect(openBackup(file, key)).toEqual({ ok: true, value: { header, books } });
    expect(file.includes(books)).toBe(false);
  });

  it('is unreadable without the key, and refuses any change', () => {
    expect(openBackup(file, randomBytes(32))).toEqual({ ok: false, error: 'wrong-key' });
    const tampered = Buffer.from(file);
    tampered[tampered.length - 1] = (tampered.at(-1) ?? 0) ^ 1;
    expect(openBackup(tampered, key).ok).toBe(false);
    const relabelled = Buffer.from(
      file.toString('latin1').replace('"entries":94', '"entries":95'),
      'latin1',
    );
    expect(openBackup(relabelled, key).ok).toBe(false);
    expect(readBackupHeader(Buffer.from('not a backup'))).toEqual({
      ok: false,
      error: 'not-a-backup',
    });
  });
});

describe('the recovery key (spec 136)', () => {
  it('writes the key in groups of four and reads it back, forgiving O, I and L', () => {
    const key = randomBytes(32);
    const text = recoveryKeyText(key);
    expect(text).toMatch(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/);
    expect(parseRecoveryKey(text)).toEqual({ ok: true, value: key });
    const sloppy = text.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
    expect(parseRecoveryKey(sloppy)).toEqual({ ok: true, value: key });
    expect(parseRecoveryKey('ABCD')).toEqual({ ok: false, error: 'bad-recovery-key' });
  });
});

describe('which backups to keep (spec 136)', () => {
  it('keeps the newest each day for a week, then each week for a month', () => {
    const made = (d: string, hour = '09') => ({
      name: `${d}-${hour}`,
      day: day(d),
      at: `${d}T${hour}:00:00.000Z`,
    });
    const backups = [
      made('2026-11-28', '10'),
      made('2026-11-28', '09'),
      made('2026-11-27'),
      made('2026-11-20'), // the week of Monday 16 November: only its newest is kept
      made('2026-11-17'),
      made('2026-11-16'),
      made('2026-10-01'),
    ];
    expect(backupsToRemove(backups, day('2026-11-28')).sort()).toEqual([
      '2026-10-01-09',
      '2026-11-16-09',
      '2026-11-17-09',
      '2026-11-28-09',
    ]);
  });
});
