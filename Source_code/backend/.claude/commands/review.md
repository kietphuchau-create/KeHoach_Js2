---
description: Review staged or uncommitted code for architectural leaks and issues
---

Review the recent code changes in the repository.

Analyze the uncommitted changes:

```bash
git diff --stat && git diff
```

Verify the following items:
1. Are there any Spring/JPA/Jackson dependencies leaking into `core`?
2. Are domain models decoupled from REST DTOs and JPA Entities?
3. Is error handling properly mapped across Port boundaries?
4. Are adequate JUnit 5 tests added for core business logic?

Provide constructive criticism and list required fixes if any violations are found.
