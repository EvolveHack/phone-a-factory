# W3b: Floor screen (Cursor, worktree `../paf-w3`, branch `w3-floor-screen`)

Read `AGENTS.md`, `docs/PRD.md` sections 6, 7.4, 7.6, 10, and all of `contract/`.

## You own
`app/page.tsx` (the floor screen), `app/(floor)/`, `components/`, `app/api/state/`, `app/api/requests/[id]/` (approve, decline, undo, veto).

## Build
1. **`GET /api/state`** returns `getState()` from `lib/store.ts`.
2. **The four button routes** in contract/api.md. Approve: `setStatus(id, "approved")` then `promote(id)` from `lib/builder` (a stub until W2 merges). Decline takes `{ reason }`. Undo and Veto call `undo` / `veto`.
3. **Floor screen at `/`**, built for a 1920x1080 projector, dark, very large text, readable from the back of a room. Poll `/api/state` every second.
   - **Top half:** the two customers' boards side by side in iframes: `${NEXT_PUBLIC_DISPATCH_BOARD_PROD_URL}/t/mesa-lane` and `/t/pinecrest`, each labeled with the customer name. When a request for a customer goes `live`, reload that iframe and flash its border for 3 seconds. Use a placeholder panel if the env var is missing.
   - **Bottom left: queue.** One card per request, newest first: customer, caller name and role, the ask, the ending as a clear badge ("Goes live" or "Needs a person: Engineering lead"), the reason sentence, the status, and seconds since the call. Rejected requests show small and grey.
   - **Bottom middle: current build.** Steps for the request that is building or checking, each with a running, passed, or failed mark and its log line. The last step to make visible is "Other customer unchanged."
   - **Bottom right: review cards** for `waiting_for_approval`: customer, the caller's words, rule and reason, before and after screenshots (or the preview in a small iframe if no screenshots), Approve and Decline buttons. Live requests get an Undo button. Building requests get a Veto button.
   - **Score bar** along the bottom edge: calls taken, went live on their own, sent to a person, median time from call to live.
   - **Phone number** large in a corner: "Call +1 408 762 6927".
4. Use the copy in `docs/PRD.md`. Plain, short sentences.

## Done when
- With no `DATABASE_URL`, the screen shows the five fixture requests in their states, and Approve, Decline, Undo, and Veto change the cards.
- Looks right at 1920x1080. `npx tsc --noEmit` and `npm run build` pass. Commit to `w3-floor-screen`.
