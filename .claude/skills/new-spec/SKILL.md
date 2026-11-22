---
name: new-spec
description: Write a new Accounting Books spec in the project's format, place it in the right folder with the right number, add a future idea, or schedule one. Use when the author raises a new feature, tool or change of plan, or says "write a spec for", "add this as an idea", "where does this go" or "schedule F0X".
argument-hint: "<idea description | schedule F0X>"
---

# Write, Place or Schedule a Spec

The rule this follows is `context/ai-workflow-rules.md` ("Adding New Work"). Read it first. It wins over this file.

## The format

Copy `context/feature-specs/SPEC-TEMPLATE.md` exactly, and look at a neighbouring spec in the same folder. Every spec has:

- `# NNN: Title`, then one or two sentences on why it exists.
- `**Client sees:**` what is new on screen for the next demo, or "nothing. Internal."
- `## Depends On`, `## Implementation` (numbered steps, each naming a file, function or component), optional `## Rules And Edge Cases`, `## Scope Limits` and `## Check When Done` (each item observable). The last check is "The checks in `README.md` ("Every Spec") pass."
- Optional: `## Decide First`, `## Manual Check`, `## Progress`.
- Title prefixes: "Skill: ..." (a skill in `.claude/skills/`), "setup-..." (a step outside the code), "guide-..." (a user guide), "Demo N: ..." (a client demo).

A good spec:
- is one verifiable step inside one system boundary (`architecture-context.md`, "System Boundaries"), at most about five steps;
- breaks no invariant (`architecture-context.md`, "Invariants");
- invents no behaviour. If the context files do not say, add a question to `context/client-questions.md` and ask;
- uses invented data only.

## New work the author raised

1. **Never stuff it into an existing spec.** Write a new one. An existing spec may only gain a dated one-line pointer or dependency note.
2. **Pick the folder:**
   - before code, phase W (`W-wireframes/`);
   - a skill, `01-agent-skills/`;
   - a feature, the earliest demo folder where the client should see it, after the folder whose data it builds on;
   - a change the client asked for at a demo, that demo's folder or the next;
   - not wanted now, or for the scale version, `future-ideas/`.
3. **Pick the number.** Between two specs, use a letter suffix: `065a`, `W05c`. Never renumber. The one renumbering is recorded in `feature-specs/RENUMBERING.md`.
4. **Split it** if it needs more than about five steps or crosses two boundaries.
5. **Update the indexes in the same change:** the folder's list in `context/feature-specs/README.md`, the tracker's "Next Up", any gate in `ai-workflow-rules.md`, and a `context/decisions/` note for a larger choice.
6. Say in the report where it went, and why.

## A future idea

1. Next free number: `ls context/feature-specs/future-ideas/` (F01 to F07 exist on 2026-11-22).
2. Create `F<NN>-<kebab-name>.md` with this line under the title: `> Status: future idea, not scheduled. Do not implement until moved into a numbered phase.`
3. Add `## Decide before scheduling` for its open questions.
4. Add it to "Future Ideas" in `context/feature-specs/README.md`, and a line in the tracker's "Session Notes".
5. Scale-version features (licensing, many clients, other banks) always go here (`CLAUDE.md` hard rule 4).

## Schedule a future idea

1. Resolve every "Decide before scheduling" item with the author, and record the answers.
2. Pick the folder and a number, with a letter suffix if it goes mid-sequence.
3. Update `context/project-overview.md` (scope) and `context/architecture-context.md` (if it touches boundaries or state) first.
4. Move the file, rename it `<number>-<name>.md`, and remove the status line.
5. Update `context/feature-specs/README.md` and `context/progress-tracker.md`.
