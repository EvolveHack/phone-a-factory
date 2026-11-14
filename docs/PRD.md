# PRD: Phone-a-factory

**Status:** Draft, 2026-11-13. For the EVOLVE hackathon (8090 HQ, Nov 13 to 14). Solo build, split across Claude Code and Cursor agents working in parallel. New open source repository. No code before kickoff.
**Replaces:** the earlier versions of this file and `docs/PLAN-phone-a-factory.md`.
**Scope rule:** good enough for a live demo. Everything not built goes on the deck's "next" slide (section 14).

## 0. Five products (added 11-14)

The line now serves **five products, each with two customers**. The registry in `contract/products.ts` is the only list: product name, vendor, what it does, repo, production address, Vercel project, folder, snapshot and bypass env names, proof command, and its two customers. A customer id alone gives the product.

| Product | Vendor | Customers | Repo and folder |
|---|---|---|---|
| Dispatch Board | Relaytrack | Mesa Lane Freight, Pinecrest Logistics | `EvolveHack/dispatch-board`, repo root |
| Helpdesk Agent | Northpeak | Lumen Analytics, Cedar Health | `EvolveHack/factory-apps`, `products/helpdesk` |
| Order Flows | Tallyflow | Granite Supply, Bluewater Distributors | `EvolveHack/factory-apps`, `products/orders` |
| Cold Chain Monitor | Frostline | FreshFare Markets, Northgate Warehousing | `EvolveHack/factory-apps`, `products/coldchain` |
| Shopping App | Cartwise | Willow Pine Home, Summit Outdoor | `EvolveHack/factory-apps`, `products/shop` |

- **Call:** the agent asks for the company and confirms it with its product. The server maps the spoken name to a customer, allowing short forms and small slips ("Mesa", "Fresh Fair").
- **Facts:** adds `controlsDevices` (setpoints, defrost, locks, motors; alerts and reports are not device control). `displayOnly` now means the change, or a self-contained new feature, stays inside the caller's own product for that customer and touches no money, access, devices, outside systems, or other customers. An outside system (accounting, email to outsiders, EDI) is `newScreenOrConnection`.
- **Rules order:** R1 access, R2 money, **R6 devices (safety lead)**, R3 data, R4 every customer or outside connection, R5 goes live, DEFAULT product owner. Each reason names the customer and the product.
- **Builder:** everything comes from the registry. "Goes live" may edit only `tenantDir(customer)/` (never a `billing.json`). "Needs a person" may edit the product's folder, including the other tenant, but never another product's folder or `contract/`. Merges are one at a time **per repo**. If `package-lock.json` changed since the snapshot, the build runs `npm ci` first.
- **Checks:** Dispatch Board keeps the fast `view.json` check, the Haiku check, and the other-customer table compare. The other four products run their `proof.mjs` for the caller and for the other customer of the same product, then the Haiku done-when check (test ids from `products/<p>/TESTIDS.md`).
- **Floor:** each ticket shows the product (small) and the customer. Live tickets open the product's site and offer **Roll out to everyone**, which files a new ask for every customer of that product. It goes to the product owner at the gate like any other ask.

## 1. Problem

Software vendors that sell to businesses get a steady stream of small asks from their customers. A freight broker wants late loads shown in red. A contractor wants its estimate table in a different order. A credit union wants a field renamed. Each ask is ten minutes of work, and each one matters to that customer's daily routine.

Today the customer's staff file a support ticket. Then:

- **Small asks starve.** They always rank below the roadmap, so they wait for months. Engineers hate one-off tweaks for a single customer because they clutter the shared product.
- **Every ask waits for a person.** Support passes it on, a product manager ranks it, an engineer builds it, someone reviews it. Coding agents can now write the change, but the tools around them (Linear, Atlassian) still stop at a draft for a person to review, every time.
- **The customer never hears back,** and renewals suffer when "we asked for that six months ago" comes up.

**Who we sell to:** the VP of Engineering or VP of Customer Success at a mid-market vertical software vendor. We do not sell to the airline or the bank directly. Large regulated companies will not let an agent change their own systems without weeks of review. Their software vendors can, as long as each change stays inside one customer's view and cannot touch data.

