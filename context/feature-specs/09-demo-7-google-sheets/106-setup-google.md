# 106: setup-google-cloud-project

The Google Cloud projects: a test one owned by the author now, and the client's in his Workspace at go-live (risk G6).

**Client sees:** nothing yet.

## Decide First

- Client question 14 (who owns the Google Cloud project). Client question 8 (sharing outside his Workspace).

## Implementation

1. Exact steps for the author in the Google Cloud console: a project, the Sheets and Drive APIs, an OAuth desktop client, consent screen (Internal for his Workspace, Testing for the test project), scope `drive.file`.
2. Where to record the client id: `.env` locally (never committed), and how the packaged app gets it.
3. The author does the console steps personally. Record what was done and when, without secrets, in the progress file.

## Check When Done

- A small script signs in to the test project and lists nothing (no files yet), proving the client id works.
