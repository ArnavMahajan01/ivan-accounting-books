# W05: Wireframe: To Review (Categorising)

Wireframes for the screen the client will spend most of his time in: turning bank lines into entries. Worth the most discussion with him, since it replaces the QuickBooks "For review" tab.

Note (2026-11-22): Option 1 was updated from the author's QuickBooks screenshots: separate Spent and Received columns, From/To, Match or account, transfers as a pair, and Post. Rules and the transactions list are W05a and W05b.

## Depends On

- W04

## Implementation

1. Run `/wireframe` for "the To review screen, where bank lines get an account and a GST code", choosing Wireframes only. Ask for the options to differ in how fast the client can work through 50 lines, since that is what matters here.

2. Check the options cover: a suggested account and GST code per line, accepting one line and accepting many, changing the account by typing, splitting a line across accounts, and marking a line as a transfer between his own accounts.

3. Check one option at least shows a keyboard-first flow (arrow keys, Enter to accept), as in `ui-context.md`.

4. Record the option names and the recommendation in the progress file. Add any question the wireframe raises (for example, how rules should be shown) to `client-questions.md`.

## Scope Limits

- No rules editor screen. If the client wants one, it becomes a new W spec.

## Check When Done

- The wireframe opens and every tab works.
- Split and transfer can each be seen in the recommended option.
- Invented data only.
