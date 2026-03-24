#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)
TTYD_BIN=$(ls /nix/store/*-ttyd-*/bin/ttyd 2>/dev/null | tail -n 1)

if [ -z "$TTYD_BIN" ]; then
  echo "ttyd not found in /nix/store"
  exit 1
fi

export PATH="$(dirname "$TTYD_BIN"):$PATH"

cd "$REPO_ROOT"
pnpm build

for tape in docs/demos/tapes/*.tape; do
  vhs "$tape"
done