**Beachhead:** logistics and freight software. Dispatchers live in dense tables all day, every customer wants its own columns, filters, and sorting, and display changes carry no regulatory review. Next: field service, lending platforms, and clinic billing software.

**Built on 8090.** Vendors build and run their product on 8090. 8090's own story with Mentix shows this kind of product.

## 2. The idea

**Support call, agent builds the change, then one of two endings:**

```
Support call ─▶ agent builds the change ─┬─▶ Goes live, for the caller's company only:
                                         │   checks pass, it ships, the caller is told
                                         │
                                         └─▶ Needs a person: the approver at the vendor reviews
                                             the finished change, approves, it ships, the caller is told
```

- **Every ask gets built.** Nothing sits in a backlog.
- **A change that goes live on its own only changes the caller's company's view.** Other customers never see it, and the shared product stays clean.
- **The vendor's rules pick the ending.** Display changes go live. Anything that touches money, data, access, or every customer goes to the right person, who reviews the finished change instead of a ticket.

**Pitch line:** "Every ask gets built. Your rules decide who has to look before it ships."

**Built on 8090.** Each call becomes an 8090 work order with its ending, reason, customer, and pull request linked. 8090 holds the record; Phone-a-factory adds the phone line, the rules, and the builder.

## 3. Users

| Person | Today | With Phone-a-factory |
|---|---|---|
| **Caller:** a dispatcher or broker at a customer company | Files a ticket and waits. Rarely hears back. | Calls, hears the ask read back, and watches it appear in their own board, or hears who at the vendor is reviewing it. |
| **Approver at the vendor:** security lead, engineering lead, product owner | Reviews tickets and guesses from descriptions. | Reviews only what the rules send them, and sees the finished change. |
| **Buyer:** VP of Engineering or VP of Customer Success at the vendor | Engineers spend time on one-off tweaks. Accounts complain nothing gets done. | Small asks clear themselves without touching the shared product. Customers see results, and the record shows it. |

## 4. Demo company and app

- **Vendor: Relaytrack** (fictional). Sells **Dispatch Board** to freight brokers.
- **Two customers on stage, side by side:** **Mesa Lane Freight** and **Pinecrest Logistics** (both fictional). Each has its own view at `/t/mesa-lane` and `/t/pinecrest`.
- **Dispatch Board** (prepared at kickoff, its own repository, on Vercel, seeded fake data):
  - **Loads table:** load number, lane (origin to destination), pickup time, carrier, equipment (dry van, reefer, flatbed), rate, status, and ETA. About 40 loads per customer.
  - **Live map:** truck dots moving along their lanes on a simple US map.
  - **Exceptions panel:** late loads and detention time.
  - **A simple clock** moves the trucks and ETAs every few seconds, so the board looks alive on the projector.
- **How each customer's view is built:** the board reads `tenants/<customer>/view.json` (columns, labels, filters, sort order, highlight rules) and an optional `tenants/<customer>/overrides.tsx`. A change for one customer only edits that customer's folder.
- **Approvers at Relaytrack:** security lead (who can see what), engineering lead (money, data, and calculations), product owner (changes for every customer, new screens or connections, and anything unclear).

## 5. Rules (fixed in code)

The agent reads the call and pulls out facts. Each fact must quote the caller's words, or it is set to "unknown." Rules then pick the ending. The first rule that matches wins, and the reason shown on screen is that rule.

| # | If the change... | Ending | Approver |
|---|---|---|---|
| R1 | changes who can see what: shippers, carriers, or another customer | Needs a person | Security lead |
| R2 | touches money: rates, margins, detention, charges, or invoices | Needs a person | Engineering lead |
| R6 | changes how physical devices behave: setpoints, defrost, locks, motors (checked after R2) | Needs a person | Safety lead |
| R3 | changes saved data, calculations, or validation | Needs a person | Engineering lead |
| R4 | applies to every customer, adds a new screen or connection (such as EDI or truck tracking), or anything is "unknown" | Needs a person | Product owner |
| R5 | only changes how the caller's own board looks: columns, labels, filters, sorting, colors, highlights, layout | **Goes live** for that customer | None |

**Default:** if no rule matches, the ending is "needs a person." Mistakes push work toward a person, never toward going live.

