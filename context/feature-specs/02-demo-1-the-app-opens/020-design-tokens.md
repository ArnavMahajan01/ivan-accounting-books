# 020: Design Tokens, Light and Dark

Turns `ui-context.md` into the one tokens file every component uses, and confirms the colours, so the app has its look from the first screen.

**Client sees:** the app's colours and type, in light and dark.

## Depends On

- 019
- W11 (the wireframe sign-off, which rewrites `ui-context.md` "Screens")

## Implementation

1. Run UI UX Pro Max for candidate palettes and type for a calm desktop bookkeeping app (rules in its `SOURCE.md`). Show the author 2 or 3 candidates beside the current tokens. The author picks. Write the choice into `ui-context.md` ("Theme") first.
2. `src/renderer/styles/tokens.css`: every colour, size, radius, spacing and motion token in `ui-context.md`, for light and dark, following the system setting.
3. Measure contrast for every text pair in both themes. Record the ratios in `ui-context.md`. Every pair passes 4.5:1.
4. Update `DESIGN.md` from `ui-context.md`.

## Rules And Edge Cases

- No raw colour values anywhere else in `src/renderer/` (a lint rule or a search test).

## Check When Done

- A test page shows every token in both themes. The author has seen it.
- Contrast ratios are recorded. `npm run check` passes.
