# Runtime allowance CI repair · 2026-10-27

Original archive: `17b2ffcbee353defad61cb35d3730b581a425f56`.
Original CI: https://github.com/mikoe133/Or-Ai/actions/runs/40488617494 — failed, API 433/434; the Linux image steps were skipped.

## Reproduction and cause

The existing 100-question / 12-dimension HTTP test copied browser cookies and its CSRF token from the fixture application into a separately configured application. Without `CSRF_SIGNING_KEY`, each call to `loadConfiguration` correctly generates an independent key. The second application therefore returned `CSRF_INVALID` (403) before an attempt was created. A developer's configured key masked the fixture mistake. Neither question count nor write rate limits caused this failure.

RED was compiled and executed twice: once with an explicitly empty signing-key environment variable, then with the normal local environment while explicitly omitting the key in the second application's configuration. Both returned `CSRF_INVALID` on the initial start request. Checkpoint: `99132d2`.

## Minimal repair

Only the test changes. It deliberately uses an independently generated key, asserts the transferred token is rejected with 403 / `CSRF_INVALID` and that no attempt is created, then bootstraps browser authorization from the second application before starting. All 100 answers, the report submission, 12 report dimensions, report retrieval and answer count remain asserted. Server authorization, CSRF verification, migrations and rate limits are unchanged.

## Verification

- TypeScript test target compiled.
- Runtime and redemption integration tests with `CSRF_SIGNING_KEY=''`: 50/50 passed.
- Full `CSRF_SIGNING_KEY='' pnpm test`: API 434/434, web 101/101, MCP 20/20 — 555/555 passed.
- `git diff --check`: passed.
- Disposable test databases were migrated, provisioned and cleaned by the existing fixture lifecycle; the development database was not reset or seeded.

Raw local logs: `.local/ci-runtime-20261027/{red.log,red-with-local-env.log,green-runtime-redemption.log,full-test.log}` (ignored). No UI or production behavior changed, so browser verification is not applicable to this repair. The subsequent hosted CI result is reported separately; local success does not establish hosted CI success.
