// The invented Westpac files in this folder, as text, for every test that needs one.

const files = import.meta.glob<string>('./*.ofx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export type WestpacFixture =
  | 'business-one-2-13-nov-2026'
  | 'business-one-2-13-nov-2026-xml'
  | 'business-one-9-20-nov-2026'
  | 'business-one-16-23-nov-2026-bad-date'
  | 'business-one-no-transactions'
  | 'cash-reserve-jul-nov-2026'
  | 'business-one-21-23-nov-2026-demo-4'
  | 'cash-reserve-21-23-nov-2026-demo-4'
  | 'other-account-16-nov-2026'
  | 'empty';

export function fixtureText(name: WestpacFixture): string {
  const text = files[`./${name}.ofx`];
  if (text === undefined) throw new Error(`No fixture file ${name}.ofx`);
  return text;
}
