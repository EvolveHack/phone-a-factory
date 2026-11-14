# CONTRACT: environment variables

Only the owner edits this file. Read through `process.env`. Never hard-code a key.

| Name | Used by | What |
|---|---|---|
| `DATABASE_URL` | all | Postgres (Vercel Marketplace). If missing, `lib/store.ts` uses an in-memory store with fixtures (local dev only). |
| `AI_GATEWAY_API_KEY` | W1, W4 | Vercel AI Gateway. Classification uses a Claude Sonnet model; W1 confirms the exact gateway model id. |
| `ELEVENLABS_TOOL_SECRET` | W1 | Shared secret the ElevenLabs tool sends in `x-tool-secret`. |
| `FACTORY_8090_API_KEY` | W1 | 8090 External API key (`sofa-ext-...`). |
| `FACTORY_8090_BASE_URL` | W1 | `https://api.factory.8090.dev/v2/external-api` |
| `FACTORY_8090_PROJECT_ID` | W1 | `7821cb45-9b82-4020-8bfc-4cc6230d3550` (Test_factory) unless changed |
| `GITHUB_TOKEN` | W2 | Token for the factory's GitHub account: clone, push branch, open and merge PRs on the Dispatch Board repo. |
| `DISPATCH_BOARD_REPO` | W2 | `owner/dispatch-board` |
| `DISPATCH_BOARD_PROD_URL` | W2, W3 | Production URL of Dispatch Board, e.g. `https://dispatch-board.vercel.app` |
| `VERCEL_TOKEN` | W2 | For sandbox, deployments, promote, and rollback. |
| `VERCEL_TEAM_ID` | W2 | |
| `VERCEL_PROJECT_ID_DISPATCH` | W2 | The Dispatch Board Vercel project. |
| `ANTHROPIC_API_KEY` | W2 | For Claude Code running headless in the sandbox. |
| `NEXT_PUBLIC_DISPATCH_BOARD_PROD_URL` | W3 | Same as `DISPATCH_BOARD_PROD_URL`, for the iframes. |
