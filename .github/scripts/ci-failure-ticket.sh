#!/usr/bin/env bash
set -euo pipefail

JOB_NAME="$1"
RUN_ID="$2"
BRANCH="${GITHUB_REF_NAME}"
SHA="${GITHUB_SHA}"
ACTOR="${GITHUB_ACTOR}"
RUN_URL="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${RUN_ID}"

TITLE="CI: ${JOB_NAME} failed on ${BRANCH}"

LOGS=$(gh run view "$RUN_ID" --log-failed 2>/dev/null | tail -80 || true)
if [ -z "$LOGS" ]; then
  LOGS="Logs unavailable"
fi

EXISTING=$(gh issue list --label bug --state open \
  --search "\"${JOB_NAME} failed on ${BRANCH}\"" \
  --json number --jq '.[0].number // empty' 2>/dev/null || echo "")

BODY="## CI: \`${JOB_NAME}\` failed

**Branch:** \`${BRANCH}\`
**Commit:** \`${SHA}\` by @${ACTOR}
**Run:** ${RUN_URL}

### Logs
\`\`\`
${LOGS}
\`\`\`"

if [ -n "$EXISTING" ]; then
  gh issue comment "$EXISTING" --body "$BODY" || true
else
  gh issue create --title "$TITLE" --label "bug" --body "$BODY" || true
fi
