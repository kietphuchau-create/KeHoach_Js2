#!/usr/bin/env python3
"""PreToolUse guard: block a git add/commit that would introduce a credential file.

Reads the hook payload on stdin and either emits a deny decision or nothing at all.
Silence (exit 0, no output) leaves the normal permission flow untouched.

Exit 2 would also block, but the JSON decision carries a reason the user can read.
"""

import json
import os
import re
import shlex
import subprocess
import sys

SENSITIVE_NAME = re.compile(
    r"""(?ix)
    (^|/)\.env($|\.(?!example|sample|template|dist)[a-z0-9._-]+$)
    |\.(pem|p12|jks|keystore|ppk)$
    |(^|/)(keystore|truststore)$
    |(^|/)id_(rsa|dsa|ecdsa|ed25519)$
    |(^|/)credentials\.json$
    """
)

BULK_FLAG = re.compile(r"(?<![\w-])(-A|--all|-u|--update)(?![\w-])")

GIT_ACTION = re.compile(r"\s*git\s+(add|stage|commit)\b(.*)", re.S)


def git(*args):
    try:
        proc = subprocess.run(("git",) + args, capture_output=True, text=True, timeout=10)
    except Exception:
        return []
    return [line for line in proc.stdout.splitlines() if line.strip()]


def has_a_flag(cmd):
    """True for a short-flag cluster containing 'a' (-a, -am, -ma).

    Long flags (--amend) are skipped, as is any argument to -m/--message.
    """
    skip_next = False
    for tok in cmd.split():
        if skip_next:
            skip_next = False
            continue
        if tok in ("-m", "--message"):
            skip_next = True
            continue
        if tok.startswith("--"):
            continue
        if tok.startswith("-") and "a" in tok[1:]:
            return True
    return False


def parse(cmd):
    """(action, explicit_paths, bulk) for a git add/stage/commit command, else None."""
    match = GIT_ACTION.match(cmd)
    if not match:
        return None
    action, rest = match.group(1), match.group(2)

    try:
        toks = shlex.split(rest)
    except ValueError:
        toks = rest.split()

    paths, skip_next = [], False
    for tok in toks:
        if skip_next:
            skip_next = False
            continue
        if tok in ("-m", "--message"):
            skip_next = True
            continue
        if tok.startswith("--message=") or tok.startswith("-"):
            continue
        paths.append(tok)

    bulk = action in ("add", "stage") and (
        not paths
        or BULK_FLAG.search(cmd)
        or any(p in (".", "./") or p.endswith("/") or os.path.isdir(p) for p in paths)
    )
    return action, paths, bulk


def candidates(action, paths, bulk, cmd):
    """Files that could be *added or modified* by the commit this command produces.

    Deletions are filtered out (`--diff-filter=d`): removing a credential file is the
    fix, not the problem, and blocking it would prevent the remediation.
    """
    if action == "commit":
        files = git("diff", "--cached", "--name-only", "--diff-filter=d") + paths
        if has_a_flag(cmd):
            files += git("diff", "--name-only", "--diff-filter=d")
        return files

    if bulk:
        return (
            git("diff", "--cached", "--name-only", "--diff-filter=d")
            + git("diff", "--name-only", "--diff-filter=d")
            + git("ls-files", "--others", "--exclude-standard")
        )
    return paths


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    cmd = (payload.get("tool_input") or {}).get("command") or ""
    if "git" not in cmd:
        return 0

    parsed = parse(cmd)
    if parsed is None:
        return 0

    hits = sorted({f for f in candidates(*parsed, cmd) if SENSITIVE_NAME.search(f.replace("\\", "/"))})
    if not hits:
        return 0

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    "Blocked: this would commit credential file(s): "
                    + ", ".join(hits)
                    + ". Unstage with `git restore --staged <path>`. Secrets belong "
                    "outside the repository, not in it."
                ),
            }
        },
        sys.stdout,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
