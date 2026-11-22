# 016: Skill: Electron

Spec: [016](../feature-specs/01-agent-skills/016-skill-electron.md)
Status: Done
Date: 2026-11-22
Branch: feature/01-agent-skills

## What was done

- `.claude/skills/electron/SKILL.md`, from the kit's `TECH-SKILL-TEMPLATE.md`, written from the code as built in folder 00:
  - **Triggers:** `src/main/`, `src/preload/`, `src/shared/bridge-contract.ts`, `electron.vite.config.ts`, `electron-builder.yml`, "bridge function", "npm run dev", "package the app", and Electron launch, CSP, sandbox or fuse errors.
  - **It starts with:** check the installed versions of Electron (45.4.1), electron-vite (6.0.0) and electron-builder (26.18.0), and read the docs for that version.
  - **"The settings that must never be turned off":** every `webPreferences` value, `app://`, navigation and permission blocking, the policy, the instance lock, the ` Dev` folder, the fuses, the refused debugging flags and the menu. It points to `context/rules/desktop-app.md` for the reasons.
  - **"Add a bridge function" in six steps:** contract, handler, (no) preload change, screen, tests, check. It follows spec 009 and the code.
  - **The rest:** settings in use, what changed in recent versions, a common-mistakes table (including `ELECTRON_RUN_AS_NODE`), how it is tested, what to do when it goes wrong, and `## Links` to the official docs.
- `.claude/skills/README.md`: a row for it.

## Verified

- Every path in the skill exists: 20 checked with `[ -e ]`. The only non-file is the `file://` scheme, named as something not to use. Every function and constant it names exists in `src/`: `handleBridgeCall`, `registerBridge`, `BRIDGE_NAMES`, `bridgeContract`, `BridgeResults`, `createHandlers`, `HandlerDeps`, `isAppUrl`, `APP_ENTRY_URL`, `useBridge`, `createTestDatabase`, `READ_STATUS_SCRIPT`.
- "Add a bridge function" was followed for a throwaway `app.ping` (input `{ text }`, at most 20 characters):
  - After step 1 alone, typecheck failed with `Property '"app.ping"' is missing in type ... but required in type 'BridgeHandlers'`, as the skill says.
  - After steps 2 to 5: `npm run check` gave "Tests 226 passed (226)". In the built app, the page showed "hello", `Object.keys(window.bridge)` included `app.ping` with no preload change, and `app.ping({ text: 42 })` returned `invalid-input`.
  - It was removed with `git checkout` of the four files. `grep -rn app.ping src` found nothing, the check went back to 225 tests, and the rebuilt preload no longer contains `app.ping`.
- This session's skill list picked up `electron` with its description.

## Notes

- When folder 02 adds design tokens and components, or folder 09 adds Google sign-in, this skill gains the matching sections in the same change.
