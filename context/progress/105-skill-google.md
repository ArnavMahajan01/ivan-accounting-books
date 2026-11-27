# 105: Skill: Google Sheets and Drive APIs

Spec: [105](../feature-specs/09-demo-7-google-sheets/105-skill-google.md)
Status: Done
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- `.claude/skills/google-sheets-drive/SKILL.md`, listed in `.claude/skills/README.md`. Triggers: `src/google/`, "publish", "share", "sheet", "Drive", "Google", "accountant change".
- It starts with checking what is installed and reading Google's current pages, then the project's twelve rules (scope `drive.file`, system-browser sign-in with PKCE and loopback, refresh token with `safeStorage`, RAW values, his tabs kept, sharing by named email only, sheet edits as proposals, locked periods, only the two-minute read in the background, nothing private in logs), how it is tested, and `## Links`.
- **Choice made where the spec left room:** Google is called with plain HTTPS through Node's own `fetch`, not `googleapis` or `google-auth-library` (`architecture-context.md` allowed either). Nothing to install, a smaller package, and every request is easy to check in a test with a fake `fetch`. The two libraries stay on the lint rule's list of network modules.
- Google's pages were read on 2026-11-27 (native-app sign-in, developer metadata, Drive permissions.create, Sheets scopes). Found: `client_secret` is marked optional for desktop clients, which are public clients ("Always use PKCE"); refresh tokens are always returned to installed apps; `invalid_grant` means sign in again; an External app in "Testing" gets refresh tokens that expire after 7 days; `drive.file` is listed for the Sheets API.

## Verified

- Every rule in the skill points to `security-context.md` or `decisions/google-sheets-approach.md` (the second line of the skill says they win, and each rule names its section). Listed in the skills README.
- The skill shows in this session's skill list as `google-sheets-drive`.

## Notes

- Not confirmed on Google's pages: whether `spreadsheets.get` returns each tab's developer metadata (the Sheet resource has the field), and whether metadata survives a tab rename (the page says it stays with its location). Both are checked against the test project once spec 106 is done.
