# 019: Skill: React Renderer

Spec: [019](../feature-specs/01-agent-skills/019-skill-react.md)
Status: Done
Date: 2026-11-22
Branch: feature/01-agent-skills

## What was done

- `.claude/skills/react-renderer/SKILL.md`:
  - **Triggers:** `src/renderer/`, "screen", "page", "component", "table", "form", "dialog", "state".
  - **It starts with:** check the installed React (19.3.1), React DOM (19.3.1), Vite (8.3.8) and `@vitejs/plugin-react` (6.3.0).
  - **"How a screen gets its data":**
    - bridge functions only;
    - both sides of every `Result`;
    - a state union like `useBridge` in `App.tsx`, moved to its own file when a second screen needs it;
    - the states from `ui-context.md`: loading skeletons, empty with a next action, plain errors with a retry, long content, the "Sample data" label, confirm or undo;
    - money and dates through `formatCents` and `formatDateAU`.
  - **"The look":** points to `ui-context.md` ("How Screens Are Made"): the wireframe first, tokens and components (from spec 020), Impeccable `critique` and `audit` on every screen and `polish` before a demo, UI UX Pro Max as a reference, the sizes and modes to look at, and the order of authority.
  - **The rest:** settings in use, including what the content security policy allows; what changed in React 19 and the plugin; common mistakes; testing; what to do when it goes wrong; and `## Links`.
- `.claude/skills/README.md`: a row for it. It now has 11 rows for the 11 folders in `.claude/skills/`.

## Verified

- Every project path the skill names exists: 17 checked with `[ -e ]`. The rest are aliases (`@shared/...`), a module path (`react-dom/client`), a package name (`@vitejs/plugin-react`, installed) and the `app://bundle/` address.
- Every function it names exists: `useBridge` (`src/renderer/App.tsx`), `formatCents` (`src/shared/money.ts`), `formatDateAU` (`src/shared/dates.ts`).
- One claim was checked in the built app before writing it down. A `<style>` element setting the heading's colour to `rgb(1, 2, 3)` had no effect (the colour stayed `rgb(0, 0, 0)`), so inline style blocks are refused. A colour set through the element's `style` property did apply (`rgb(4, 5, 6)`), so React's `style` prop works. The skill says both.
- The skill is in the README. This session's skill list picked up `react-renderer`.

## Notes

- Component tests need a DOM test environment, which is not installed. The skill says to add it at the first spec that needs one (folder 02), not now.
- Spec 020 adds the design tokens and shared components, and updates this skill in the same change, as the spec's scope limits say.