**Hard limit in the builder:** for a "goes live" change, the agent may only edit files in `tenants/<caller's customer>/`. A change that touches anything else fails the checks and moves to "needs a person." This one limit is what keeps every other customer safe.

## 6. Flow and states

```
received ─▶ classified ─▶ queued ─▶ building ─▶ checking ─┬─▶ live
                                                          ├─▶ waiting_for_approval ─▶ approved ─▶ live
                                                          │                        └─▶ declined
                                                          └─▶ failed ─▶ waiting_for_approval (with the failure as the reason)
```

- **Queue order:** "goes live" asks first, then "needs a person" asks, each oldest first.
- **Up to three builds at a time.** Each build starts from the latest main. Merges happen **one at a time** (a database lock), and each merge makes its own deploy live.
- **Collisions:** if another change reached main first and touched the same file, the merge is refused. The ask goes back to the queue and is built again on top of the newer change.
- **The other-customer check** compares the preview with the deploy of the main commit the build started from, not with live production, so a change that went live meanwhile is not mistaken for a leak.
- **Queued cards say why they wait:** how many builds are ahead and a rough time, from the median build time so far.
- **Undo:** any live change can be rolled back with one click.

## 7. Requirements

P0 = needed on stage. P1 = only if P0 is solid.

### 7.1 Call (voice agent)

- **P0** The ElevenLabs agent "phone-a-factory" answers +1 408 762 6927 and opens with: "This call is recorded."
- **P0** It asks for the caller's name, their company (Mesa Lane Freight or Pinecrest Logistics), and their role, then the ask. It asks at most one follow-up question if the ask is vague.
- **P0** It reads the ask back and asks "Did I get that right?" until the caller says yes.
- **P0** On yes, it calls the server tool `submit_request(name, company, role, ask)` and tells the caller the ending in one sentence: "This changes only your board, so it can go live now. Watch the screen," or "This touches detention charges, so Relaytrack's engineering lead will review it first."
- **P0** It refuses requests to delete data, change the system itself, or ignore its instructions, and never asks for passwords or account numbers.
- **P1** Call the caller back when their change is live.

### 7.2 Classify

- **P0** One model call (Claude through Vercel AI Gateway) returns: the ask in one line, two "done when" lines, the part of the board it affects, and the facts in section 5, each with a quote.
- **P0** A quote that is not in the transcript is rejected and the fact becomes "unknown."
- **P0** Fixed code applies R1 to R5 and stores the rule and the reason.
- **P0** A quick content check rejects abusive or unrelated asks before anything is built.

### 7.3 Build and check

