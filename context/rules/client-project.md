# Project Type: Client Project

Rules for work built for someone else: a client who is not technical, who owns the data, and who will use the result without you. Add this file on top of the general rules, together with the file for the kind of app.

Written from a private app built for one client. In these rules, "the author" is the developer you work with, and "the client" is the person the app is for. You talk to the author. You never contact the client.

## What is different

- Requirements arrive second hand, and are often incomplete.
- The data is real, private and not yours.
- The client must be able to use, update and recover the app alone.
- Someone signs off each stage.

## Unknowns: the client questions file

Keep `context/client-questions.md`. It lists everything the client has not confirmed.

| # | Question | Assumption until answered | Affects | Status |
|---|---|---|---|---|

- Status is one of: `Open`, `Likely` (reported by the author, not yet confirmed by the client), `Answered`, `Assumption confirmed`.
- Work continues only if a safe assumption is written down. If no safe assumption exists, stop and ask the author.
- When the client answers, update the row, then every context file and spec the answer changes.
- Record who said it and the date: "reported by the author on 2026-11-07".
- Never invent product behaviour to fill a gap.

## Decisions

Larger choices go in `context/decisions/<topic>.md`: the options, the tradeoffs, a recommendation and the final decision with its date and reason. Once decided, update the architecture file, and do not edit the decision note again.

## Delivery in stages

- Deliver one working feature at a time, in the order the client asked for.
- Each feature includes everything it needs to really work: screens, data, outside setup, offline behaviour, its guide, and a security check.
- Do not build all the screens first and all the data later.
- Do not build for a later stage ahead of time.
- An unfinished section shows a simple "coming soon" placeholder. Sample data is always labelled.
- A stage is done only when it works with real data, its checks pass, and the client has accepted it.
- After each spec, report and stop. Wait for the author's go-ahead, unless a range of specs was approved.

## Steps outside the code

Some steps happen in a cloud console, a developer account or the client's own settings. Write them as setup specs that:

- Say exactly where to go and what to create, select or copy, checked against current official docs.
- Say what to record, and where it is safely stored.
- Mark clearly what the author or client must do personally: sign-ins, payments, consent screens.
- Include a small check that proves the setup works.

Stop and wait at these steps. Never ask for a password, and never paste a secret into chat, specs or progress files.

## The client's data

- Never use the client's real email, documents, customers or accounts in development or tests. Use test accounts and invented data.
- Never put real client content in specs, issues, progress files, commit messages, guides, screenshots or AI prompts.
- The developer should not read the client's real data while testing.
- Accounts and cloud projects belong to the client. The developer gets a limited role, removed at handover.
- Real accounts connect only after the security checks pass, and after the client has agreed in writing to the access needed.
- Check every commit for secrets and client data before giving the commit commands.

## Guides come with every feature

- A feature is not done until its guide is written and matches the app.
- Guides are in plain language, with short steps, using the words on the screen. See the writing rules.
- Each step is followed in the working app before the guide is called done.
- When a feature or a way of doing something is added, changed or removed, every affected guide is updated in the same change.
- Add a test that fails when a finished section has no guide.

## Handover

Write numbered walkthroughs in a `handover/` folder, for a person, not a model:

1. **Setup:** anything to enter or configure before the first run.
2. **Fresh start:** how to produce a clean install, with no development data in it.
3. **Full test:** every feature tested once, the way the client will use it, with tick boxes and invented data. All automatic checks pass first.
4. **Updating an existing install:** how to replace the app without losing data. Back up first. A fresh-start cleanup is never an update step.

Also give the client, in plain words:

- What data the app holds, and where.
- How updates arrive, and what to do if the app is deleted.
- What to back up.
- What to do if the device is lost or an account is compromised.

## Legal text

- Privacy policies and terms are drafts for the author and client to review. Say so. Never present them as legal advice.
- They must match what the app really does with data. Update them when that changes.

## Mistakes specific to client work

| Mistake | Do this instead |
|---|---|
| Filling a gap with a guess | Add it to the client questions, with a safe assumption |
| Treating the author's report as the client's confirmation | Mark it `Likely`, and confirm later |
| Building several features ahead | One feature, finished and accepted, then the next |
| Real client data in a test, screenshot or prompt | Invented data only |
| Asking for a password in chat | A setup step the author does personally |
| A feature with no guide | The guide is part of the feature |
| A guide that describes something removed | Search every guide when anything changes |
| Update steps that wipe data | Updates keep the data folder and secure store |
| Unlabelled sample data | A visible label until real data is connected |
| Committing without checking for client data | Check the diff first |

## Before a stage is done

- [ ] Every spec in the stage is complete.
- [ ] The feature works with real data on the target device.
- [ ] Its sample data is gone, and nothing unlabelled remains.
- [ ] Its guides are written, and each step was followed in the app.
- [ ] The risk register is reviewed, with no open high risk due in this stage.
- [ ] The client tried it, and the feedback is handled or moved to future ideas.
- [ ] The tracker shows the stage as signed off, with the date.
