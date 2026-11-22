# Asset Rules

How to handle anything the project uses but did not write: fonts, icons, images, textures, 3D models, animations, audio and video. The project's own asset notes win where they are more specific.

An asset with no recorded source is a problem waiting for release day. Record it on the day it arrives.

## What may be used

- **Free and openly licensed by default.** Buying an asset is the author's decision. Many packs have a free tier and a paid tier: take the free one.
- **CC0** (no conditions) is preferred. **CC BY** is fine, with credit in the wording the creator asks for. **An open font licence** such as OFL is fine for fonts.
- **A creator's own licence** is fine only if it allows this use. Read it in full.
- **Not usable in a product that is sold or published:** "non-commercial", "editorial use only", "no games" or "no apps", and anything with no stated licence.
- **Licences change.** Read the licence on the download page on the day you download, and record exactly what it said. An older blog post or a mirror does not count.
- **Generated assets** (from an image or audio model): check the tool's terms for commercial use, and record the tool and the date. Ask the author before using one.
- Never hotlink. The project points at its own copy, never at a file on someone else's server.

## Where files go

```
assets/third-party/<pack>/    a download, unmodified, with its licence file and SOURCE.md
assets/art/<area>/            anything changed (recoloured, merged, optimised), with NOTES.md
assets/CREDITS.md             every source that ships, with author, licence and link
```

- `SOURCE.md` records: the download page, the date, the version, the licence as stated that day, and which files were kept.
- `NOTES.md` records: the source pack and file, and what was changed.
- If a pack ships no licence file, save the licence text from its page as `LICENSE.txt`, and say so.
- Never edit a file in `third-party/`. Put the edited copy in `art/`.

## When adding an asset

1. Read the licence on the download page today. If it does not allow this use, stop.
2. Put the download, unmodified, in `third-party/`, with its licence file and `SOURCE.md`.
3. Add it to `CREDITS.md`.
4. Put edited copies in `art/`, with `NOTES.md`.
5. Refer to it from code by a key, through one manifest, so it can be replaced without code changes.
6. Record the choice in the progress record.

## Credits

- One entry per source: what it is, who made it, the licence, and a link.
- CC BY entries use the creator's requested wording.
- If the product has a credits screen, it reads from this one list.
- Add a test that fails when a shipped asset has no credit.

## Fonts

- Self-host fonts, so offline and desktop builds work. Do not load them from a font CDN at run time unless the project is a normal website that chose to.
- Keep each font's licence file beside it.
- Ship only the weights and character subsets that are used, and note which, so a later translation knows what is missing.

## Icons

- One icon set, in one style. Record its licence like any other asset.
- Recolour through tokens or a build step, not by hand-editing files in `third-party/`.

## Size and quality

- Set budgets by kind (image weight, model triangles, audio length), and check them with a script.
- Optimise before shipping: compressed images, subset fonts, optimised models.
- Keep the editable source (a vector file, a scene file) beside the export, or record how to rebuild it.

## Mistakes with assets

| Mistake | Do this instead |
|---|---|
| Using an image found by search | Find its source and licence first, or do not use it |
| "It was free" with no record | `SOURCE.md` on the day of download |
| Trusting an old statement of the licence | Read the download page today |
| A non-commercial asset in something that will be sold | Leave it out |
| Editing the downloaded original | Keep it untouched. Edit a copy |
| A CC BY asset with no credit | Add the credit in the creator's wording |
| Loading a font or image from someone else's server | Ship your own copy |
| Suggesting a paid pack | Suggest free options, and let the author decide about paid ones |
