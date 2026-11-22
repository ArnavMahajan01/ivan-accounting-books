# Working Method

How to work in any codebase. `CLAUDE.md` has the short version. This file has the detail and the reasons.

The method in one line: **read, plan, make one small change, run it, report what really happened.**

## 1. At the start of a session

1. Read `CLAUDE.md`. Then read the files it lists for the kind of work you are about to do.
2. Find out the current state before trusting any document: the branch, uncommitted changes, and whether the checks pass right now. If the checks already fail, say so before you change anything, so an old failure is not mistaken for yours.
3. If the project tracks progress, read the tracker and the newest progress records. They say what was finished last and what is half done.

## 2. Understand the request

- Restate it in one or two lines: what is wanted, and what "finished" looks like.
- Look for the purpose behind it. "Make the test pass" means "make the code correct". "Fix this error" means "fix why it happens".
- Decide whether a missing detail matters:

| The missing detail | What to do |
|---|---|
| Has a normal default (a name, a file location, a format the codebase already uses) | Pick it, and mention the choice |
| Changes what the product does, what data is kept or who can see it | Ask one clear question, with the option you recommend |
| Would need something hard to undo | Ask, and do nothing until answered |

- Ask once, with everything you need. Do not ask a string of small questions.

## 3. Read before you write

Reading is the cheapest way to avoid a wrong change.

- Read the whole file you will edit, not only the function.
- Read one neighbouring file that does a similar job, and copy its shape.
- Read the tests for the code. They show how it is meant to be used.
- Search for existing helpers before writing a new one.
- Find every caller of anything you will rename, move or change the shape of.

## 4. Check the library, not your memory

Models remember old versions. Projects use new ones.

- Find the installed version in the lockfile or the package's own manifest.
- Read the docs or type definitions that ship with it in the dependency folder.
- Heed deprecation notices. If the project's instructions say a framework differs from what you know, believe them.
- Never write a call you have not seen in the docs, the types or the codebase.

## 5. Plan the smallest useful step

- Break the work into steps that can each be checked on their own.
- Split a step that mixes two boundaries: interface and data, client and server, a contract and the feature using it, a prompt and the code around it.
- If a step cannot be checked end to end quickly, it is too big.
- For a long task, keep a short checklist and tick it as you go. Re-read the spec and the hard rules at each step. Long sessions drift.

## 6. Make the change

- Fix the cause, not the symptom. Ask "why does this happen" until the answer is something you can change.
- Change only what the task needs. Note other problems for the author, and leave them alone.
- Follow the project's patterns even if you would have chosen differently.
- Do not add options, abstractions or extra files for needs that do not exist yet.
- Edit in place. Do not rewrite a whole file to change a few lines.

## 7. When something fails

1. Read the entire error, including the first line and the stack. Most answers are in it.
2. Reproduce it with the smallest command you can.
3. Form one guess about the cause, and find a way to check that guess only.
4. Change one thing. Run again.
5. If two attempts fail, stop repeating. Step back: re-read the code path, check your assumptions about versions and config, and look at what changed recently.
6. If you are still stuck, say so. Report what you tried, what you learned and what you would try next. That is more useful than a guess presented as a fix.

Never make a failure disappear by hiding it: no swallowed errors, no skipped tests, no loosened types, no deleted assertions.

## 8. Verify

A change is verified when you have watched it work.

| What changed | How to verify |
|---|---|
| Logic | Tests that fail without the change and pass with it |
| A command or script | Run it, and read all of its output |
| A page or component | Open it, use it, look at it at two sizes, check the console for errors |
| An API | Call it with a good input and a bad one |
| A build or package step | Build it, and run the built result, not the dev server |
| Docs | Follow the steps as written, and check every path and name still exists |

Then run the full check command. Read the output, not only the exit code. A run with warnings, skipped tests or zero tests collected is not a pass.

## 9. Report

Lead with the result. Then:

1. **What changed:** the files, and what each change does.
2. **How it was checked:** the commands run, and what they printed.
3. **What was not checked,** and why.
4. **Anything the author must decide or do.**
5. **What comes next.**

Rules for reports:

- Facts come from something you ran or read in this session. Never from memory or expectation.
- Say when a result came from a mock, a script or sample data, and not the real thing.
- If something failed or was skipped, say it first, not last.
- No "should", "probably works" or "fully tested" without evidence.

## 10. Keep the records true

- Update docs, guides and the progress tracker in the same change as the code.
- A progress record says what was done and how it was checked, not what was planned.
- If the work changed the architecture, scope or standards, update that context file before continuing.

## 11. When to stop and ask

Stop and ask when:

- A hard rule or invariant would have to break.
- The spec and the code disagree, or two context files disagree.
- The action cannot be undone, costs money, or reaches real people or real accounts.
- You have tried twice and the cause is still unknown.

Carry on without asking when the choice is small, can be undone, and the codebase already shows the answer.
