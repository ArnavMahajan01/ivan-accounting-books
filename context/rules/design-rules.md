# Design Rules

General rules for any interface. The project's `ui-context.md` holds the actual look (colours, fonts, screens) and wins where it is more specific.

Order of authority: the author's instruction, then `ui-context.md`, then these rules, then reference images and videos. References show a direction. They are not a specification.

## 1. Tokens

- Every colour, font, size, spacing step, radius, shadow and motion length is a named token, defined once.
- Components use tokens only. No raw hex values, no raw palette classes, no one-off pixel sizes.
- Tokens are named by role (`surface`, `text-muted`, `brand`), not by appearance (`light-blue`).
- To change the look, change a token. Do not restyle a shared component for one screen.
- If the app has light and dark themes, every token has a value in both.

## 2. Colour

- Split colour about 60 / 30 / 10: a quiet base, one brand colour, and one accent.
- The accent marks the single main action in a view. It is not used for text, status or decoration.
- Status colours (success, warning, error, info) only communicate status.
- Destructive actions use the error colour, so they cannot be mistaken for the main action.
- Colour goes in text, badges, bars and small markers. Large surfaces stay neutral.
- Text meets WCAG AA contrast: 4.5:1 for body text, 3:1 for large text and for the edges of controls. Check it over every background it can sit on.

## 3. Type

- One typeface for the interface, a second only with a clear job (a display face for titles, mono for code).
- Long text uses the reading face at a comfortable size, never the display face.
- A fixed scale. A good default: 12 captions, 14 body and controls, 16 section headings, 24 page titles.
- Two or three weights only.
- Fonts are system fonts or self-hosted with a licence that allows it. Offline builds cannot depend on a font CDN.

## 4. Space and shape

- One spacing scale. A good default: 4, 8, 12, 16, 24, 32, 48.
- Related things sit close. Unrelated groups get more space. Use spacing and hairlines before boxes.
- One radius scale, by kind of element: controls, cards, sheets, pills.
- Nested corners match: inner radius equals outer radius minus the padding between them.
- Do not put a card inside a card.

## 5. Layout

- Decide the navigation model once (top bar, sidebar or tab bar) and keep it.
- Content has a maximum width and consistent page padding.
- Design narrow first where the product is used on a phone. Check a narrow width and a wide one.
- No horizontal page scroll. Tables that are too wide scroll inside their own container.

## 6. Components

- Build from the project's existing components. Make a new one only when none fits.
- One component per job: one button, one badge, one dialog. Variants, not copies.
- Do not edit third-party component files. Restyle them through tokens.
- Icons come from one set, in one style. Never emoji as icons.

## 7. States

Every screen and every data-driven component handles:

| State | What to show |
|---|---|
| Loading | A skeleton shaped like the final layout, not a blank screen or a lone spinner |
| Empty | Short muted text, an optional icon, and a clear next action |
| Error | Plain language and a way to retry. Never raw error text |
| Offline or disconnected | Cached content stays usable, with a small indicator |
| Long content | Wraps or truncates with a way to see the rest. Never breaks the layout |
| Busy | The control is disabled and shows it is working |
| Destructive | A confirmation, or an undo |
| Sample data | A visible label until real data is connected |

## 8. Motion

- Motion answers something the user did or something that changed. It is never decoration.
- Short: about 150 to 200 ms for most transitions, with an ease-out.
- Nothing loops forever, and backgrounds do not move.
- All movement is off under reduced motion. Keep simple fades, and keep any label changes.
- Anything that prints or exports is never animated.

## 9. Accessibility

- Every control is reachable by keyboard, in a sensible order, with a visible focus ring.
- Every control and image has an accessible name.
- Colour is never the only signal. Pair it with an icon or words.
- Dialogs trap focus, close on Escape, and return focus to where it was.
- Text can scale without clipping.
- Touch targets are at least 44 by 44 points.

## 10. Charts

- Pick the chart by the question: change over time is a line, comparison is bars, parts of a whole is a stacked bar.
- Grid lines are thin and solid. Axis labels are small and muted.
- Every chart has a tooltip, and a text or table alternative for screen readers.
- Add a chart only when the data needs one.

## 11. What to avoid

- Decorative gradients on cards and buttons.
- Coloured card backgrounds.
- Badges that tell the user nothing they need.
- Filled icons mixed with stroke icons.
- Default browser or system controls where the design skins them.
- Hover-only actions on touch devices.
- Fake data without a label.

## 12. Check by looking

- Open the screen. Use it. Do not judge it from the code.
- Look at a small size and a large one, in both themes if there are two.
- Fill it with real-length content: a long name, a hundred rows, an empty list.
- Tab through it with the keyboard.
- If the project has a component preview page, check the component there before building a screen on it.
- If you could not look at it, say so in the report.
