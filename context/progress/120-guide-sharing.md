# 120: guide-sharing-with-your-accountant

Spec: [120](../feature-specs/09-demo-7-google-sheets/120-guide-sharing.md)
Status: Done (following each guide with the real test account waits for spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- Five guides in a new Help group, **Google Sheets** (`GUIDE_GROUPS` in `src/shared/guide.ts`): Connect Google, Publish a report to Google Sheets, Share a sheet with your accountant, Use ready formulas, Accept or reject your accountant's changes. Each has a summary, numbered steps, and "If something goes wrong". The sharing and disconnecting steps say what to check first (`guide-writing-rules.md`, "Safety Advice"). One QuickBooks line, about the accountant's login.
- Seven images from the built app with the sample books and the in-memory Google at 1440, cropped and halved (all under 120 KB): `google-connected`, `publish-preview`, `share-dialog`, `share-check`, `shared-sheets`, `ready-formulas`, `accountant-changes`. Invented emails only (`owner@example.com`, `accountant@example.com`).
- Updated: Getting started (Reports, Shared sheets and Accountant changes are built, not "will"), and Read your profit and loss (Publish to Google Sheets is no longer "a later version").
- While taking the images, the three new drop-down lists were found unstyled; they now use the app's field style (`review-field`).

## Verified

- `npm run check`: the guide check (`tools/guide-problems.test.ts`) passes: every guide validates, ids match file names, images exist and are small. It first caught an image description over 300 characters; shortened.
- Each step was followed in the built app by a script with the in-memory Google: connect, publish the profit and loss and the transactions, share with the check step, copy a ready formula, accept a change. The Share guide was looked at in Help with its images.

**Not checked:** the steps with the real test account (Google's own sign-in page and consent screen, Google's email to the accountant). Needs spec 106. The guides were read once for plain wording by me, not by the author.
