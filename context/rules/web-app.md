# Project Type: Web App

Rules for a web application: a React-style frontend, with or without its own server. Add this file to a web project on top of the general rules.

Written from a Next.js, Tailwind, shadcn/ui, Prisma and SQLite project, and kept general. Check the project's actual stack before applying any line.

## First, check what you are working with

- Read the manifest for the framework and its exact version. Frameworks change their rules between major versions. If the project warns that its version differs from what you know, read the docs shipped in the dependency folder before writing code.
- Find out the rendering mode: server-rendered, static export or client-only. Many rules below depend on it.
- Find the data layer, the validation library and the component kit before adding anything.

## Structure

A layout that works:

```
app/ or src/routes/     pages, layouts, server actions, route handlers
components/
  ui/                   third-party primitives (do not edit)
  layout/ shared/ ...   your own components, grouped by area
lib/
  db/                   database client and queries
  validation/           shared schemas
  <domain>/             pure logic, one folder per area
tests/ or *.test.ts     tests
```

- Pages and route handlers are thin. They validate input, call a focused module and return a typed result. They hold no business rules.
- Pure logic lives in `lib/` with no framework imports, so it can be tested alone.
- Components compose UI. They render state and call actions.

## Server and client

- Default to server components where the framework has them. Mark a component as client-side only when it needs state, effects or browser APIs.
- Mutations go through one mechanism (server actions or an API layer), not a mix.
- A handler validates its input with a schema, does a small write, and hands slow work (mail, syncing, model calls) to a background task. It never does slow network work while the user waits, except a single quick check with a short timeout.
- Secrets and server-only code never reach the client bundle. Know which env prefix exposes a variable to the browser, and use it only for values that are safe to publish.
- A static export has no route handlers, server actions, middleware or server-only fetching, and no routes that need ids unknown at build time. Use query strings or app state.

## Data

- One database client instance, shared.
- Every schema change is a named migration. Never edit a migration that has been applied.
- Put unique constraints on natural keys, and use upserts, so repeated writes are safe.
- All changes of a status go through one transition function that enforces the rules and writes the history.
- Derive state where you can, and do not store a second copy.
- Lists that can grow are paginated or virtualised.
- A user's manual edit wins over automatic detection.

## Background work

- Each task type has one handler, a payload schema and an entry in a registry.
- Handlers are safe to retry, with a limit and backoff.
- Schedules are defined in one place.
- On startup, tasks stuck as "running" from a crash go back to "pending".
- Finished task rows are cleaned up on a schedule.

## UI

- Tokens are defined once (a theme block or CSS variables). Components use the token utilities, never raw hex values or raw palette classes.
- If the component kit uses a name such as `accent` for its own purpose, give your brand colour a different name to avoid a clash.
- Restyle kit primitives through tokens. Do not edit their files.
- Build status badges, pills and similar repeated pieces as shared components. Never restyle them inline.
- Forms validate with the same schema on the client and the server, show errors beside the field, and disable the submit button while working.
- Every data view has loading, empty and error states.

## Performance and reach

- Images are sized, compressed and lazy-loaded below the fold.
- Fonts are self-hosted or loaded through the framework's font tool.
- Check the page at 360 px and at 1440 px wide.
- Public pages have a title, a description, a social image and a favicon.

## Tests

- Unit tests for pure logic: rules, parsing, transitions, URL builders.
- End-to-end tests for the few flows that must never break, run against a throwaway database.
- Outside calls are mocked. Fixtures are invented or anonymised.

## Mistakes specific to web apps

| Mistake | Do this instead |
|---|---|
| Using a framework API from an older version | Read the docs for the installed version |
| Marking everything as a client component | Keep it on the server unless it needs interactivity |
| Fetching directly inside a component | Go through the data layer |
| Slow work inside a request handler | Queue a task |
| Trusting the client's validation | Validate again on the server with the same schema |
| Editing kit components in `components/ui/` | Change tokens, or wrap the component |
| Raw palette classes (`gray-500`, `purple-600`) | Token utilities only |
| Editing an applied migration | Add a new one |
| A server-only secret in a public env variable | Keep it server-side |
| Building the page for desktop only | Check a narrow width too |

## Before a web change is done

- [ ] `check` passes, and so does the production build.
- [ ] I opened the page, used the feature, and saw no console errors.
- [ ] It was checked at a narrow and a wide width.
- [ ] Loading, empty and error states exist.
- [ ] Input is validated on the server.
- [ ] Any schema change has a migration, and the migration was run.
