# 008: Hardened Electron Window

Opens one app window with every security setting from `context/rules/desktop-app.md` on, so every later screen sits on a safe shell.

**Client sees:** nothing yet. Internal.

## Depends On

- 007

## Implementation

1. `src/main/`: one window with context isolation on, sandbox on, Node integration off. Check the installed Electron version's security guidance first.
2. A single-instance lock: a second launch focuses the first window.
3. Block navigation away from the app's content, new windows and frames. Deny every permission request (request and check handlers).
4. A content security policy with no broad inline scripts.
5. `src/renderer/`: a React page that says "Accounting Books", using the system font.

## Scope Limits

- No bridge (009). No database (011). No design (020).

## Check When Done

- `npm run dev` opens one window. A second launch focuses it.
- In the developer console, `require` and `process` are undefined.
- `npm run check` passes.
