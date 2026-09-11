---
description: Generate a developer handoff summary for the next session or PR
---

Provide a structured Handoff Summary for current session: $ARGUMENTS

Include the following sections:
- **Work Completed**: Summary of code added/modified across `core` and `app`.
- **Architectural Notes**: Any new Ports or Adapters introduced.
- **Pending Items / Next Steps**: Tasks remaining from the original plan.
- **Verification Status**: Results of `./gradlew test` or uncommitted file status (`git status`).

Format the response in concise Markdown so it can be pasted into a pull request or issue comment.
