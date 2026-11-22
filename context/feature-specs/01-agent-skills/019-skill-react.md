# 019: Skill: React Renderer

A skill for building screens: data only through the bridge, the states every screen needs, tokens and shared components, and the UI skills' checks.

**Client sees:** nothing. Internal.

## Depends On

- 015

## Implementation

1. `.claude/skills/react-renderer/SKILL.md`. Triggers: `src/renderer/`, "screen", "page", "component", "table".
2. Starts with: check the installed React and Vite versions.
3. How a screen gets data: bridge functions only, results handled as `Result`, with loading, empty and error states.
4. Points to `ui-context.md` ("How Screens Are Made") for the look, the components and the Impeccable checks.

## Scope Limits

- Tokens and components arrive in folder 02, which updates this skill in the same change.

## Check When Done

- Every path named exists. The skill is in the README.
