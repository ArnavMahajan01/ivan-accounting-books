# W05a: Wireframe: Bank Rules

Wireframes for bank rules: the list in priority order, and editing a rule (money in or out, which accounts, conditions, then account, GST, payee, split, and posting by itself), with a test. Added on 2026-11-22 from the author's screenshots of the client's QuickBooks (`references/imagesforaccountant/`, structure only). He uses rules today, including ones that post by themselves.

Part of the client review pack. It follows W05 and comes before the W10 meeting.

## Depends On

- W05

## Implementation

1. Make 5 black-and-white options in `wireframe/2211-bank-rules/` with the wireframe skill, Wireframes only.
2. Cover: the ordered list; the edit panel with a test; making a rule from a posted line; plain-sentence rules; suggested rules.
3. Take only layout and structure from the author's QuickBooks screenshots. Every name, payee, number and amount is invented, matching W03 to W09.
4. Add it to `wireframe/index.html`, and a section to `context/wireframe-feedback.md`.

## Scope Limits

- No rule changes a locked quarter. Posting by itself still goes through the posting service and its history.

## Builds Into

- Specs 078 to 082 (bank rules).

## Check When Done

- The wireframe opens from `wireframe/index.html` and every tab works.
- No name, number or amount from the screenshots appears in it.
- The author has clicked through all 5 options.
