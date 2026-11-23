# Guide Writing Rules

Rules for the guides in the app's Help section, kept in `guides/`. The client opens one when he has forgotten how to do something, so it needs to get him unstuck quickly.

## The Reader

The client: a small business owner who knows his business and his money well, but is not technical. He is used to QuickBooks. He is usually in the middle of his bookkeeping. Assume he remembers nothing from any other guide.

## Wording

- Use plain, everyday words. Say "bring in your bank file", not "ingest a statement".
- Use the same words as the screen, and match button names exactly.
- Speak to the reader directly, as "you".
- Accounting words he already knows are fine: account, GST, BAS, profit and loss, reconcile. Technical words are not: database, OAuth, sync, API.
- Where QuickBooks did the same job differently, say so in one line: "In QuickBooks this was the For Review tab."
- Keep sentences short.

## Structure

Each guide covers one job, and its title says what the job is, such as "Bring in a Westpac statement".

1. **Summary:** one sentence on what the guide helps with.
2. **Steps:** numbered, with one action per step. Say where to click, then what happens. Add an image where it helps.
3. **If something goes wrong:** the likely problems, and what to do about them. Only include real ones.

Keep guides short. If one needs more than about 8 steps, split it.

## Images

- Add them with each guide. Show the real screen for that feature.
- Use sample data only. Never show real transactions, amounts, account numbers, contacts or email addresses, even in a screen that is otherwise real.
- Crop to the part that matters.
- Keep each image under 300 KB.
- Each image has a description, for anyone who cannot see it.
- Retake them whenever a screen in a guide changes.

## Video

Images come first. A video is worth adding only when a job is hard to follow in pictures. Under 30 seconds and 5 MB, no sound, stored in the app so it works offline, with written steps too.

## Privacy

Guides ship inside the app. Never include passwords, keys, the client's business details, his accountant's details, or anything about his real books.

## Safety Advice

If a guide involves sharing, deleting, restoring, locking a period or signing in, say so before the step, and say what to check. For example: "Check the email address before you click Share. The accountant will be able to see everything in this sheet."

## Keeping Guides Current

Guides must always describe what the app does today, including every way to do a job. When anything changes, update the guides in the same change:

- **A new way is added:** add it to the guide, and keep the existing ways that still work.
- **A way is removed:** remove it from every guide that mentions it.
- **A way changes:** update the steps, names, images and any "if something goes wrong" advice.
- **A whole feature is removed:** delete its guides, and remove any mentions in other guides.

When a job can be done more than one way, use a section called "Ways to do this", and say when to choose each one. Before finishing any change, search the guides for the feature involved, so no mention is missed.

## Checking A Guide

A guide is done only when:

1. Each step has been followed in the working app.
2. Button names, screens and images match exactly.
3. It has been read once for plain wording.
4. Its feature's behaviour is final, or the guide is updated when it changes.

## Format

Decided at spec 027. A guide is one JSON file in `guides/`, named after its id, such as `guides/getting-started.json`. The schema is `guideSchema` in `src/shared/guide.ts`.

- `id` (lower case words joined by hyphens, the same as the file name), `title`, `group`, `summary` (one sentence), and `sections`.
- `group` is one of `GUIDE_GROUPS` in the schema, which is also the order Help lists them in. A folder that adds a new feature group adds it there.
- A section has a `heading`, then `paragraphs` and `steps`, at least one of them. A step has `text`, and may have an `image` (`file` in `guides/images/`, and a `description`).
- Everything is plain text. Help shows it as text, never as HTML, so `*`, `#` and `&amp;` show as written, and the schema refuses anything that looks like a tag. There is no bold: name a button as it is on the screen, in quotes if that helps.
- Images are PNG, JPEG or WebP (never SVG), under 300 KB, in `guides/images/`.
- `npm test` checks every guide: it validates, its file name matches its id, and every image exists.
- The build bundles `guides/` into the app, so Help works offline.

## Example

**Bring in a Westpac statement**

*Summary:* Add your latest Westpac transactions to your books.

1. In Westpac Online Banking on your Mac, open the account and choose **Export**. Pick **OFX**, and the dates you want.
2. In the app, click **Bank** in the sidebar.
3. Drag the file onto the window, or click **Import file** and choose it.
4. Check the preview. It shows how many lines are new and how many you already have.
5. Click **Import**. The new lines appear in **To review**.

*If something goes wrong:* If the preview says the closing balance does not match, a file may be missing between your last import and this one. Import the missing dates, then check again.
