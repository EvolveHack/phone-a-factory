# Phone-a-factory: rules for every agent (Claude Code, Cursor)

Read `docs/PRD.md` and everything in `contract/` before writing code.

1. **Stay in your folders.** Your prompt in `prompts/` lists the folders you own. Never edit another workstream's files.
2. **Never edit `contract/` or `lib/store.ts`.** If you need a change, stop and write the exact change you need in your final message. The owner updates `main`.
3. **All reads and writes go through `lib/store.ts`.** Every status change uses `setStatus()`.
4. **Work against fake data first.** `lib/store.ts` falls back to fixtures when `DATABASE_URL` is missing.
5. **Commit to your own branch only.** Never commit to `main`, never push, never merge.
6. **Done means:** `npx tsc --noEmit` passes, `npm run build` passes, and your prompt's "Done when" works.
7. **Keep it small.** This is a hackathon demo. No auth, no extra abstractions, no new dependencies unless your prompt names them.
8. **Words people read** (floor screen, voice agent lines) are plain, short, complete sentences.
