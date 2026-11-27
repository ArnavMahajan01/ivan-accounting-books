# 114: Share a Workbook

Spec: [114](../feature-specs/09-demo-7-google-sheets/114-share-workbook.md)
Status: Implemented, check deferred (the second test account needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `ShareSheet` (W07's dialog): the sheet (when not started from its row), the email, and the role with plain explanations: Viewer "can see the sheet", Commenter "can see it and leave comments", Editor on the Transactions sheet "can change the Account, GST and Note columns. Changes come back to you to accept", Editor on a report sheet "can add their own tabs and columns. The figures from the app are protected". Continue, then **Check before sharing**: "Share {sheet} with {email} as {role}. Google will email them a link. Only this sheet is shared, not your books or other sheets." Back or Share.
- `src/google/sharing.ts` `shareWorkbook`: checks the email with Zod in the main process, then one Drive permission `type: user` for that email at the role (viewer `reader`, commenter `commenter`, editor `writer`), with Google's notification email. No link sharing exists anywhere in the code. Bridge `sheets.share`.

## Verified

- `sharing.test.ts`: shares with exactly that person and role; refuses "accountant at example" and shares nothing; shares nothing while not connected. `shared.test.tsx`: nothing is sent before the check step, then exactly the email and role; the editor wording on the Transactions sheet.
- In the built app with `GOOGLE_FAKE=1`: shared the Transactions sheet with an invented accountant as Editor; the check step showed the full email and role (screenshot looked at).

**Not checked:** the second test account seeing the file with exactly that role, and that an editor can change only Account, GST and Note (needs spec 106).
