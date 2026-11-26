// Which account holds each of the app's own jobs (migration 0010): where GST goes, and where one
// side of a transfer waits. Set when the books are set up, and read whenever a bank line is posted.

import { z } from 'zod';
import type { Id } from '@shared/ids';
import { ACCOUNT_ROLES, type AccountRole } from '@shared/kinds';
import type { Db } from './database';

const rowSchema = z.object({
  role: z.enum(ACCOUNT_ROLES),
  account_id: z.string().regex(/^acc_/),
});

export function setAccountRole(db: Db, role: AccountRole, accountId: string): void {
  db.prepare(
    `INSERT INTO account_role (role, account_id) VALUES (?, ?)
     ON CONFLICT (role) DO UPDATE SET account_id = excluded.account_id`,
  ).run(role, accountId);
}

/** The account with the role, or null when no account has it yet. */
export function accountForRole(db: Db, role: AccountRole): Id<'acc'> | null {
  const row = db.prepare('SELECT role, account_id FROM account_role WHERE role = ?').get(role);
  return row === undefined ? null : (rowSchema.parse(row).account_id as Id<'acc'>);
}
