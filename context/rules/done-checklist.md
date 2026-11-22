# Done Checklist

Run this before telling the author a task is finished. `CLAUDE.md` section 9 is the short version.

A box you cannot tick is not a failure to hide. Report it.

## 1. The task

- [ ] I re-read the request or spec. The change does all of it.
- [ ] The change does nothing that was not asked for.
- [ ] If there is a spec, every "Check When Done" item is true, and I can show evidence for each.
- [ ] Every scope limit in the spec was respected.

## 2. The code

- [ ] The typecheck, lint, tests and build pass. I read the output: no new warnings, no skipped tests, and tests were actually collected.
- [ ] New logic has tests, and they fail without the change.
- [ ] No test was weakened, skipped or deleted to get a pass.
- [ ] No hard rule, boundary or invariant is broken. If the project has an invariant check, I ran it.
- [ ] Outside input is validated where it enters.
- [ ] Every usage of anything I renamed, moved or reshaped is updated.

## 3. The behaviour

- [ ] I ran the real thing, not only the tests.
- [ ] I tried a bad input, an empty state and a failure, not only the happy path.
- [ ] If the product ships as a build or package, I ran the built version.

## 4. The interface (only if UI changed)

- [ ] I looked at it, at a small size and a large one.
- [ ] Only design tokens are used. No raw colours or sizes.
- [ ] Loading, empty and error states exist.
- [ ] It works by keyboard, focus is visible, and controls have names.
- [ ] Reduced motion is respected.
- [ ] The browser or app console shows no new errors.

## 5. The diff

- [ ] I read my whole diff once, top to bottom.
- [ ] No debug prints, commented-out code, stray files or unrelated edits.
- [ ] No secrets, tokens, `.env` contents or real personal data.
- [ ] No generated, vendored or protected file was edited by hand.
- [ ] Any new dependency is needed, maintained, licensed for this use, and free unless the author agreed.

## 6. The records

- [ ] Docs and guides that describe the changed behaviour are updated.
- [ ] The progress record is written, and the tracker has its row.
- [ ] If architecture, scope or standards changed, that context file is updated.
- [ ] Every path, script and function name mentioned in docs still exists.

## 7. Git

- [ ] I am on the right branch.
- [ ] I did not commit or push unless asked.
- [ ] The commands I give stage named paths only, and leave out unrelated work.

## 8. The report

Use this shape:

```text
Result: [one line: done, partly done, or blocked]

Changed
- path/to/file: what the change does

Checked
- command: result
- what I looked at by hand, and what I saw

Not checked
- what, and why

Needs you
- decisions or steps only the author can take

Next
- the next step or spec
```

Rules:

- Lead with the result.
- If anything failed or was skipped, it goes in the first three lines.
- Say when evidence came from a mock, a script or sample data.
- Write only what you saw in this session.
