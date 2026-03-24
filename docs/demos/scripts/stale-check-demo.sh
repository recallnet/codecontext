#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)
TMP_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/codecontext-vhs.XXXXXX")
WORKTREE="$TMP_ROOT/worktree"

cleanup() {
  git -C "$REPO_ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  rm -rf "$TMP_ROOT"
}

trap cleanup EXIT INT TERM

git -C "$REPO_ROOT" worktree add --detach "$WORKTREE" HEAD >/dev/null 2>&1
cd "$WORKTREE"

REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
import { writeFileSync } from "node:fs";

const parser = await import(`${process.env.REPO_ROOT}/packages/parser/dist/index.js`);
const { buildFileContext, createEmptyCache, updateCache } = parser;

const target = "examples/ts/payments/gateway.ts";
const ctx = buildFileContext(target, { cache: createEmptyCache() });
const cache = updateCache(createEmptyCache(), ctx.anchored);
writeFileSync(".codecontext-cache.json", JSON.stringify(cache, null, 2));
NODE

perl -0pi -e 's/return messageTimestamp > cutoff;/return messageTimestamp >= cutoff;/' \
  examples/ts/payments/gateway.ts

git add -f .codecontext-cache.json
git add examples/ts/payments/gateway.ts
REPO_ROOT="$REPO_ROOT" node --input-type=module <<'NODE'
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const parser = await import(`${process.env.REPO_ROOT}/packages/parser/dist/index.js`);
const { buildFileContext, loadCache } = parser;

const target = "examples/ts/payments/gateway.ts";
const ctx = buildFileContext(target, { cache: loadCache(process.cwd()) });
const stale = ctx.anchored.filter((entry) => entry.status === "stale");

console.log(`${BOLD}${CYAN}${process.cwd()}/${target}${RESET}`);
console.log(`${DIM}${ctx.tags.length} context entries | ${RED}${stale.length} stale${RESET}${DIM}${RESET}`);
console.log("");

for (const entry of stale) {
  const tag = entry.tag;
  console.log(`  ${RED}${BOLD}@context(${tag.type}${tag.subtype ? `:${tag.subtype}` : ""})${RESET}  ${DIM}(${RED}${BOLD}STALE${RESET}${DIM})${RESET}`);
  console.log(`    ${tag.summary}`);
  console.log(`    ${DIM}at line ${tag.location.line}${tag.id ? ` | ref: #${tag.id}` : ""}${tag.verified ? ` | verified: ${tag.verified}` : ""}${RESET}`);
  console.log(`    ${YELLOW}anchored code changed without a verification date bump${RESET}`);
  console.log("");
}

if (stale.length > 0) {
  console.log(`${RED}${BOLD}Pre-commit check failed:${RESET} ${RED}${stale.length} stale${RESET} context entries found.`);
  console.log(`${YELLOW}Review and update these context annotations before committing.${RESET}`);
}
NODE
