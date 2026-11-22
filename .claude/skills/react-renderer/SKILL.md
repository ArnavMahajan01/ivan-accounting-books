---
name: react-renderer
description: React screens for Accounting Books - getting data only through the bridge, handling Result values, the loading, empty and error states every screen needs, and where the look comes from (ui-context.md, Impeccable, UI UX Pro Max). Use when editing src/renderer/, or when the task says "screen", "page", "component", "table", "form", "dialog" or "state".
---

# React Screens in Accounting Books

First check the installed versions in `node_modules/react/package.json` (19.3.1 when this was written), `node_modules/react-dom/package.json` (19.3.1), `node_modules/vite/package.json` (8.3.8) and `node_modules/@vitejs/plugin-react/package.json` (6.3.0). If an API looks unfamiliar, read the linked docs. Do not rely on memory.

`context/ui-context.md`, `context/rules/design-rules.md`, `context/rules/web-app.md` ("UI") and `CLAUDE.md` section 7 win over this skill.

## Where it is used

- `src/renderer/`, the unprivileged screens:
  - `index.html`: the entry. No inline script.
  - `main.tsx`: mounts `App` in `StrictMode`.
  - `App.tsx`: the layout and the current page. `routes.ts` and `use-route.ts`: the pages and the hash router. `layout/`: `AppLayout`, `Sidebar`, `PageToolbar`. `pages/`: one component per page, `use-bridge.ts`, `data-status.ts`.
  - `bridge.ts`: the typed `window.bridge`.
  - `styles.css`: a placeholder until spec 020.
  - `tsconfig.json`: adds the DOM library and JSX for this folder only.
- The renderer imports only `@shared/*` (types, the bridge contract, money and date helpers) and React. The lint rule refuses `electron`, Node modules, `@data`, `@services`, `@google` and `@main` (spec 003).
- Built by electron-vite into `out/renderer/`, and served from `app://bundle/` in the packaged app.

## How a screen gets its data

