---
description: Run build/tests, diagnose failures, and automatically fix errors
---

## Step 1 — hand the failure to `build-doctor` first

Do **not** start by reading the Gradle log yourself. Delegate it: `build-doctor` isolates the
failing module (which `:core:` and `:app:` fail for quite different reasons) and reports the
smallest correct fix. Run the build to produce the log it needs:

```bash
./gradlew build
```

(Not `clean` — it forces a full recompile for no benefit here.)

If `build-doctor` reports that the failure is an architectural leak rather than a compile error,
bring in **`hexagon-guard`** before changing anything — a `core` compile error caused by a
forbidden import means a port is missing, not that a dependency should be added.

## Step 2 — apply the fix

Reproduce in isolation before editing: `./gradlew :core:test --tests '*ClassName*'` (or `:app:`).
Then apply the smallest correct fix.

If the fix changes anything under `core/` or `app/adapter/`, **`hexagon-guard`** must re-audit
before you call it done.

## Guardrails — do not do these to go green

- **Never weaken or delete an `HexagonalArchitectureTest` rule.** It encodes the architecture; if
  it fails, the production code is wrong.
- **Never delete, `@Disabled`, or `@Ignore` a failing test.** If the asserted behavior genuinely
  changed, update the assertion and say so explicitly.
- **Never add Spring / JPA / Jackson to `core/build.gradle`** to fix a `core` compile error.
  Introduce a port in `core` and implement the adapter in `app`.
- A skipped Testcontainers test is not a failure — they are `disabledWithoutDocker`.

Re-run `./gradlew build` to confirm. If it still fails, report that plainly rather than claiming
success. Name the agents you consulted and what they found.
