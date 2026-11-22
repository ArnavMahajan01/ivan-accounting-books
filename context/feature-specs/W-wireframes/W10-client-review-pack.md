# W10: Client Review Pack

Puts every wireframe in one place for the author to walk the client through, and records what he chooses. This is the conversation before anything is built.

## Depends On

- W03 to W09

## Implementation

1. Create `wireframe/index.html`: a plain page linking each screen's wireframe in the order of the core user flow, with the recommended option for each and one line on why. It uses system fonts and no outside files.

2. Create `context/wireframe-feedback.md`: one section per screen, with the option the client picks, what he wants changed, and what he does not want. Leave it empty for the author to fill during the meeting. Each row says who said it and the date.

3. Add a short list of questions to ask in the meeting, taken from the open rows in `client-questions.md` that the wireframes can answer (questions 1, 6, 7 and any added during W05).

4. The author meets the client and fills in `wireframe-feedback.md`. For any screen he does not like, write a new W spec (`W03a`, ...) to redo it, rather than changing the earlier one.

## Scope Limits

- No changes to `ui-context.md` or the specs yet. W11 does that.

## Check When Done

- `wireframe/index.html` opens and every link works.
- `wireframe-feedback.md` has a section for every screen, filled in by the author after the meeting.
- Every redo the client asked for has its own W spec, listed in `feature-specs/README.md`.
