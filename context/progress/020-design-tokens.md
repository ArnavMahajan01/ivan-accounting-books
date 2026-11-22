# 020: Design Tokens, Light and Dark

Spec: [020](../feature-specs/02-demo-1-the-app-opens/020-design-tokens.md)
Status: Done. The author's look at the preview is pending
Date: 2026-11-22
Branch: feature/02-demo-1-the-app-opens

## What was done

- **Step 1, the palette.** UI UX Pro Max was searched for candidate palettes and type:
  - "calm finance bookkeeping desktop app", "accounting software invoicing small business" and "fintech banking dashboard" in `color`;
  - "professional finance desktop" in `typography`.
  - Candidates: navy and gold (traditional banking), trust blue and green (personal finance), calm cyan (healthcare), and the fonts IBM Plex Sans and Lexend.
  - The author asked for the recommended choice, which is the palette already in `ui-context.md`. Candidates are recorded there, not used.
- **Step 2:** `src/renderer/styles/tokens.css` holds every colour, type size and weight, spacing step, radius, size (sidebar, icons, focus ring, window minimum) and motion token in `ui-context.md`.
  - Light is the default. Dark follows `prefers-color-scheme`, unless `data-theme="light"` is set, and `data-theme="dark"` forces dark (for the Settings choice later).
  - Reduced motion shortens the duration.
  - `src/renderer/styles.css` imports it and sets the base page styles and the focus ring, with tokens only.
- **Step 3:** contrast measured with the WCAG 2 formula for every text pair in both themes (29 pairs each), including text on the sidebar glass. Recorded in `ui-context.md` ("Theme"). Every pair passes 4.5:1. The lowest are 4.75 (muted on the light background) and 4.65 (warning on the light secondary surface).
- **Step 4:** `DESIGN.md` updated from `ui-context.md`.
- **The rule:** `tools/no-raw-colours.test.ts` fails on any hex, `rgb()`, `hsl()`, `oklch()` or similar colour in `src/renderer/` outside `tokens.css`. It also checks that the two dark blocks are identical, and that all 16 colour roles appear in light and in both dark blocks.
- `tools/token-preview.html` shows every token (`?theme=dark` for dark). It is a development page in `tools/`, which is never packaged.
- **The icon set:** Lucide (`lucide-react` 1.77.0, ISC licence, React 19 supported), recorded in `ui-context.md`. Installed at 021, when the first component uses it.
- **Found and fixed:** the UI UX Pro Max rule in its `SOURCE.md` used `PYTHONDONTWRITEBYTECODE=1` with `python3 -I`, but `-I` ignores `PYTHON*` variables, so running it left a `__pycache__` in the skill. It now uses `python3 -I -B`, checked to write no cache. The stray cache folder was removed.

## Verified

- `npm run check`: Vitest "Tests 229 passed (229)", typecheck and lint pass.
- With a throwaway `src/renderer/tmp.css` holding `#ff0000`, the colour test failed with `src/renderer/tmp.css: #ff0000`. The file was then removed.
- `npm run build`: `out/renderer/assets/index-*.css` (4.39 kB) holds both `--color-brand: #0f5e6e` and `#6ccbd9`.
- The preview was screenshotted in headless Brave at 1200 wide in light and dark. Both show all 16 colours with their values, text on each surface and on the glass, the accent button, status colours, type sizes and spacing. Looked at: everything readable, nothing missing.

Not checked: the author looking at the preview. Open `tools/token-preview.html` in a browser, and again with `?theme=dark`.

## Notes

- **Text on glass fails over the opposite extreme:** over a black desktop the light glass gives muted text 2.87, and over white the dark glass gives 1.59. So the glass is drawn only over the app's own background, never with window translucency. This is recorded in `ui-context.md`, and spec 024 must keep to it.
