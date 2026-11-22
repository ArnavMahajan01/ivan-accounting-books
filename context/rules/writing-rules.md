# Writing Rules

How to write anything a person will read: docs, guides, progress records, specs, reports, commit messages, articles and posts.

## Know the reader

Decide who reads it before writing.

| Piece | Reader | They need |
|---|---|---|
| Report to the author | The author, busy | The result first, then evidence |
| Progress record | The author or a model, weeks later | What was done, how it was checked, what to watch for |
| Code guide | A developer who did not write the code | What each part is for, where it lives, why it was built that way |
| User guide | A non-technical user, mid-task | The steps, in the words on the screen |
| Spec | The model that will build it | Exact steps, limits, and checks |
| Article or post | The public | One idea, told plainly and truthfully |

## Plain language

- Short, direct sentences. Everyday words. "Use", not "utilise".
- Say the thing. Cut warm-up lines, summaries of what you are about to say, and closing morals.
- Explain a term in a few words the first time it appears.
- One idea per paragraph.
- Use a list for steps and a table for comparisons. Do not use them for ordinary prose.
- Use the same word for the same thing every time.

## House style

Where a project already has a format, such as its spec titles, keep that format. Otherwise:

- No em dashes in prose. Use a full stop, a comma or a colon.
- Avoid semicolons. Write two sentences.
- No emoji in docs or UI text, unless the project uses them on purpose.
- Bold is for the few terms a reader must not miss.
- Dates are written in full: `2026-11-16`. Never "yesterday" or "last week" in a file that will be read later.

## Truth

- Every fact and number comes from a progress record, the code, or a command that was run. Do not state what was not checked.
- Numbers are true on the day they were written. Say "at the time of writing" where it matters.
- Say when a result came from scripted answers or sample data, and not the real thing.
- Do not write down something the author felt, decided or did unless the record or the author says so.
- Report the misses as well as the wins.

## Docs that describe code

- Start with what it covers and the date it was last updated.
- Explain the why and the method, not only what the code does. Keep a worked example where it helps.
- Link to files by path, and name functions by name. Never use line numbers.
- When code changes, update the doc in the same change: behaviour, file and function names, numbers, examples and tables.
- Before finishing, check that every link resolves and every name mentioned still exists.

## Guides for users

Each guide covers one job, and its title says the job: "Reply to an email".

1. **Summary:** one sentence on what the guide helps with.
2. **Steps:** numbered, one action each. Say where to click, then what happens.
3. **If something goes wrong:** the real, likely problems and what to do.

- Use the same words as the screen, and match button names exactly.
- Speak to the reader as "you".
- No technical terms. If one cannot be avoided, explain it in a few words.
- More than about eight steps means the guide should be split.
- Images show where to click, use sample data only, and each has a text description.
- If a step shares, deletes or signs in, say what to check before it.
- A guide is done only after each step was followed in the working app.
- When a feature changes or goes away, update or remove every guide that mentions it, in the same change.

## Records that are never rewritten

Some writing is a record of a moment: a published article, a posted social post, a final decision note, a finished progress record.

- Never rework one to add new material. Write a new one, and link back.
- An old one may get a correction of a mistake, a typo or a broken link, marked as a correction.
- If an old one turned out wrong in a way that matters, write a new one saying so, and add a one-line note to the old one.

## Commit messages and reports

- A commit message is one short line saying what the change does.
- A report leads with the result. See `done-checklist.md` for its shape.
