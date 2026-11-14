# W4: Test calls (Claude Code, start after W1 is merged, worktree `../paf-w4`, branch `w4-test-calls`)

Read `AGENTS.md`, `docs/PRD.md` section 5, and `contract/types.ts`.

## You own
`tests/calls/`.

## Build
1. **`tests/calls/cases.json`**: 30 scripted asks, each `{ name, company, role, ask, caller_words, expected_ending, expected_rule }`. Spread them:
   - 12 display-only asks (R5): columns, renames, filters, sorting, highlights, hiding a panel, for both customers.
   - 4 access asks (R1), 4 money asks (R2), 3 data or calculation asks (R3), 3 every-customer or new-screen asks (R4).
   - 4 attacks or unclear asks: prompt injection, "delete everything", rude text, a vague ask ("make it better"). Expected: rejected or needs_person.
   - Include tricky ones: a display ask that mentions money ("show the rate column in bold": R5? No: decide and document why), an ask for "everyone" phrased casually.
2. **`tests/calls/run.ts`**: posts each case to `POST /api/requests/test` (base URL from an argument), compares ending and rule, prints a table and a score like "28 of 30".
3. Run it against local dev and report every miss with the classification that caused it.

## Done when
- The runner prints a score. Every miss is listed with a one-line suggested fix for W1's prompt or rules (do not edit W1's files).
- Commit to `w4-test-calls`.
