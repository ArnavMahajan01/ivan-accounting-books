// A share in basis points as words, for reports and their exports (2550 is 25.5%).

/** "25.5%", "-3.2%", or "n/a". */
export function percentText(bp: number | null): string {
  if (bp === null) return 'n/a';
  const tenths = Math.round(Math.abs(bp) / 10);
  const sign = bp < 0 && tenths > 0 ? '-' : '';
  return `${sign}${String(Math.floor(tenths / 10))}.${String(tenths % 10)}%`;
}
