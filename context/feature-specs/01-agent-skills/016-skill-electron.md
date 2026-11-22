# 016: Skill: Electron

A skill for this project's Electron code: the window, the bridge, the security settings and packaging, as built in folder 00.

**Client sees:** nothing. Internal.

## Depends On

- 015

## Implementation

1. `.claude/skills/electron/SKILL.md` from the kit's `TECH-SKILL-TEMPLATE.md`. Triggers: `src/main/`, `src/preload/`, `src/shared/bridge-contract.ts`, packaging config, "bridge function", "package the app".
2. Starts with: check the installed Electron version, read its docs before using an API.
3. "Add a bridge function" step by step, from 009.
4. The settings that must never be turned off, pointing to `context/rules/desktop-app.md`.
5. Ends with `## Links`.

## Check When Done

- Every path and name in the skill exists. Following "add a bridge function" for a throwaway function works, then it is removed.
