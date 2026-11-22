---
name: done-check
description: Run the done checklist against the current Accounting Books change and report honestly what passes, what fails and what was not checked. Use before telling the author a task or spec is finished, before giving commit commands, or when the author asks "is this done", "check before I commit" or "run the done check".
---

# Done Check

The full checklist is `context/rules/done-checklist.md`, with `CLAUDE.md` section 9. Run this before reporting anything as finished. Change no file while running it.

## 1. See what changed

```bash
git status
git diff
git diff --stat
git status --short --untracked-files=all
```

Read the whole diff. Note every file that does not belong to this task.

## 2. Run the checks

```bash
npm run check          # typecheck (both configs), lint, unit tests
npm run format:check
npm run test:e2e       # if main, preload, packaging or the shell changed: packages, checks the package, runs Playwright
```

Read the output. New warnings, skipped tests, or fewer tests than before are not a pass. Say which it was.

## 3. Check against the task

- Re-read the spec. Find evidence for each "Check When Done" item and for the "Every Spec" list in `context/feature-specs/README.md`.
- Confirm every scope limit was respected, and no gate in `context/ai-workflow-rules.md` was crossed.

## 4. Search for leftovers

```bash
git diff | grep -nE "^\+.*(console\.(log|debug)|debugger|TODO|FIXME|XXX|\.only\()"
git diff | grep -nEi "^\+.*(api[_-]?key|secret|password|token)\s*[:=]"
git status --short --untracked-files=all | grep -nE "\.env($|\.)|\.pem$|\.key$|\.db$|\.sqlite$|\.ofx$|\.qif$|\.png$|\.jpe?g$"
git status --short --untracked-files=all | grep -nE "references/|release/|out/|test-results/"
```

Also look for:
- commented-out code, unrelated formatting changes;
- edits to protected files: applied migrations in `src/data/migrations/`, decided `context/decisions/` files, finished `context/progress/` records;
- anything that looks like real client data: a real name, account number, amount or bank description. Only invented data is allowed (`CLAUDE.md` hard rule 3).

## 5. Check the real thing

- Was the app run (`npm run dev`, or the built or packaged app), not only the tests?
- For a screen: was it looked at, at 1100 by 700 and 1440 wide, in light and dark, by keyboard?
- For packaging or a demo: was the packaged app opened?

If not, do it now, or record it as not checked.

## 6. Check the records

- Is `context/progress/<spec>.md` written, and `context/progress-tracker.md` updated?
- Do `CLAUDE.md` section 4, `code-standards.md` and any guide still match the code?
- Does every path and function name in the docs still exist?

## 7. Report

```text
Result: <done / not done: what is missing>

Passed
- <item>: <evidence>

Failed
- <item>: <what is wrong, and the fix>

Not checked
- <item>: <why>

Files that do not belong to this task
- <path>
```

Never tick an item that was not checked. "Not checked" is a valid answer.
