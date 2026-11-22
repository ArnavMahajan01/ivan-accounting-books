# Design

Generated from `context/ui-context.md` on 2026-11-22 (updated at spec 020) for the Impeccable skill. That file wins wherever they differ, and is updated first. Do not run `/impeccable document` on this file.

## World

A calm, Mac-native bookkeeping app: a left sidebar, solid surfaces for every table and form, numbers easy to scan. Closer to a well-made Mac app than to a web dashboard. The layouts come from the client's signed-off wireframes (`wireframe/`, decided at W11).

## Tokens

Defined once in `src/renderer/styles/tokens.css`, light and dark, following the system unless picked in Settings. Confirmed at spec 020 (2026-11-22): deep teal brand, coral accent for the one main action, a quiet blue-grey background, solid white or dark-teal surfaces. Every text pair passes 4.5:1, measured and listed in `context/ui-context.md` ("Theme"). The sidebar glass sits over the app's own background, never the desktop.

- Icons: Lucide (ISC), one stroke set. 16 inline, 20 in buttons and the sidebar, 32 in empty states.

- 60% quiet base, 30% brand (selection, links), 10% accent. The accent marks only the single main action on a view.
- Status colours only communicate status. Destructive actions use the error colour.

## Type

The system font (San Francisco). Tabular figures for every amount. Page title 24/600, summary number 28/600, section heading 16/600, body and amounts 14/400, labels 13/500, column headers 12/500, captions 12/400.

## Layout

- Window minimum 1100 by 700. Also 1440 wide and full screen on 27 inches.
- Sidebar 232 wide, glass, collapsible. Content padding 24 to 32. At most one level of card.
- A toolbar on each page: title left, actions right, one main action.
- Wide tables scroll inside their own container.
- Spacing 4, 8, 12, 16, 24, 32, 48. Radius: controls 8, cards and tables 12, dialogs 16.

## Do Nots

- No glass behind tables, forms or reports.
- No accent except on the one main action. No coloured card backgrounds.
- No red-only or green-only amounts: negatives have a minus sign.
- No raw colour values in components. No emoji as icons.
- No hero banners, centred marketing layouts or hover-only actions.
- No unlabelled sample data.