- **P0** Claude Code runs headless in a Vercel Sandbox, started ahead of time from a snapshot of Dispatch Board with dependencies installed.
- **P0** It gets the ask, the two "done when" lines, the caller's customer, and the allowed folders.
- **P0** Checks: the build passes (one retry), only allowed files changed (for "goes live," only that customer's folder), a browser test on the caller's view, a second browser test confirms **the other customer's view did not change**, and a screenshot is taken.
- **P0** Browser test on the caller's view, two paths:
  - **Fast path:** when the change only edits that customer's `view.json`, a fixed script checks that the preview shows exactly the new columns (labels and order), every filter, and the title. No model is involved, and it takes seconds.
  - **Other changes** (map layer, styles, banner, billing): Claude Code writes a short Playwright check for the two "done when" lines, using **Claude Haiku 5.5** for speed.
- **P0** Where a "goes live" change may go: `view.json` (columns, labels, filters, sorting, highlights, hidden panels, title) and `overrides.tsx` slots (the banner above the table, `MapLayer` for anything drawn on the map, and `css` for styling that customer's page only).
- **P0** When the agent cannot make the ask inside those files, it writes one sentence saying why. The ask then goes to the product owner with that sentence as the reason.
- **P0** All checks pass and the ending is "goes live": promote to production, open a pull request, link it in 8090. Any check fails: move to "waiting for approval" with the failure as the reason.
- **P0** "Needs a person": deploy the preview only, then wait for approval.
- **P0** Undo promotes the previous deploy.

### 7.4 Approve

- **P0** The approver sees a review card: the customer, the caller's words, the rule and reason, a before-and-after screenshot, a link to the preview, and Approve and Decline buttons.
- **P0** Approve promotes the preview to production and links the pull request. Decline closes it with the approver's reason.
- **P1** The approver gets a phone call that reads the card and takes "approve" or "decline" by voice.

### 7.5 8090 record

- **P0** Each request creates an 8090 work order (External API) with the labels `goes-live` or `needs-a-person` and the customer's name, the reason as a comment, and the pull request linked when it ships.
- **P0** 8090 write failures never block the demo. The local database is the source for the screen, and 8090 writes retry in the background.
- **P1** Also create an 8090 Feedback item for each call.

### 7.6 Floor screen (one page, projected)

- **P0** **Both customers' boards side by side,** live. A change lands on the caller's side only, and the other side stays the same.
- **P0** Live call transcript.
- **P0** Queue with a card per ask: customer, caller, ask, ending, reason, and status, moving through the states in section 6.
- **P0** The current build's steps as they happen, ending with the "other customer unchanged" check.
- **P0** Review cards for approvers (section 7.4), plus Undo and a Veto button that stops any build.
- **P0** Score bar: calls taken, share that went live on their own, share sent to a person, and median time from call to live.
- **P1** "Asked by more than one customer" panel: when two or more customers get the same change, the product owner can offer it to everyone (R4).

## 8. Tech stack

| Job | Tool | State |
|---|---|---|
| Phone number | Plivo, +1 408 762 6927, inbound trunk to ElevenLabs | Done |
| Voice agent | ElevenLabs Agents, "phone-a-factory" | Created; needs the tool and the new prompt |
| Server, floor screen | Next.js on Vercel | Kickoff |
| Model calls | Classification: Claude Sonnet 5.5 through Vercel AI Gateway. Code edits: Claude Code's default model. Browser checks: Claude Haiku 5.5. | Built |
| Builder | Claude Code in Vercel Sandbox | Kickoff |
| Demo app | Dispatch Board, Next.js, its own GitHub repository, on Vercel | Kickoff |
| Records | 8090 Software Factory (External API) | Keys before kickoff |
| Local data | Postgres from the Vercel Marketplace | Kickoff |
| Live updates to the screen | Server-sent events, or polling every second | Kickoff |

## 9. How the agents split the build

Claude Code and Cursor only. Each workstream runs in its own git worktree, owns its own folders, and never edits another workstream's files. The contract file is the only shared file, and only you change it.

| Workstream | Agent | Owns | Done when |
|---|---|---|---|
| **W0 Contract** (hour 0 to 1) | You with Claude Code | `contract/`: types for `Request`, `Facts`, `Rule`, `Ending`, `Status`, `Customer`; the `view.json` format; database tables; API routes and payloads; events for the screen; environment variable names | All workstreams start from it |
| **W1 Call and rules** | Claude Code | `app/api/voice/`, `lib/classify/`, `lib/rules/`, `lib/factory8090/`, ElevenLabs agent prompt and tool | A real call creates a classified request with the right customer, ending, and 8090 work order |
| **W2 Builder** | Claude Code (second session) | `lib/builder/`, `app/api/build/`, sandbox snapshot script | A queued request becomes a preview with checks (including "other customer unchanged") and screenshots; promote and undo work |
| **W3 Screen and demo app** | Cursor | `app/(floor)/`, the Dispatch Board repository | Dispatch Board runs both customers from `tenants/` with the live map; the floor screen shows both boards, the queue, build steps, review cards, and score |
| **W4 Test calls** (from hour 10) | Claude Code | `tests/calls/` | 30 scripted asks with expected endings, and a runner that scores them |

**Tables (owned by W0):**
- `requests`: id, customer, caller name, role, phone, transcript, ask, done-when lines, facts (with quotes), rule, reason, ending, status, approver, 8090 work order id, preview URL, screenshot URLs, pull request URL, and timestamps for each state.
- `build_steps`: request id, step, status, time, log line.

**Merge order:** W0, then W1 and W3 in parallel, then W2, then W4. You merge each workstream into `main` yourself after its "done when" passes.

## 10. Demo script (3 minutes)

| Time | What happens | What it shows |
|---|---|---|
| 0:00 | "Every software vendor has a backlog of ten-minute customer asks that never get done. Agents can build them now, but every change still waits for a person." | The problem |
| 0:20 | An audience member calls as a dispatcher at Mesa Lane Freight: "Show any load more than 30 minutes late in red, and put those at the top." R5, goes live. The room watches it build. Late loads turn red on **Mesa Lane's board only**. Pinecrest's board, right next to it, does not change. | Speed, and other customers stay safe |
| 1:15 | A Pinecrest caller: "Start charging detention after one hour instead of two." R2, money. The preview is built, and the engineering lead's review card shows the new charges before and after. The presenter approves, and it ships for Pinecrest. | The person reviews the finished change |
| 1:55 | Another caller: "Let our shippers see the carrier rates we pay." R1, security lead. Decline. | It knows what not to ship |
| 2:20 | Score bar from the room's calls. Show the 8090 work orders, each with its customer, ending, reason, and pull request. | Built on 8090, with a record |
| 2:40 | "Every ask gets built. Your rules decide who has to look before it ships." | The pitch |

Other hackers call in during the event as either customer, so both boards change all day and the score bar shows real numbers by demo time.

## 11. Judging criteria

| Criterion | How it is met |
|---|---|
| Technical execution | A live phone line, classification with quotes, fixed rules, a sandboxed builder limited to one customer's folder, a check that other customers did not change, promote and undo, all on one screen. Scored on 30 test calls. |
| Enterprise impact | Turns a vendor's biggest support backlog into shipped changes for each customer, without cluttering the shared product. Approvers see only what touches money, data, or access. Every change has a record in 8090. |
| Creativity | Anyone in the room can call and change a live product. Two customers' boards side by side show a change land on one and not the other. |
| Demo | Three calls, two endings, a live map, under 3 minutes, with backups for each live part. |
| Pitch | One line, one buyer (the vendor's VP of Engineering or Customer Success), a clear first market, and numbers from the room. |

## 12. Risks and backups

| Risk | Backup |
|---|---|
| A serious ask is marked "goes live" | "Unknown" means a person. Only the caller's customer folder may change. The checks fail anything else. Test with 30 calls. |
| A change leaks to the other customer | The "other customer unchanged" check fails it before it ships. |
| The audience tries to break it | Content check, the agent's refusals, the folder limit, and the Veto button. |
| A build is slow or fails | Most "goes live" changes only edit `view.json`, which is fast. The sandbox is started ahead of time. Failures go to a person. A finished run is ready to show. |
| Many calls at once | Up to three builds at once, merges one at a time, and each queued card shows its wait. Check the ElevenLabs limit on simultaneous calls. |
| Phone or venue signal | Test the number today. A second phone on speaker. A recorded backup video. |
| 8090 API errors | The local database drives the screen; 8090 writes retry. |

## 13. Before kickoff (accounts only, no code)

1. Call +1 408 762 6927 from your phone and confirm the agent answers.
2. Check the ElevenLabs plan's limit on simultaneous calls and the minutes left.
3. 8090: create an External API key (copy it yourself, it is shown once).
4. Vercel Pro, AI Gateway credits, and Sandbox access. A GitHub account for the factory's pull requests.
5. Read the hacker agreement on code ownership.

## 14. Not built (for the deck's "next" slide)

- Caller identity (checking the caller really works at the customer)
- More than two customers per product
- Rules written from the vendor's own policy documents
- Merging duplicate asks and settling conflicting ones
- Data and database changes going live on their own
- Calling the caller back, and calling the approver
- Audit and compliance reports beyond the 8090 record
- Connecting to Zendesk, Intercom, or Jira as intake
- Learning from approvals to suggest new rules
- Other markets: field service, lending platforms, clinic billing
- Cost per build and limits

## 15. Open decisions

- **D1.** Voice model: keep the ElevenLabs default (DeepSeek Flash 4.1) for speed, or switch to Claude.

## 16. Done when

A stranger calls the number as one of the two customers, hears their ask read back, and within 3 minutes either sees the change live on their company's board, with the other company's board unchanged, or sees a review card with the finished change waiting for the right approver. Each one shows the rule that decided it, and each one has a work order in 8090.
