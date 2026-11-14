# Build log

## 2026-11-13

- W1 merged. Branch `w1-call-rules` is on `main` at `b13707e`. Type-check and build passed in the W1 folder before the merge, and type-check passed on `main` after it. No contract change.
- W4 merged. Branch `w4-test-calls` is on `main` at `a59579a`. The runner scored 30 of 30 on local dev after the classifier prompt fix in `2d4545c`. The first run was 28 of 30. A notes column for every customer, and an EDI connection, came back as R3. The prompt now keeps those on R4. Production `POST /api/requests/test` answers that the route is off, so those responses were not scored as misses. No remaining misses.
