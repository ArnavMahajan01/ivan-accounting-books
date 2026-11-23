# 027: Help: Guide Format and the Getting Started Guide

Spec: [027](../feature-specs/02-demo-1-the-app-opens/027-guide-format.md)
Status: Done
Date: 2026-11-23
Branch: feature/02-demo-1-the-app-opens

## What was done

- **The format:** one JSON file per guide in `guides/`, checked by `guideSchema` in `src/shared/guide.ts` (Zod): `id`, `title`, `group`, `summary`, and `sections`, each with `paragraphs` and `steps`, and a step may have an image (a file in `guides/images/` and a description). Plain text only: the schema refuses anything that looks like an HTML tag, and the reader (028) shows every string as text. SVG images are refused. The rules for writers are in `guide-writing-rules.md` ("Format").
- **The check:** `tools/guide-problems.ts` finds problems in a folder of guides (bad JSON, schema errors, a file name that is not the id, a missing image, an image over 300 KB). `tools/guide-problems.test.ts` runs it on the real `guides/` folder, and on throwaway folders for each kind of problem.
- **The guide:** `guides/getting-started.json`, written to `guide-writing-rules.md`: what the app is, finding your way around (with the shortcuts), where the books are kept, and what to do if something goes wrong.
- **Feature groups** are a typed list, `GUIDE_GROUPS`, which is also Help's order. It has one group today.

## Verified

- `npm run check`: passes (354 tests at the end of 028). New: `src/shared/guide.test.ts` (accepts a guide, refuses 11 kinds of bad one) and `tools/guide-problems.test.ts` (the real guides validate, every image exists, and each kind of problem is found).
- The sentences in the guide that describe the screen were checked against the code and the running app: the sidebar order, the shortcuts, the Settings About card ("integrity: ok") and the "The books could not be opened" message.
- Followed every step in the working app: sidebar click, Command-number, Command-?, Control-Command-S, and Settings, About.

Not checked: the guide has no image, so the image path (existing file, size) is tested only with throwaway files, and the reader's image display only with a test. Also not done: a read by the client for plain wording (check 3 in `guide-writing-rules.md`).

## Notes

- **The guide describes the app as it is at Demo 1**, including "Some pages are still empty while the app is being built." Per `guide-writing-rules.md` ("Keeping Guides Current"), each later folder that fills a page must update the "Find your way around" paragraph and remove that sentence when nothing is left empty. Added to the tracker's follow-ups.
- The guide does not name the app's data folder, so the final product name can change without editing it.
