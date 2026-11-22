# Link With the Admin Dashboard

**Status:** Open. Recommendation: a linked folder, carrying issued invoices and credit notes

The client already makes invoices and quotes in his Admin Dashboard, a separate Mac app built for him (the `Admin Dashboard` project beside this one). The author asked on 2026-11-22 whether its invoices and quotes can come into this app, so the books know what is owed and payments can be matched.

## What The Admin Dashboard Does Now

Read from its `context/architecture-context.md` on 2026-11-22:

- It is an Electron Mac app on the same Mac, with its own encrypted local storage.
- Issued invoices are locked snapshots with a number he types, customer, lines, and GST-inclusive totals in integer cents. A change creates a new version.
- It exports PDFs to a folder he chooses. It has no export meant for another app yet.

## The Options

- **A. Import a file.** The Admin Dashboard exports issued invoices and credit notes to a structured file. This app imports it with a preview, like a bank file.
- **B. Linked folder.** The same file, written by the Admin Dashboard to a folder he picks once. This app notices new files and shows them for one click.
- **C. Read the other app's store directly.** This app opens the Admin Dashboard's encrypted files.
- **D. One app.** Rebuild invoices and quotes here, or merge the two apps.

## Comparison

| Topic | A. File | B. Folder | C. Direct read | D. One app |
|---|---|---|---|---|
| Data stays on the Mac | Yes | Yes | Yes | Yes |
| Each app keeps its own encrypted data | Yes | Yes | No, it needs the other app's key | n/a |
| Work for the client | An export and an import each time | Set up once | None | None |
| Breaks if one app changes | Only if the file format changes | Only if the file format changes | Yes, at every storage change | n/a |
| Effort | Small in both apps | Small in both apps | Medium, and fragile | Very large |

## Recommendation

- **B, starting as A.** One versioned file format, validated on import like a bank file. Issued invoices and credit notes only. Quotes are information at most, since they do not change the books.
- Invoices arrive as proposals he adds with one click. Payments are matched to them in To review.
- Paid status going back to the Admin Dashboard is a second, separate choice (client question 25).
- C is not recommended: it ties the two apps' storage and encryption together.

## Check Before Deciding

1. Client question 24: does he keep making invoices and quotes in the Admin Dashboard?
2. The Admin Dashboard project needs an export feature. That is a spec in that project, not this one.
3. Whether folder 10's own invoice screens (Contacts, Invoices with GST, Invoice PDF) are still needed.

## Decision

- **Chosen:** [ ]
- **Date:** [YYYY-MM-DD]
- **Decided by:** the author
- **Reason:** [ ]
- **Files updated:** [`feature-specs/README.md` folder 10, `architecture-context.md`]
