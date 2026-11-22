# W11: Wireframe Sign-Off

Turns the client's choices into the plan. The chosen layouts are written into `ui-context.md`, so the screens built later match what he agreed. Spec 001 waits for this one.

## Depends On

- W10, and every redo spec it created

## Implementation

1. For each screen, write the chosen option's layout into the matching section of `ui-context.md` ("Screens"), top to bottom in words. Name the wireframe file it came from.

2. Update `project-overview.md` for any feature the client added or removed, and `client-questions.md` for any question the meeting answered.

3. Anything new the client asked for becomes a new spec or future idea in the right phase, following "Adding New Work" in `ai-workflow-rules.md`. Existing specs are not rewritten to hold it.

4. Write `decisions/wireframe-sign-off.md` from the decision template: the chosen option per screen, the date, and "Decided by: the client, reported by the author".

5. Update the tracker: phase W done, with the date.

## Scope Limits

- No visual design. Colours and type are confirmed at spec 020.
- No app code.

## Check When Done

- Every screen section in `ui-context.md` names its source wireframe.
- `decisions/wireframe-sign-off.md` exists, with the client's sign-off date.
- Every change from the meeting appears in a context file or a spec, and nothing in `wireframe-feedback.md` is left unhandled.
