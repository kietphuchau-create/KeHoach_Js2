#!/usr/bin/env python3
"""PreToolUse guard: keep framework imports out of the `core` module.

`core` is the pure domain + application module. ArchUnit enforces this after the fact
(HexagonalArchitectureTest rules 1-3); this catches it before the ~2 minute build.

The forbidden set is exactly what ArchUnit enforces — no stricter. `jakarta.validation`
is deliberately absent: ArchUnit permits it in `core`, so blocking it here would reject
code the build accepts.
"""

import json
import re
import sys

# Anchored to core/src so test sources are covered too; app/ is never inspected.
CORE_PATH = re.compile(r"(^|/)core/src/")

FORBIDDEN = re.compile(
    r"""(?x)
    org\.springframework
  | jakarta\.persistence | javax\.persistence | org\.hibernate
  | jakarta\.servlet      | javax\.servlet
  | io\.jsonwebtoken
  | com\.fasterxml\.jackson
    """
)


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    path = (tool_input.get("file_path") or "").replace("\\", "/")

    if not CORE_PATH.search(path):
        return 0

    # Write carries `content`; Edit carries `new_string`. Check both, plus the
    # file_path itself so a Write whose content is empty is still evaluated.
    blob = "\n".join(
        str(tool_input.get(key, "")) for key in ("content", "new_string", "old_string")
    )

    hits = sorted({m.group(0) for m in FORBIDDEN.finditer(blob)})
    if not hits:
        return 0

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    "Blocked: "
                    + ", ".join(hits)
                    + " cannot appear in the `core` module. `core` is pure Java 21 with no "
                    "Spring, JPA, servlet or Jackson on its classpath. Introduce a port in "
                    "`core.application.port.out` and implement the adapter under "
                    "`app.adapter.out`, or move this code to `app`."
                ),
            }
        },
        sys.stdout,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
