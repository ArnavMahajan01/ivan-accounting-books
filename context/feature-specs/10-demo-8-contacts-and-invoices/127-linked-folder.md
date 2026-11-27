# 127: Linked Folder Pick-Up

New invoice files appear by themselves from a folder he links once (W08a, Option 2).

**Client sees:** "2 new invoices arrived from the Admin Dashboard. Add to books".

## Depends On

- 126

## Implementation

1. Settings: choose the folder. The app checks it on launch and every few minutes while open.
2. New files go through the same preview. Nothing is posted without his click.

## Check When Done

- Manual test: drop a fixture in the folder, see the banner. `npm run check` passes.
