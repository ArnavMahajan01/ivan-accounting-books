# 009: Bridge Contract and the First Bridge Function

Adds the only way the screens talk to the main process: named, validated functions, starting with `app.getInfo`.

**Client sees:** nothing yet. Internal.

## Depends On

- 008

## Implementation

1. `src/shared/bridge-contract.ts`: each entry has a name, a Zod input schema and a result type.
2. `src/preload/`: exposes the contract's functions through the context bridge, and nothing else.
3. `src/main/`: one handler per function, which validates input before doing anything, and returns a `Result`.
4. `app.getInfo` returns the app version and whether this is the development build. The page shows it.

## Check When Done

- The page shows the version and "development".
- Calling the bridge with wrong input returns a validation error. The main process logs only the event and the error code.
- No name other than the bridge exists on `window`.
- `npm run check` passes.
