#!/usr/bin/env bash
# PreToolUse → Edit|Write hook: warn when editing files with !critical @context.
# Advisory only — always exits 0.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ti = data.get('tool_input', {})
print(ti.get('file_path', ''))
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Cooldown: skip if we warned about this file in the last 60 seconds
COOLDOWN_DIR="${TMPDIR:-/tmp}/codecontext-edit-guard"
mkdir -p "$COOLDOWN_DIR"
COOLDOWN_KEY=$(echo "$FILE_PATH" | shasum -a 256 | cut -c1-16)
COOLDOWN_FILE="$COOLDOWN_DIR/$COOLDOWN_KEY"

if [ -f "$COOLDOWN_FILE" ]; then
  LAST=$(cat "$COOLDOWN_FILE")
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST))
  if [ "$ELAPSED" -lt 60 ]; then
    exit 0
  fi
fi

# Check for critical annotations only
SCOPE_OUTPUT=$(npx codecontext --scope "$FILE_PATH" --json 2>/dev/null) || exit 0

HAS_CRITICAL=$(echo "$SCOPE_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
entries = data.get('entries', [])
critical = [e for e in entries if e.get('tag', {}).get('priority') == 'critical']
print(len(critical))
" 2>/dev/null) || exit 0

if [ "$HAS_CRITICAL" = "0" ] || [ -z "$HAS_CRITICAL" ]; then
  exit 0
fi

# Record cooldown
date +%s > "$COOLDOWN_FILE"

# Format warning
MESSAGE=$(echo "$SCOPE_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
entries = data.get('entries', [])
critical = [e for e in entries if e.get('tag', {}).get('priority') == 'critical']
file_path = data.get('file', 'unknown')

lines = [f'This file has {len(critical)} critical @context constraint(s). Review before editing:', '']
for e in critical:
    tag = e.get('tag', {})
    t = tag.get('type', '')
    sub = tag.get('subtype', '')
    label = f'{t}:{sub}' if sub else t
    line = tag.get('location', {}).get('line', '?')
    summary = tag.get('summary', '')
    ref = f\" {{@link {tag['id']}}}\" if tag.get('id') else ''
    lines.append(f'L{line}  @context {label} !critical{ref} — {summary}')

print('\n'.join(lines))
" 2>/dev/null) || exit 0

if [ -z "$MESSAGE" ]; then
  exit 0
fi

python3 -c "
import json, sys
msg = sys.stdin.read()
print(json.dumps({'systemMessage': msg}))
" <<< "$MESSAGE"
