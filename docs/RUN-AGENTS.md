# How to run the build

Cursor does all the work: building, reviewing, merging, contract changes, and test calls. Claude only verifies the finished result at the end (section 6).

Five Cursor windows run at the same time. Each one has its own folder and its own branch, so they never edit the same files.

| Window | Job | Folder | Branch it commits to |
|---|---|---|---|
| 1 | W1 Call and rules | `/Users/ym/Documents/GitHub/paf-w1` | `w1-call-rules` |
| 2 | W2 Builder | `/Users/ym/Documents/GitHub/paf-w2` | `w2-builder` |
| 3 | W3a Dispatch Board | `/Users/ym/Documents/GitHub/dispatch-board` | `w3a-board` |
| 4 | W3b Floor screen | `/Users/ym/Documents/GitHub/paf-w3` | `w3-floor-screen` |
| 5 | Lead: merges, contract, test calls | `/Users/ym/Documents/GitHub/phone-a-factory` | `main` (the only window allowed to) |

## 1. Once, before opening Cursor

Give W1, W2, and the lead the project's settings from Vercel (database, 8090, GitHub, and the sign-in for AI Gateway). W3a and W3b do not need them; they work on fake data.

```bash
cd /Users/ym/Documents/GitHub/paf-w1 && vercel link --yes --scope evolve-hack --project phone-a-factory && vercel env pull .env.local --yes
```
```bash
cd /Users/ym/Documents/GitHub/paf-w2 && vercel link --yes --scope evolve-hack --project phone-a-factory && vercel env pull .env.local --yes
```

The lead folder (`phone-a-factory`) already has `.env.local`.

If a secret you marked "Sensitive" in Vercel is missing from `.env.local`, that is expected: Vercel does not download sensitive values. Add that line to the folder's `.env.local` yourself.

## 2. Open each window the same way

1. Cursor: **File, New Window, Open Folder**, and pick the folder from the table.
2. Check the branch name at the bottom left matches the table. If not: `git checkout <branch>` in that folder.
3. Open the Agent panel (Cmd+I). Mode **Agent**. Location **Local**, not Background or Worktree (those make a separate copy and the work lands somewhere else).
4. Paste that window's prompt from section 3.

Start windows 1 to 5 together.

## 3. Prompts to paste

### Window 1: W1 Call and rules (`paf-w1`)
> Read `AGENTS.md`, `docs/PRD.md`, and everything in `contract/`, then do everything in `prompts/W1-call-and-rules.md`. Only edit the folders that prompt lists. Stay on branch `w1-call-rules` and commit there each time a piece works and `npx tsc --noEmit` and `npm run build` pass. Never commit to `main`, never push, never edit `contract/` or `lib/store.ts`. If you need a contract change, write the exact change in a file `CONTRACT-REQUEST.md` in this folder and stop working on that part. When everything in "Done when" works, write `DONE.md` in this folder with what you built and how you tested it, and commit it.

### Window 2: W2 Builder (`paf-w2`)
> Read `AGENTS.md`, `docs/PRD.md`, and everything in `contract/`, then do everything in `prompts/W2-builder.md`. Only edit the folders that prompt lists. Stay on branch `w2-builder` and commit there each time a piece works and `npx tsc --noEmit` and `npm run build` pass. Never commit to `main`, never push, never edit `contract/` or `lib/store.ts`. If you need a contract change, write the exact change in `CONTRACT-REQUEST.md` in this folder and stop working on that part. When everything in "Done when" works, write `DONE.md` with what you built and how you tested it, and commit it.

### Window 3: W3a Dispatch Board (`dispatch-board`)
> Read `AGENTS.md`, `docs/PRD.md`, `contract/view.ts`, and `docs/TESTIDS.md`, then do everything in `prompts/W3a-dispatch-board.md`. Stay on branch `w3a-board` and commit there each time a piece works and `npx tsc --noEmit` and `npm run build` pass. Never commit to `main`, never push, never edit `contract/` or `docs/TESTIDS.md`. When everything in "Done when" works, write `DONE.md` with what you built and how you tested it, and commit it.

