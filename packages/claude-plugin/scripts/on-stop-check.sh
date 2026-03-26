#!/usr/bin/env bash
# Stop hook: check for stale @context annotations in staged/modified files.
# Advisory — surfaces a warning if stale context is detected.

set -euo pipefail

# Check if there are any staged or modified files
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || true)
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)
ALL_FILES=$(echo -e "$CHANGED_FILES\n$STAGED_FILES" | sort -u | grep -v '^$' || true)

if [ -z "$ALL_FILES" ]; then
  exit 0
fi

# Run codecontext --staged to check for staleness (only if there are staged files)
if [ -n "$STAGED_FILES" ]; then
  STALE_OUTPUT=$(npx codecontext --staged 2>&1) || {
    # Exit code non-zero means stale entries found
    MESSAGE="@context staleness detected in staged files. Run /context-staged to review before committing."
    python3 -c "
import json, sys
msg = sys.stdin.read()
print(json.dumps({'systemMessage': msg}))
" <<< "$MESSAGE"
    exit 0
  }
fi

exit 0
