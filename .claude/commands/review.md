---
description: Review staged or uncommitted code for architectural leaks and issues
---

Review the recent code changes in the repository.

This command is a **dispatcher, not a solo read-through.** The three audit agents are read-only,
so they cannot touch what they review — delegate to them and relay their verdicts.

| Audit | Agent | Required when |
|---|---|---|
| Hexagonal boundaries | **`hexagon-guard`** | always, for any change under `core/` or `app/adapter/` |
| Application security | **`security-reviewer`** | always for a new endpoint, auth path, permission rule, or config change |
| Secrets & credentials | **`secret-sentinel`** | before any PR, push, or handoff |

## 1. Establish the full scope first

`git diff` alone shows only unstaged edits to tracked files. It silently misses staged changes,
new (untracked) files, and commits already on this branch. Cover all three:

```bash
git diff HEAD --stat && git diff HEAD        # staged + unstaged, tracked files
git ls-files --others --exclude-standard     # new, untracked files
git log --oneline main..HEAD                 # commits already made on this branch
```

Give each agent this exact scope — an agent that guesses the scope reviews the wrong thing.

## 2. Run the architecture gate

```bash
./gradlew :app:test --tests '*HexagonalArchitectureTest'
```

## 3. Delegate the audits

Launch the agents in parallel in a single message. For each, name the changed files explicitly
and tell it to review the diff rather than the surrounding untouched code.

## 4. Verify — the checklist the agents feed

1. Are any Spring / JPA (`jakarta.persistence`) / Jackson dependencies leaking into `core`?
2. Does every non-interface class in `app.adapter.out` (excluding `*Entity`) implement a port from
   `core.application.port.out`? (ArchUnit rule 8)
3. Are domain models decoupled from REST DTOs and JPA entities?
4. Is error handling mapped across port boundaries via `GlobalExceptionHandler` / `ProblemDetail`?
5. Do AI adapters carry the correct profile, and do two adapters for the same port have
   non-colliding profiles?
6. Are adequate JUnit 5 tests added for core business logic — using hand-written fakes, since
   Mockito is unavailable in `core`?
7. Can the endpoint/config actually be reached only as intended? Is anything newly public?
8. Is any raw password, hash, token, or secret logged, returned in a body, or committed?

## 5. Report

List required fixes if any violation is found. State which agents ran and what each concluded —
including "no findings", which is a result worth reporting rather than a gap.
