# W3a: Dispatch Board (Cursor, in the `dispatch-board` repo, branch `w3a-board`)

Read `AGENTS.md`, `docs/PRD.md` section 4, `contract/view.ts`, and `docs/TESTIDS.md`.

## You own
The whole `dispatch-board` repo except `contract/` and `docs/TESTIDS.md`.

## Build
1. **Routes:** `/t/[customer]` for `mesa-lane` and `pinecrest` (from `CUSTOMERS`). `/` lists both. Each page must look good inside a half-width iframe (about 700 px wide) on a projector: dark background, large readable text.
2. **Data:** `lib/loads.ts` generates about 40 fake loads per customer from a fixed seed (US lanes between real cities with lat/lng, carriers, equipment, rates, pickup times). Same data every load, so screenshots compare cleanly.
3. **Clock:** on the client, every 3 seconds move `progress` forward, update ETAs, and let a few loads become late. Keep the clock seeded so both customers stay stable across reloads (use time since the hour started).
4. **Customer views:** read `tenants/<customer>/view.json` (`ViewConfig`) at build time with a static import map. Apply columns (order, labels), filters, sort, and highlight rules (`when` conditions, `color`, `pinToTop`). If `tenants/<customer>/overrides.tsx` exists, render it in a slot above the table.
   - Start the two customers **different**: Mesa Lane shows load number, origin, destination, pickup, carrier, status, ETA, sorted by pickup. Pinecrest shows load number, origin, destination labeled "Consignee", equipment, carrier, rate, status, sorted by ETA. No highlights yet (the demo adds them).
5. **Billing:** `tenants/<customer>/billing.json` (`BillingConfig`, both start at 2 free hours, $75 per hour). The exceptions panel shows detention minutes and the charge computed from billing.json.
6. **Panels:** loads table, a simple US map (inline SVG outline, a line per active lane, a dot moving along it), and the exceptions panel (late loads and detention).
7. **Test ids:** every id in `docs/TESTIDS.md`.
8. Deploy to Vercel and connect the GitHub repo (the owner does the connection; you make sure `npm run build` passes).

## Done when
- Both boards render with different columns and sorting, trucks move, late loads appear over time.
- Changing only `tenants/mesa-lane/view.json` (for example add a red highlight for `minutesLate > 30` with `pinToTop`) changes only Mesa Lane's board.
- All test ids present. `npx tsc --noEmit` and `npm run build` pass. Commit to `w3a-board`.
