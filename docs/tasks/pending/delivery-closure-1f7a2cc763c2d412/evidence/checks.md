# checks

Representation: excerpt; original SHA256: f4c7d7dd218cf3d784b5c5a84faad4051899a1c1762628bafe7e440a86314cb4.

```text
Final pnpm check exited 0. The source log is bound to this candidate by the recorded original SHA256.
$ pnpm format:check && pnpm typecheck && pnpm lint && pnpm guard && pnpm test && pnpm build && pnpm test:smoke
$ tsc --noEmit
$ node scripts/harness/check-guardrails.ts
 Test Files  6 passed (6)
      Tests  121 passed (121)
$ tsc -p tsconfig.build.json
$ node scripts/service/smoke.ts
PASS: packed plugin, official DSH profile, isolated home, API authentication, shutdown and port release.
Scope: installed dependencies reused; no real model, browser, business persistence or production deployment.
```
