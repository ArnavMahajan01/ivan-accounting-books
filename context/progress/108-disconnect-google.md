# 108: Disconnect, and the Expired Connection Banner

Spec: [108](../feature-specs/09-demo-7-google-sheets/108-disconnect-google.md)
Status: Implemented, check deferred (needs spec 106)
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

- Disconnect (bridge `google.disconnect`): asks first ("Disconnect Google?", saying the sheets stay in Drive and the people keep their access), deletes the encrypted file, forgets the access token, then revokes the refresh token at Google. If Google cannot be reached it is still forgotten on this Mac, and the card says the access can be removed in his Google account's security settings. It never deletes a file in Drive.
- An expired or revoked sign-in (`invalid_grant`) changes the status to "needs sign-in". `GoogleBanner` shows above every page: "Google needs you to sign in again. Your sheets are safe in Google Drive; publishing and checking for your accountant's changes wait until you do", with "Sign in again in Settings". The status is asked again when the window comes back to the front.
- "Offline": every Google call returns `offline` when Google cannot be reached; the publish and share screens (specs 110 to 115) say so and change nothing.

## Verified

- `npm run check` passes. `connection.test.ts`: disconnect revokes and deletes; offline disconnect still forgets and says `not-revoked`; `invalid_grant` gives needs-sign-in and tells the screens. `google.test.tsx`: the confirmation, Cancel changes nothing, the banner shows only for needs-sign-in and links to Settings.

**Not checked:** revoking access in the test account's Google page and seeing the banner on next use (needs spec 106).

## Notes

- Marking sheet links as disconnected and clearing the sheet panel's session on disconnect come with specs 110 and 118.
