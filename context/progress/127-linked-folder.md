# 127: Linked Folder Pick-Up

Spec: [127](../feature-specs/10-demo-8-contacts-and-invoices/127-linked-folder.md)
Status: Done (built ahead of its gate; see 125's Notes)
Date: 2026-11-28
Branch: feature/10-demo-8-contacts-and-invoices

## What was done

- Settings, **Admin Dashboard** card: Choose folder… / Change folder…, Stop linking, "Shared folder: {name}" (only the folder's name reaches the screens, never its path). Kept in `app_meta` (`src/services/invoice-folder.ts`).
- The Invoices page checks the folder when it opens, when the window comes back to the front, and every five minutes while it is open (bridge `invoices.checkFolder`). Every `.json` file in it is read in the main process (`src/main/invoice-files.ts`), merged into one (the same number and version once), and put through the same preview. New ones wait in a banner, "2 new invoices arrived from the Admin Dashboard. INV-1043 and INV-1044.", with **Add to books**, which opens the preview; nothing is added without his click. A folder that has gone says so.
- **PDF** beside an invoice whose PDF the Admin Dashboard wrote in the folder, opened with the Mac's own app (only a `.pdf` in the linked folder is ever opened).
- **Bug found and fixed:** with two versions of one invoice in the same batch (two files, or one file carrying both), both counted as new and would have been posted twice. Now only the newest issued version of each number in a batch counts.

## Verified

- `invoice-folder.test.ts`: the folder remembered and forgotten; everything in the folder taken as one file, INV-1061 (in both fixtures) once, INV-1064 at version 2 only, a file that is not one left out, and the batch committed (5). `invoices.test.tsx`: the banner's words, and nothing added before Add to books and Import. `npm run check` passes.
- In the built app at 1100: chose a temporary folder in Settings, copied a fixture into it, opened Invoices: the banner with the four numbers, Add to books, Import, "Added 4 invoices.", INV-1061 with its PDF button (screenshots looked at).

**Not checked:** the Admin Dashboard writing to the folder for real (it has no export yet; `context/admin-dashboard-invoice-export.md`); opening a real PDF (the fixture names one that is not there). The sidebar has no count for waiting invoices; the banner is on the Invoices page.