### Window 4: W3b Floor screen (`paf-w3`)
> Read `AGENTS.md`, `docs/PRD.md`, and everything in `contract/`, then do everything in `prompts/W3b-floor-screen.md`. Only edit `app/page.tsx`, `app/(floor)/`, `components/`, `app/api/state/`, and `app/api/requests/[id]/`. Work against the fixtures: do not create `.env.local`. Stay on branch `w3-floor-screen` and commit there each time a piece works and `npx tsc --noEmit` and `npm run build` pass. Never commit to `main`, never push, never edit `contract/` or `lib/store.ts`. When everything in "Done when" works, write `DONE.md` with what you built and how you tested it, and commit it.

### Window 5: Lead (`phone-a-factory`, branch `main`)
> You are the lead for this build. Read `AGENTS.md`, `docs/PRD.md`, `docs/RUN-AGENTS.md`, and everything in `contract/`. Four other agents are building on their own branches in their own folders: `w1-call-rules` in `../paf-w1`, `w2-builder` in `../paf-w2`, `w3-floor-screen` in `../paf-w3`, and `w3a-board` in `../dispatch-board`. You are the only agent allowed to change `main`, `contract/`, and `lib/store.ts`.
>
> Every 20 minutes:
> 1. Look for `CONTRACT-REQUEST.md` in each folder. If a request is sound, make the change on `main` in this folder, run `npx tsc --noEmit`, commit, push, then in each other worktree run `git merge main` (if that worktree has uncommitted work, leave it and write a note in its `CONTRACT-REQUEST.md` saying "merge main when you reach a commit"). Delete the request file once handled.
> 2. Look for `DONE.md` in each folder. When one appears, review that branch: read `git diff main...<branch>`, check it only touches its own folders, run `npx tsc --noEmit` and `npm run build` in that worktree, and try its "Done when" yourself. If it passes, merge it into `main` here and push (or for Dispatch Board: in `../dispatch-board`, `git checkout main && git merge w3a-board && git push && git checkout w3a-board`). If it fails, write what is wrong in that folder's `REVIEW.md` and leave it unmerged.
> 3. After each merge, run `git merge main` in the other phone-a-factory worktrees so they stay current.
>
> Merge order: W1 and W3b first (in either order), then W2, then Dispatch Board whenever it is done. Pushing `main` deploys to Vercel automatically.
>
> Once W1 is merged: create a fifth worktree with `git worktree add ../paf-w4 -b w4-test-calls`, then do `prompts/W4-test-calls.md` yourself inside `../paf-w4`, run it against `https://phone-a-factory.vercel.app`, and fix W1's prompt or rules on `main` for every miss you can fix safely. Merge W4 when the score is at least 27 of 30.
>
> Keep a running log in `docs/BUILD-LOG.md` on `main`: each merge, each contract change, and the latest test-call score. When all five branches are merged and the full demo in `docs/PRD.md` section 10 works on the deployed URLs, write "READY FOR VERIFICATION" at the top of `docs/BUILD-LOG.md`, commit, and push.

## 4. Checkpoints (the lead tracks these in `docs/BUILD-LOG.md`)

| By | Must work |
|---|---|
| +4 hours | W1 and W3b merged. A real call to +1 408 762 6927 shows up as a card on https://phone-a-factory.vercel.app with its ending and reason. |
| +8 hours | W2 and Dispatch Board merged. A call builds, passes checks, and changes one customer's board only. |
| +11 hours | Approve flow, 8090 work orders, and test calls at 27 of 30 or better. No new features after this. |

If a checkpoint slips, cut in this order: 8090 writes, the moving map (use still dots), anything marked P1.

## 5. Rules for every window

- Only the lead window commits to `main` or pushes.
- Only the lead window edits `contract/` or `lib/store.ts`.
- Each build window stays in its own folder and branch.
- `npx tsc --noEmit` and `npm run build` must pass before any commit.
- Never paste keys into code. Keys live in Vercel and in each folder's `.env.local` only.

## 6. Final verification (Claude)

When `docs/BUILD-LOG.md` says "READY FOR VERIFICATION", ask Claude to verify. Claude will check, on the deployed URLs and the code on `main`:

1. Every branch is merged and `main` builds and type-checks in both repositories.
2. A call to +1 408 762 6927 reaches the agent, the tool call reaches the server, and a card appears on the floor screen.
3. A display-only ask goes live on one customer's board only, and the other board does not change.
4. A money ask and an access ask go to the right approver, and Approve and Decline work.
5. Undo and Veto work.
6. Each request has an 8090 work order with its label, reason, and pull request.
7. The test-call score.
8. Nothing writes outside its own folder, and no key is in the code.
