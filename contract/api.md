# CONTRACT: API routes

Only the owner edits this file. All JSON. Types are in `contract/types.ts`.

| Route | Owner | Called by | Body | Returns |
|---|---|---|---|---|
| `POST /api/voice/submit-request` | W1 | ElevenLabs server tool. Header `x-tool-secret: $ELEVENLABS_TOOL_SECRET` | `{ name, company, role, ask, caller_words, caller_phone? }` | `{ requestId, ending, reason, say_to_caller }` |
| `POST /api/requests/test` | W1 | W4 tests, local dev (no secret needed outside production) | same as above | same as above |
| `GET /api/state` | W3 (floor) | Floor screen, polled every second | none | `StateSnapshot` |
| `POST /api/requests/[id]/approve` | W3 (floor) | Review card | `{}` | `{ ok }`. Sets `approved`, then calls `promote(id)` from `lib/builder` |
| `POST /api/requests/[id]/decline` | W3 (floor) | Review card | `{ reason }` | `{ ok }` |
| `POST /api/requests/[id]/undo` | W3 (floor) | Undo button | `{}` | `{ ok }`. Calls `undo(id)` from `lib/builder` |
| `POST /api/requests/[id]/veto` | W3 (floor) | Veto button | `{}` | `{ ok }`. Calls `veto(id)` from `lib/builder` |
| `POST /api/build/next` | W2 | W1 after classifying; W2 itself after each build finishes | `{}` | `{ started, all }`. Starts queued requests (goes_live first, then oldest) until 3 are building, using `claimNextQueued()` so two calls never take the same request. `maxDuration = 800`. |

## Functions other workstreams call (signatures fixed here)

```ts
// lib/builder/index.ts (W2)
export async function promote(requestId: string): Promise<void>; // preview -> production, PR merged, 8090 linked
export async function undo(requestId: string): Promise<void>;    // removes only this change from main and makes that deploy live, status "undone"
export async function veto(requestId: string): Promise<void>;    // stop the running build, status "vetoed"

// lib/factory8090/index.ts (W1)
export async function createWorkOrder(r: FactoryRequest): Promise<string | null>; // returns work order id; never throws
export async function linkPullRequest(workOrderId: string, prUrl: string): Promise<void>; // never throws
export async function addComment(workOrderId: string, text: string): Promise<void>; // never throws
```

Until W2 is merged, W3 uses stubs that only change the status in the store.

## Status changes

- W1: `received` -> `rejected` | `classified` -> `queued`, then `POST /api/build/next`.
- W2: `queued` -> `building` -> `checking` -> `live` (goes_live, all checks passed) | `waiting_for_approval` (needs_person, preview ready) | `failed` -> `waiting_for_approval`.
- W3 buttons: `waiting_for_approval` -> `approved` -> (W2 `promote`) -> `live` | `declined`. `live` -> `undone`. any building state -> `vetoed`.
- Every status change goes through `setStatus()` in `lib/store.ts`, which records the time.
