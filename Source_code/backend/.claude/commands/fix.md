---
description: Run build/tests, diagnose failures, and automatically fix errors
---

Run build and tests to diagnose issues:

```bash
./gradlew clean test
```

If any compilation or test errors are reported:
1. Inspect the stack trace and failing files.
2. Ensure fixes do not introduce framework dependencies into `core`.
3. Apply the necessary code edits to fix the failing tests or build issues.
4. Re-run `./gradlew test` to confirm all tests pass successfully.
