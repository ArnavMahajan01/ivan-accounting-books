# 021: Basic Components: Button, Badge, Amount, Date

Spec: [021](../feature-specs/02-demo-1-the-app-opens/021-basic-components.md)
Status: Done
Date: 2026-11-22
Branch: feature/02-demo-1-the-app-opens

## What was done

- **Component library decision** (`ui-context.md`): the project's own components, no outside kit.
- **Installed**, development dependencies, pinned:
  - `lucide-react` 1.77.0, the icon set chosen at 020 (ISC licence).
  - For component tests: `jsdom` 31.0.1, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2 and `@testing-library/user-event` 14.6.13.
- **`vitest.config.ts`** now has two projects. `node` runs `src/**/*.test.ts` and `tools/**/*.test.ts`. `renderer` runs `src/renderer/**/*.test.tsx` in jsdom. `src/renderer/tsconfig.json` adds the `vite/client` types (for `import.meta.env`).
- **`src/renderer/components/`:**
  - `Button`: `default`, `main` (accent, the one main action) and `destructive` variants; `regular` and `small` sizes; an optional Lucide icon hidden from screen readers. It is always `type="button"` unless told otherwise. The focus ring comes from the global `:focus-visible` style, and the disabled state is shown at half opacity.
  - `Badge`: the eight statuses in `ui-context.md` ("Badges"), each with its words and tone (`BADGE_STATUSES`). Locked adds a lock icon. `RoleBadge` shows a share role in words. `ShareRole` moved to `src/shared/kinds.ts` (`SHARE_ROLES`), as `code-standards.md` asks.
  - `Amount`: `formatCents`, right-aligned, tabular figures, no wrapping.
  - `DateCell`: `formatDateAU`, inside `<time dateTime="YYYY-MM-DD">`.
- **Components page**, `src/renderer/dev/ComponentsPage.tsx`:
  - It shows every variant, with a Follow system / Light / Dark switch.
  - `main.tsx` loads it only when `import.meta.env.DEV` and the address ends in `#components`. Vite drops that branch from the build.
- **From the Impeccable review:** text selection now uses the brand colour, the badge icon size is a token (`--size-icon-badge`), and the page's theme switch shows which option is pressed.

## Verified

- `npm run check`: typecheck (both configs), lint, Vitest "Test Files 24 passed, Tests 247 passed". 18 are new component tests:
  - each Button variant;
  - the small size, and the icon hidden from screen readers;
  - click, Enter and disabled;
  - each badge status in words, with its tone;
  - the lock icon, and the role badge;
  - `Amount` shows `-$1,234.50` for -123450, plus `$43,642.35` and `$0.00`;
  - `DateCell` shows `21/11/2026` with `datetime="2026-11-21"`.
- The page is not in the build: after `npm run build`, no asset contains "Follow system" or `components-page`.
- **Looked at:** the components page inside Electron, loaded from the renderer dev server, at 1100 by 700, in light and dark. Both are readable, one coral main action, badges with words, amounts right-aligned with minus signs. No console errors.
- **Impeccable `critique` and `audit`:**

  > ⚠️ DEGRADED: single-context (the launcher and its detector are not run in this project, `.claude/skills/impeccable/SOURCE.md`)

  - Audit: accessibility 4, performance 4, theming 4, responsive 3 (a desktop window, 1100 wide minimum; the small button is 26 px high, fine for a pointer), implementation integrity 4. **No P0 or P1.**
  - P2, fixed: text selection used the browser's default blue (craft floor, "Browser surfaces").
  - P2, fixed: the page's theme switch set `aria-pressed` but showed no pressed state.
  - P3, fixed: the badge icon used a raw 12 px instead of a token.
  - P3, left: the main button's hover is a 5% darkening, which is subtle. Revisit if the author finds it too quiet.
  - Critique: the components follow the brief, a calm Mac app with one accent action, status always in words and money always signed, rather than a generic kit. Heuristics are mostly not applicable to a component page, so they were not scored. The real screens are critiqued at 024 and 025.
  - Not saved with `critique-storage` or `audit-storage`, which need the launcher. This record is the copy. Questions skipped: the author asked for the build to continue.

## Notes

- The detector could not be run, so the review rests on reading the code and the screenshots.
