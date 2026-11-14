# Contract request from W2

W2 did not edit `contract/`. Please add these environment variables to `contract/env.md`.

| Name | Used by | What |
|---|---|---|
| `SANDBOX_SNAPSHOT_ID` | W2 | Printed by `npx tsx scripts/sandbox-snapshot.ts`. Builds start from this snapshot. |
| `BLOB_READ_WRITE_TOKEN` | W2 | Vercel Blob token for the before and after screenshots. Vercel sets this when a Blob store is connected to the phone-a-factory project. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | W2 | Optional. Sent as `x-vercel-protection-bypass` so the browser checks can open a protected preview. |

`VERCEL_PROJECT_ID` is already set by Vercel on the phone-a-factory deployment. The sandbox uses it with `VERCEL_TOKEN` and `VERCEL_TEAM_ID`. Deploys, promote, and rollback use `VERCEL_PROJECT_ID_DISPATCH`.

## Fixture note

`contract/fixtures.ts` includes `req_building_1` with status `building`. `isBuilderBusy()` is then true whenever the in-memory store is seeded, so `POST /api/build/next` does not start a build unless `DATABASE_URL` is set. No type change is required. A local run without Postgres needs that fixture's status to be something other than `building`, `checking`, or `approved`.
