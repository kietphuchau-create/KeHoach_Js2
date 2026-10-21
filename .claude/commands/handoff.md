---
description: Generate a developer handoff summary for the next session or PR
---

Provide a structured Handoff Summary for current session: $ARGUMENTS

Start with the branch and PR target (`git branch --show-current`; PRs target `main`).

## Before writing the summary — run the gates

A handoff is a claim that the work is in a known state, so gather the evidence first. Delegate
rather than assert:

| Gate                                       | Who                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| Secrets not about to be committed          | **`secret-sentinel`** (read-only) — mandatory before a PR or push               |
| Hexagonal boundaries intact                | **`hexagon-guard`** — if anything under `core/` or `app/adapter/` changed       |
| Endpoint / auth / config changes are sound | **`security-reviewer`** — if an endpoint, auth path, or permission rule changed |
| Build                                      | `./gradlew build`; a red build goes to **`build-doctor`**                       |

## Include the following sections

- **Work Completed**: Summary of code added/modified across `core` and `app`.
- **Architectural Notes**: Any new Ports or Adapters introduced, and which AI profile(s) the
  change applies to. Note any boundary decision that a future reader would otherwise second-guess.
- **Verification Status**: The result of `./gradlew build` (the correctness gate), which audits
  ran and what each concluded, and `git status` for uncommitted work. Say explicitly if a
  Testcontainers test was skipped for lack of Docker, or if any gate did not run.
- **Known Limitations / Accepted Risks**: Anything deliberately left out of scope, with the
  residual risk stated. Do not let an accepted risk read as an oversight.
- **Pending Items / Next Steps**: Tasks remaining from the original plan.

Format the response in concise Markdown so it can be pasted into a pull request or issue comment.
