# 118: Google Sheet Inside the App

An optional panel showing the real Google Sheet inside the app, with Chrome always one click away (W07a, Option 2; risk G7).

**Client sees:** the sheet in a panel, or "could not open inside the app" with Open in Chrome.

## Depends On

- 117

## Implementation

1. An isolated, sandboxed panel that loads only Google's own pages, with no bridge and its own session.
2. If sign-in is refused or the page does not load, show the plain fallback with Open in Chrome. No tricks to get past Google's block unless the author decides otherwise.
3. A setting turns the panel on or off. Disconnect clears its session.
4. As the author decided, the app shows no security warning about this.

## Check When Done

- Manual test on the test account: either the sheet opens and editing works, or the fallback appears. Both recorded.
