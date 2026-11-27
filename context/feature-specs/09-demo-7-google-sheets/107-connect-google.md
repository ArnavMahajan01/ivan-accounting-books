# 107: Connect a Google Account

Signing in once through his normal browser, with the token kept safe on the Mac (risk G1).

**Client sees:** Settings, Google: "Connect Google", then "Connected as …".

## Depends On

- 106

## Implementation

1. System browser sign-in with PKCE and a loopback redirect. Never an embedded window for sign-in.
2. Refresh token encrypted with `safeStorage`, main process only, never logged.
3. Bridge functions `google.connect` and `google.getStatus`.

## Check When Done

- Connect with the test account, restart, still connected. The token is not in any log or plain file (searched).
