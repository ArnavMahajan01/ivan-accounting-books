# Code Rules

General coding rules for any project. The project's own `code-standards.md` adds to these, and wins where it is more specific.

## General

- Keep modules small and single-purpose.
- Fix root causes. Do not layer workarounds on top of them.
- Do not mix unrelated concerns in one module, component, route or task.
- Respect the project's boundaries and import directions. If lint enforces them, a lint error means the design is wrong, not the rule.
- Name files after what they are responsible for (`task-rollover.ts`), not the technology they use (`redis-helper.ts`). Follow the project's file-name case.
- Match the code around you before following your own taste.

## Types

- Use the strictest type settings the project has. Do not loosen them.
- No `any`. Use `unknown` for untrusted input, and narrow it.
- No non-null assertions or casts on outside data. Parse it, and let the parser give you the type.
- Use discriminated unions for states, events, actions and messages, and finish every switch with an exhaustiveness check, so a new variant is a compile error.
- No magic strings for statuses or kinds. Use literal unions or enums from one shared place.
- Use `interface` for object contracts and `type` for unions, unless the project says otherwise.

## Boundaries and outside data

Everything from outside the program is untrusted until checked.

- Validate at each boundary with a schema: user input, API requests and responses, webhooks, files, saved data, environment variables, messages between processes, and model output.
- Read environment variables in one place, validate them once, and import the result everywhere else.
- Screens and components get data through one data layer. They never call the network, the database or the file system directly.
- Each outside service has its own module. Nothing else calls that service.

## Errors

- Failures you expect (bad input, rejected action, service down) are returned as values, such as a `Result`. Throw only for real bugs and setup mistakes.
- Never swallow an error. Handle it, return it or let it surface.
- Messages for users are plain language. Raw error text goes to logs.
- Network calls have a timeout and can be cancelled.

## State and data

- Decide which part owns each piece of truth. Everything else reads it or derives from it.
- Derive what can be derived. Do not store a second copy that can go stale.
- Send state changes through one function per kind of change, so the rules live in one place.
- Ids are stable strings, never array positions.
- Timestamps are stored as UTC ISO strings. Calendar dates are stored as dates (`YYYY-MM-DD`) with no time.
- Money is stored as whole minor units (cents) plus a currency code. Never floats.
- Writes that can be repeated must be safe to repeat. Use unique keys and upserts.
- Saved formats carry a version, and old versions are migrated, never silently dropped.

## Performance

- Choose the simplest data structure that is correct for the data size.
- Look things up by id with a map or set when a list can grow. Avoid scanning inside loops.
- Know the hot path (per frame, per request, per item) and keep it cheap. Compute anything fixed once.
- Correctness and stable ordering come before speed.
- Measure before optimising, and say what you measured.

## Dependencies

- Before adding one, check it is needed, maintained, compatible with installed versions, licensed for this use, and not already covered.
- One library per job.
- Pin versions for anything security-sensitive or that ships a binary.
- Extra care for anything that touches credentials, email, files or payments: read its source and activity first.
- Free by default. Anything paid or metered is the author's decision.

## Logging

- Log through the project's logger, not bare print calls.
- Log ids, event types and error codes. Never log secrets, tokens, message bodies, personal details or file contents.

## Tests

- Tests live where the project keeps them, usually next to the code.
- Pure logic ships with unit tests. Test the rules that would be costly to get wrong first.
- Outside calls are mocked. Tests run offline and give the same result every time: no real clock, no real randomness, no network.
- Fixtures use invented data only.
- A test that needs a database builds a throwaway one from the real migrations.
- A change to visible UI also lists the manual check that was done.

## Comments and docs

- Comments explain why: a constraint, a tradeoff, a surprising choice.
- Do not describe what the next line does, and do not narrate history ("changed from X").
- Link to files by path and name functions by name. Never cite line numbers in docs. They go stale.

## Scripts

Give every project the same script names, so no one has to guess:

| Script | Does |
|---|---|
| `dev` | Run in development |
| `build` | Production build |
| `typecheck` | Types only, no output |
| `lint` | Linter |
| `format` / `format:check` | Formatter |
| `test` / `test:watch` | Tests |
| `check` | Typecheck, lint and test in sequence |

`check` is the one command to run before calling anything done.
