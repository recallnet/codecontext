#!/usr/bin/env bash
# PostToolUse → Read hook: surface @context annotations after file reads.
# Receives JSON on stdin with tool_input.file_path.
# Outputs JSON with systemMessage if annotations found.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ti = data.get('tool_input', {})
print(ti.get('file_path', ti.get('path', '')))
" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Cooldown: skip if we reminded about this file in the last 20 seconds
COOLDOWN_DIR="${TMPDIR:-/tmp}/codecontext-cooldown"
mkdir -p "$COOLDOWN_DIR"
COOLDOWN_KEY=$(echo "$FILE_PATH" | shasum -a 256 | cut -c1-16)
COOLDOWN_FILE="$COOLDOWN_DIR/$COOLDOWN_KEY"

if [ -f "$COOLDOWN_FILE" ]; then
  LAST=$(cat "$COOLDOWN_FILE")
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST))
  if [ "$ELAPSED" -lt 20 ]; then
    exit 0
  fi
fi

# Run codecontext --scope with JSON output
SCOPE_OUTPUT=$(npx codecontext --scope "$FILE_PATH" --json 2>/dev/null) || exit 0

# Check if there are any tags
TAG_COUNT=$(echo "$SCOPE_OUTPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
entries = data.get('entries', [])
print(len(entries))
" 2>/dev/null) || exit 0

if [ "$TAG_COUNT" = "0" ] || [ -z "$TAG_COUNT" ]; then
  exit 0
fi

# Record cooldown
date +%s > "$COOLDOWN_FILE"

# Format the reminder using the JSON output
MESSAGE=$(echo "$SCOPE_OUTPUT" | python3 -c "
import sys, json

data = json.load(sys.stdin)
entries = data.get('entries', [])
file_path = data.get('file', 'unknown')

# Group by priority
critical = []
high = []
rest = []

for e in entries:
    tag = e.get('tag', {})
    p = tag.get('priority', '')
    if p == 'critical':
        critical.append(tag)
    elif p == 'high':
        high.append(tag)
    else:
        rest.append(tag)

def fmt(tag):
    t = tag.get('type', '')
    sub = tag.get('subtype', '')
    label = f'{t}:{sub}' if sub else t
    pri = f\" !{tag['priority']}\" if tag.get('priority') else ''
    ref = f\" {{@link {tag['id']}}}\" if tag.get('id') else ''
    line = tag.get('location', {}).get('line', '?')
    summary = tag.get('summary', '')
    return f'L{line}  @context {label}{pri}{ref} — {summary}'

lines = [f'{len(entries)} @context annotation(s) in {file_path}', '']

# Skill ref detection
skill_warnings = []
for e in entries:
    tag = e.get('tag', {})
    ref = tag.get('id', '')
    if '.claude/skills/' in ref and ref.endswith('SKILL.md'):
        import re
        m = re.search(r'\.claude/skills/([^/]+)/SKILL\.md', ref)
        if m:
            line = tag.get('location', {}).get('line', '?')
            skill_warnings.append(f'Load /{m.group(1)} before editing the block at L{line}')

if skill_warnings:
    lines.append('── SKILL REQUIRED ──')
    lines.extend(skill_warnings)
    lines.append('')

if critical:
    lines.append('── MUST-READ (critical) ──')
    lines.extend(fmt(t) for t in critical[:6])
    lines.append('')
if high:
    lines.append('── WARNING (high) ──')
    lines.extend(fmt(t) for t in high[:6])
    lines.append('')
if rest:
    lines.append('── INFO ──')
    lines.extend(fmt(t) for t in rest[:6])
    lines.append('')

total_shown = min(len(critical), 6) + min(len(high), 6) + min(len(rest), 6)
omitted = len(entries) - total_shown
if omitted > 0:
    lines.append(f'...and {omitted} more annotation(s).')
    lines.append('')

lines.append('Review annotation intent and follow any {@link} refs before editing.')

print('\n'.join(lines))
" 2>/dev/null) || exit 0

if [ -z "$MESSAGE" ]; then
  exit 0
fi

# Output JSON with systemMessage
python3 -c "
import json, sys
msg = sys.stdin.read()
print(json.dumps({'systemMessage': msg}))
" <<< "$MESSAGE"
