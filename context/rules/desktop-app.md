# Project Type: Desktop App

Rules for a desktop app built with web technology in a native shell. Add this file to a desktop project on top of the general rules.

Written from two Electron apps on macOS, one running a bundled local server and one loading a static export. Check the installed shell version and its current security guidance before applying any line.

## The shape

```
main process      privileged: windows, menus, files, secrets, network to outside services
preload bridge    a small set of named functions, nothing else
screens           unprivileged web pages: no file, process or secret access
```

- Only the main process touches the file system, the secure store, tokens and outside services.
- Screens reach the main process only through the bridge. They never receive a token.
- The bridge exposes named functions with validated input. It never exposes raw shell or runtime APIs.
- Only the shell's own folder imports the shell library.

## Two ways to load the screens

| Approach | Use when | Watch for |
|---|---|---|
| Static files served by a private app protocol | The app needs no server logic | No server routes or server actions. No routes with ids unknown at build time |
| A bundled local server started by the main process | The app needs server logic and a local database | The server must be locked. See below |

## Shell security settings

- Context isolation on, sandbox on, Node integration off.
- Load only the app's own content. Block other navigation, redirects, frame navigation and new windows.
- When checking a URL, compare scheme and host. Do not compare origin strings, which can match for `file:`, `data:` and `javascript:` addresses.
- Deny permissions by default, with both the request handler and the check handler.
- Open outside links in the system browser, only after checking the scheme.
- A content security policy without broad inline script allowance. If the framework needs inline scripts, allow them by hash.
- Take a single-instance lock.
- Packaged builds: a custom menu, developer tools off, debugging flags refused, and the risky shell fuses turned off.
- Pin the shell version exactly, and keep it current.

## A bundled local server

A local server can be called by any program or web page on the machine.

- The main process makes a random secret at each launch, passes it to the server, and sets it as a cookie in the app window. Every request without it gets a 403.
- Check the `Host` header is exactly `127.0.0.1:<port>`.
- Use a random port, bound to `127.0.0.1` only.
- The check covers everything: pages, actions, API routes and static files.
- The build's smoke test proves the 403s.

## Data and secrets

- User data lives in the operating system's app data folder, never inside the app bundle.
- Secrets go in the system secure store.
- Know how the secure store ties to the app's signature. With an unsigned or ad hoc signed build, a store keyed to the app identity can lose access after every rebuild. Test this on a rebuilt app before relying on it.
- Encrypt local caches of private content, limit their size, and let the user clear them.
- Local data formats carry a version. A new version migrates old data, and never deletes tokens or queued work without warning.
- A build run from source uses a different app name from the installed app, so the two never share a data folder or an instance lock.

## Packaging

- Copy a whitelist into the package. Never the `.env` file, the dev database or the logs.
- Fail the build if the developer's home path appears in any bundled file.
- Native modules are compiled for the shell's runtime, not for the system's.
- Keep `appId`, `productName` and the signing identity stable. Changing the name moves the data folder. Changing the identity can lose secure-store access.
- Applying database migrations at launch must be safe: back up or use a transaction, and check integrity after.
- Logs rotate at a fixed size.

## Updates

- Before each release, install the old version with data in place, update it, and confirm accounts, settings and queued items survive.
- Replacing the app must not touch the data folder or the secure store. A "fresh start" cleanup is not an update step.
- Automatic updates need a signed app, and only signed updates are accepted.

## App behaviour

- Decide what closing the window means (quit, or keep running in the background) and tell the user.
- Notifications are shown by the main process only, and hide private content by default.
- Launch at login is a visible, switchable setting.
- Deep links and file opens are validated like any outside input.

## Testing

- Test the packaged app, not only the dev server. Many bugs appear only after packaging.
- End-to-end tests drive the built app on a throwaway data folder and a throwaway secure-store entry, never the real ones.
- A terminal inside an editor may set environment variables that change how the shell starts. If the packaged app behaves like a plain script runner, launch it from the file manager or clear those variables.
- A freshly installed build may fail its first launch while the system checks it. Open it a second time before diagnosing.

## Mistakes specific to desktop apps

| Mistake | Do this instead |
|---|---|
| Calling an outside service from a screen | Call a named bridge function. The main process does the work |
| Sending a token to the renderer | Tokens stay in the main process |
| Exposing a general "run this" bridge function | Named functions with validated input |
| Storing data in the app bundle or project folder | The app data folder |
| Leaving a local server open | Per-launch secret, plus an exact Host check |
| Testing only in dev | Build, install and run the packaged app |
| Renaming the app or its id casually | It moves user data. Plan a migration and rehearse it on a copy |
| Shipping `.env` or the dev database | Package from a whitelist |
| Relying on a signature-bound secure store with an unsigned build | Test after a rebuild, or use a store that survives |
| Using fresh-start steps for an update | Updates keep the data folder and secure store |

## Before a desktop change is done

- [ ] `check` passes.
- [ ] The packaged app was built and launched, and the feature works there.
- [ ] No screen gained file, process or secret access.
- [ ] New bridge functions are named, narrow and validated.
- [ ] Existing user data still loads after the change.
- [ ] If a security setting, outside service or stored data type changed, the risk register is updated.
