# 108: Disconnect, and the Expired Connection Banner

Disconnecting cleanly, and a plain banner when Google needs signing in again.

**Client sees:** Disconnect, and "Google needs you to sign in again".

## Depends On

- 107

## Implementation

1. Disconnect revokes the token at Google and deletes it locally.
2. An expired or revoked token shows a banner linking to Settings. Google actions show "Offline" and wait when there is no internet.

## Check When Done

- Revoking access in the Google account page shows the banner on next use. `npm run check` passes.
