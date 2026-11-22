# Source: wireframe

- **Repository:** https://github.com/Magdoub/claude-wireframe-skill
- **Commit:** `44a5814d1583c4dc7cafa36611838669f0895af9` ("Extract shared HTML/CSS into templates, clarify skill-bundled paths")
- **Copied:** 2026-11-21, for spec W01
- **Licence:** MIT (`LICENSE`, kept unchanged)
- **Files kept:** `SKILL.md`, `LICENSE`, `README.md`, `wireframe/templates/` (`template.html`, `base.css`, `self-reveal.css`), `wireframe/brain/design-taste.md`. Not copied: `examples/` (screenshots of the author's own demo), `.git/`.
- **Changes:** none. The copied files match the commit byte for byte. Do not edit them. Project rules go here instead.
- **Read in full:** yes, before it was chosen. See `context/decisions/ui-and-wireframe-skills.md`.

## Project Rules For Using It

These win over `SKILL.md` where they differ.

1. **Platform:** Desktop. The app is a Mac window with a left sidebar, not a website.
2. **Scope:** choose **Wireframes only** unless the author asks for colour. Phase 2 (Clean and Polished) starts 5 agents and loads Google Fonts, so it is off by default.
3. **Data:** invented only. An invented business (the wireframes use "Harbour Lane Joinery Pty Ltd"), Australian dates (`21/11/2026`), AUD amounts, GST. No real client name, amount, account number or screenshot in any wireframe, in `wireframe/brain/`, or in a prompt.
4. **Screenshots:** QuickBooks sample company ("test drive") screens, or the client's screens blurred first. They stay out of git.
5. **Authority:** `context/ui-context.md` wins over `wireframe/brain/design-context.md` and `design-taste.md`.
6. **Window frame:** the template's browser address bar is relabelled with the app window title, since this is a desktop app. With Wireframes only, the unused Clean and Polished sub-tabs are hidden in the screen's `styles.css`, so the client is not shown "generating..." badges.
7. **Updating:** read any newer upstream commit in full before copying it, then record the new commit here (risk K4 in `context/security-risks.md`).
