# 106: setup-google-cloud-project

Spec: [106](../feature-specs/09-demo-7-google-sheets/106-setup-google.md)
Status: Implemented, check deferred: waiting for the author's console steps
Date: 2026-11-27
Branch: feature/09-demo-7-google-sheets

## What was done

The code side is ready. The Google Cloud console steps are the author's, and have not been done yet.

- `.env.example`: `MAIN_VITE_GOOGLE_CLIENT_ID`, `MAIN_VITE_GOOGLE_CLIENT_SECRET` (placeholders, empty), and `GOOGLE_FAKE`. `.env` is gitignored.
- `src/shared/env.ts`: the three variables, checked with Zod (a client id must end `.apps.googleusercontent.com`; an empty value counts as not set). Tests in `env.test.ts`.
- **How the packaged app gets the client id:** electron-vite puts `MAIN_VITE_` variables from `.env` into the main process build (`import.meta.env`, typed in `src/main/env.d.ts`), so `npm run build` and `npm run package` carry it. Main reads it through `loadEnv` (`src/main/index.ts`). Without it, Settings says Google "is not set up in this copy of the app yet", and nothing else changes. A desktop client's id and secret are not private: Google treats a desktop app as a public client and protects the sign-in with PKCE (read on 2026-11-27).
- `npm run google:check` (`tools/google-check-run.ts`): the spec's check. Signs in through the browser, lists the files the app can see in Drive, and revokes the sign-in. Saves nothing.

## Steps for the author (Google Cloud console, read on 2026-11-27; Google renames menus often)

1. At https://console.cloud.google.com, sign in with the author's own Google account (not the client's) and create a project, such as "Accounting Books Test".
2. **APIs & Services → Library:** enable **Google Drive API** and **Google Sheets API**.
3. **Google Auth Platform → Branding:** app name "Accounting Books (test)", the author's support email. **Audience:** External, publishing status **Testing**. Add two **test users**: a test "owner" Google account and a test "accountant" Google account (both invented, neither the client's nor his accountant's).
4. **Data Access → Add or remove scopes:** add only `https://www.googleapis.com/auth/drive.file` ("See, edit, create and delete only the specific Google Drive files you use with this app"). Nothing else.
5. **Clients → Create client:** application type **Desktop app**, name "Accounting Books desktop". Copy the client id and the client secret.
6. In the project folder, copy `.env.example` to `.env` and fill in `MAIN_VITE_GOOGLE_CLIENT_ID` and `MAIN_VITE_GOOGLE_CLIENT_SECRET`. Never commit `.env`.
7. Run `npm run google:check`. The browser opens: sign in as the test owner, and allow access. Expected: `Drive answered 200. Files the app can see: {"files":[]}`, then `Disconnect: disconnected.`
8. Record below the date and that it passed. No ids or secrets.

Good to know:
- An External app in Testing gets sign-ins that expire after **7 days** (Google, "Using OAuth 2.0", read 2026-11-27). In testing the banner "Google needs you to sign in again" will appear weekly. That is expected.
- At go-live (folder 12, client question 14) the client's own project lives in his Workspace with Audience **Internal**: no 7-day limit and no Google review for `drive.file`.
- Sharing with the test accountant (spec 114) needs a second Google account. If the client's Workspace blocks sharing outside it (client question 8), his admin must allow it before Demo 7.

## Verified

- `npm run google:check` without `.env`: prints "Put MAIN_VITE_GOOGLE_CLIENT_ID in .env first (see .env.example and spec 106)." and exits 1.
- `env.test.ts`: no variables is fine; values copied empty from `.env.example` are fine; a client id that is not a Google one is refused, naming the variable and not its value.

**Not checked:** the spec's check (a sign-in to the test project listing no files). It needs the console steps above.

| Date | What the author did | Check |
|---|---|---|
| | | |

## Notes

- Spec 107 onwards were built against the in-memory Google (`src/google/fake-google.ts`) and a fake `fetch`, at the author's request to finish folder 09 without supervision. The gate "do not start 107 until 106's check passes" was passed over for that reason; every check against real Google is listed as not done in each spec's progress file.
