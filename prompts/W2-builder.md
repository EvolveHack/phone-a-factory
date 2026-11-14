# W2: Builder (Claude Code, worktree `../paf-w2`, branch `w2-builder`)

Read `AGENTS.md`, `docs/PRD.md` (sections 5, 6, 7.3, 7.4), all of `contract/`, and the Vercel Sandbox docs (load the `vercel:vercel-sandbox` skill if you have it).

## You own
`lib/builder/` (replace the stubs, keep the signatures), `app/api/build/`, `scripts/sandbox-snapshot.ts`.

## The approach (keep it simple)
Use **GitHub + Vercel's Git integration** for previews and production:
- Dispatch Board is its own GitHub repo (`DISPATCH_BOARD_REPO`) connected to a Vercel project (`VERCEL_PROJECT_ID_DISPATCH`). A pushed branch gets a preview deploy; merging to `main` deploys production.

## Build
1. **`scripts/sandbox-snapshot.ts`**: create a Vercel Sandbox, clone Dispatch Board, `npm ci`, install Claude Code CLI and Playwright with Chromium, then snapshot it. Print the snapshot id. Builds start from this snapshot so they skip installs.
2. **`POST /api/build/next`** (`maxDuration = 800`): if `isBuilderBusy()` return `{ started: null }`. Else take `nextQueued()`, run `runBuild(request)`, and when done call `/api/build/next` again (use `after()`).
3. **`runBuild(request)`**, recording each step with `addStep()` (step names in `contract/types.ts`):
   - `building`: start the sandbox from the snapshot, `git pull`, create branch `ask/<request id>`.
   - `agent_editing`: run Claude Code headless (`claude -p`) with: the ask, the two "done when" lines, the customer id, the allowed files, and Dispatch Board's `AGENTS.md`. For `goes_live`, allowed files are only `tenants/<customer>/view.json` and `tenants/<customer>/overrides.tsx`. For `needs_person`, the agent may also edit `tenants/<customer>/billing.json` and shared code.
   - `checking`: `npm run build` (one retry by asking Claude Code to fix the error). `folder_check`: `git diff --name-only main` must be inside the allowed files. Commit, push the branch, open a PR (`pr_opened`).
   - `preview_deployed`: wait for the Vercel preview of that branch (Vercel API, poll every 3 s).
   - `browser_check_caller`: Playwright in the sandbox against `<preview>/t/<customer>`: check each "done when" line using the test ids in Dispatch Board's `docs/TESTIDS.md`. Simplest reliable method: ask Claude Code to write a short Playwright check for the two lines, then run it.
   - `browser_check_other_customer`: for the other customer, compare the preview's table (headers, row order, highlights) with production. Must be identical for `goes_live`.
   - `screenshot`: before (production) and after (preview) of the caller's board. Store them (Vercel Blob is fine; add `@vercel/blob`) and save the URLs on the request.
   - All passed and `goes_live`: `promote(id)`. All passed and `needs_person`: set `previewUrl`, status `waiting_for_approval`. Any failure: status `failed` then `waiting_for_approval` with the failure as `statusReason`.
4. **`promote(id)`**: merge the PR, wait for the production deploy, status `live`, `linkPullRequest()` from `lib/factory8090` (`linked_8090`).
5. **`undo(id)`**: roll production back to the previous deployment with the Vercel API (instant), status `undone`.
6. **`veto(id)`**: stop the sandbox for that request, close the PR, status `vetoed`.

## Done when
- Insert a `queued` goes_live request by hand (for example via `POST /api/requests/test` once W1 is merged, or a one-off script using `insertRequest`), call `POST /api/build/next`, and the change appears on that customer's production board only, in under 3 minutes, with both screenshots and the PR linked.
- A needs_person request ends at `waiting_for_approval` with a working preview URL, and `promote()` ships it.
- `undo()` restores the previous production deploy.
- `npx tsc --noEmit` and `npm run build` pass. Commit to `w2-builder`. List anything you needed changed in `contract/`.

## Speed tips
Most demo asks only change `view.json`. Tell Claude Code that first. Keep the sandbox warm by starting the next one from the snapshot while the current build is checking.
