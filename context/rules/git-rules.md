# Git Rules

How to handle branches, staging and commits. The project's own workflow file wins where it differs.

## The author runs git

- Do not commit or push unless the author asks, in this conversation, for this change.
- After each finished step, give copy-paste commands: the `git add` lines, then one `git commit -m "..."`.
- Being asked to commit once does not mean commit from then on.

## Before giving commit commands

1. Run `git status` and `git diff` to see what really changed.
2. List only the files changed in this step, by path.
3. Leave out anything already committed, unrelated work, and empty placeholder files for later steps.
4. Leave out anything gitignored. Tell the author if they seem to expect it to be pushed.
5. Check the diff for secrets, tokens, `.env` contents and real personal or client data.
6. Mention what was left out, and why.

## Staging

- Never use `git add -A` or `git add .`. They pick up unrelated and private files.
- Stage a whole folder only when every change inside it belongs to this step.
- In shared folders, stage single file paths.
- Never stage a parent folder that also holds other work.

## Commit messages

- One short line saying what the change does, in the style of the existing history.
- Follow the project's prefix convention if it has one (`feat(scope): ...`, `fix: ...`, `docs: ...`).
- No AI attribution lines, co-author trailers or tool signatures, unless the author asks for them.

## Branches

- Check the current branch before starting (`git branch --show-current`).
- If the project builds each phase or feature on its own branch, and you are on the wrong one, stop and give the author the commands to commit and switch before writing code.
- Create a branch with `git checkout -b <branch>`.
- A new branch starts from where the previous work finished, unless the project says otherwise.
- Merging into the main branch is the author's call.

## Never without asking

- `git push --force`, `git commit --amend` on pushed work, rebasing shared history.
- `git reset --hard`, `git checkout .`, `git restore .`, `git clean`, `git stash drop`. These destroy uncommitted work. Look at what would be lost first.
- Deleting branches or tags.
- Changing git config, hooks or remotes.
- Skipping hooks with `--no-verify`.

## Things that must never be committed

- `.env` files and any key, token, password or certificate. Only `.env.example` with placeholder values.
- Real email, documents, customer details or personal data, including in tests and fixtures.
- Databases, logs, caches and build output.
- The developer's home path inside built files.

If a secret reaches git, a log or a chat, tell the author at once. It must be rotated, not only deleted.

## Keeping history useful

- One commit per finished step. Do not mix a refactor with a feature.
- Do not reformat files you did not otherwise change.
- Before the first push of a repo, run a secret scan and confirm whether the repo should be private.