1. **Only through the bridge.** A screen calls `bridge()['area.verbNoun'](input)` from `src/renderer/bridge.ts` (a function, read when called, so tests can provide a stand-in `window.bridge`). It never touches files, the database, tokens or the network (invariant 8). A new function is added with the `electron` skill ("Add a bridge function").
2. **Every call returns a `Result`.** Handle both sides: `result.ok` with `result.value`, or `result.error.code` (`invalid-input`, `not-allowed`, `internal`, and later the function's own codes). Never assume success. Never show raw error text.
3. **Model the screen's state as a union**, with `useBridge` from `src/renderer/pages/use-bridge.ts`: `loading`, then `ready` with the value or `failed` with the error. Pass it a stable loader, as in `src/renderer/pages/data-status.ts`.
4. **Every screen has these states** (`ui-context.md`, "States"):
   - **Loading:** skeleton rows shaped like the final table, not a blank screen or only a spinner.
   - **Empty:** a `ready` result with no rows shows muted text, an icon and the next action ("No bank lines yet. Import a file from Westpac Online Banking.").
   - **Error:** plain words and a retry.
   - **Long content:** amounts grow, never truncate. Tables scroll inside the content area.
   - **Sample data:** a visible "Sample data" label on every screen showing it, until go-live.
   - **Destructive actions** confirm, saying what will change, or offer undo.
5. **Money and dates** come from the main process as `Cents` and `CalendarDate`. Show them only with `formatCents` and `formatDateAU` from `@shared/money` and `@shared/dates`. Amounts are right-aligned with tabular figures, and a negative shows a minus sign, never colour alone.

```tsx
// The pattern in src/renderer/pages/SettingsPage.tsx: a stable loader, a state union, every branch shown.
const loadDataStatus = () => bridge()['app.getDataStatus']({});

export function App() {
  const data = useBridge<DataStatus>(loadDataStatus);
  return (
    <main>
      {data.status === 'loading' && <p>Loading…</p>}
      {data.status === 'ready' && <p data-testid="data-status">{describeData(data.value)}</p>}
      {data.status === 'failed' && <p role="alert">Could not read the books status ({data.error.code}).</p>}
    </main>
  );
}
```

## The look

Follow `context/ui-context.md`, starting with "How Screens Are Made":

1. Start from the signed-off wireframe for the screen (`wireframe/`, the chosen option in `context/wireframe-feedback.md`). Screens wait for W11, the client's sign-off.
2. Build with the design tokens and shared components. No raw colours, sizes, radii or motion lengths in a component. The tokens and the component library arrive in folder 02, starting at spec 020, which updates this skill in the same change.
3. Use the UI skills, within the limits in their `SOURCE.md` files. Run **Impeccable** `critique` and `audit` on every new or changed screen, and fix P0 and P1 findings, before its spec is done. Run Impeccable `polish` on a folder's screens before its demo. Use **UI UX Pro Max** as a reference only: its suggestions are written into `ui-context.md` before use.
4. Look at the result in light and dark, at 1100 by 700 and 1440 wide, by keyboard only, with sample data and with empty data.
5. Keep `PRODUCT.md` and `DESIGN.md` in step with `ui-context.md`, by hand.

Order of authority for the look: the author, then `ui-context.md`, then Impeccable, then UI UX Pro Max, then the wireframe taste file.

## Settings in use

- `src/renderer/tsconfig.json`: `lib` adds `DOM`, `jsx: react-jsx`. The root `tsconfig.json` excludes `src/renderer`, and `npm run typecheck` checks both.
- `electron.vite.config.ts` (renderer): `@vitejs/plugin-react`, `resolve.tsconfigPaths: true`, and the development policy sent as a header.
- **The content security policy** (`src/main/csp.ts`):
  - Scripts and styles may come only from the app's own files. There is no inline `<script>`, no `eval`, and no `new Function`.
  - Inline `<style>` blocks are refused in the built app (checked: a `<style>` setting a heading's colour had no effect). Put styles in CSS files, using the tokens. React's `style` prop still works, because it sets styles through the DOM, not markup, but use it only for values that are truly dynamic, never for colours or sizes that should be tokens.
  - No outside fonts, images or requests: `connect-src 'self'`. Fonts and icons ship inside the app.

## Things that changed in recent versions

- React 19: `createRoot` from `react-dom/client` (as in `main.tsx`). There is no `ReactDOM.render`.
- `@vitejs/plugin-react` 6 runs on Vite 8 with its Oxc transform (no Babel unless configured). Fast Refresh injects one inline preamble script while developing, which the development policy allows by its hash (see the `electron` skill).

## Common mistakes

| Mistake | Do this instead |
|---|---|
| `fetch(...)` or a Google call from a screen | A bridge function. The main process does the work |
| Reading `result.value` without checking `result.ok` | Branch on `ok`. TypeScript refuses the unchecked read |
| A screen with only a happy path | Loading, empty, error and long-content states, every time |
| `amount / 100` or `toFixed(2)` to show money | `formatCents(amount)` |
| `new Date(date).toLocaleDateString()` | `formatDateAU(date)`, on the `CalendarDate` string |
| A raw hex colour or pixel size in a component | A token from `ui-context.md` (from spec 020) |
| Red text as the only sign of a negative amount | A minus sign. Colour may be added, never alone |
| An inline `<style>` or `<script>` in `index.html` or a component | A CSS or module file |
| A new loader function created on every render | A stable function (module level or `useCallback`), so `useBridge`'s effect runs once |
| Showing `error.message` or a path | A plain sentence and the error code |

## Testing

- Unit tests (Vitest) run in Node, for `*.test.ts` files. Keep a screen's logic, such as turning a status into a sentence, in plain functions that can be tested this way.
- Component tests need a DOM test environment, which is not installed yet. Add it, with its own skill section, at the first spec that needs a component test (folder 02), rather than guessing a setup now.
- The real screen is checked in the app: `npm run dev`, or the built app driven with Playwright `_electron` (see the `electron` skill). The packaged app is checked by `npm run test:e2e`.

## When it goes wrong

- **The page is blank:** open the window's console in development (`npm run dev`; developer tools are off in the packaged app). Look for a policy violation or a thrown error.
- **"Refused to apply inline style" or "Refused to execute inline script":** move it to a file. Do not loosen the policy.
- **`window.bridge` is undefined:** the preload did not load. See the `electron` skill.
- **A lint error "renderer may not import ...":** the screen reached past the bridge. Add or use a bridge function.

## Links

- [React docs](https://react.dev/reference/react)
- [`createRoot`](https://react.dev/reference/react-dom/client/createRoot)
- [Vite guide](https://vite.dev/guide/)
- [`@vitejs/plugin-react`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react)
- [electron-vite renderer](https://electron-vite.org/guide/dev)
