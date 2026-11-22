# W02: Wireframe Design Context

Runs the wireframe skill's first-run setup, so it knows this is a Mac accounting app with a sidebar and not a website. Every later wireframe reads this context.

## Depends On

- W01

## Implementation

1. There is no app code to scan yet. Give the skill the context files instead: `project-overview.md` (users, flow, features), `ui-context.md` (layout, sidebar, screens, states), and `research-notes.md` (the QuickBooks feature map).

2. When it asks for screenshots, use one of these, never the client's real QuickBooks screens with his data:
   - Screenshots of the QuickBooks Online sample company ("test drive"), for the screens the client says he uses (client question 1).
   - The client's own screens, only if he blurs every name, amount and account first.

   Save them in `wireframe/brain/`. They stay out of git (W01, step 5).

3. Answer the platform question with **Desktop**. Check the written `wireframe/brain/design-context.md` says: Mac desktop app, a left sidebar, a minimum window of 1100 by 700, light first, data-dense tables, and Australian money and dates. Correct anything it got wrong by hand. Where it differs from `ui-context.md`, `ui-context.md` wins.

4. Add a line at the top of `design-context.md`: "Generated for wireframes. `context/ui-context.md` wins wherever they differ."

## Scope Limits

- No wireframes yet. W03 onwards.
- Does not change `ui-context.md`. W11 does that after the client signs off.

## Check When Done

- `wireframe/brain/design-context.md` exists, names the target platform as Desktop, and lists the sidebar sections from `ui-context.md`.
- No screenshot in `wireframe/brain/` shows real client data. The author has checked each one by eye.
