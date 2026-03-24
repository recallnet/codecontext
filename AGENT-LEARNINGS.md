# Agent Learnings

Cross-cutting insights from AI agent sessions. These are learnings that
don't belong in a specific doc but help future agents work smarter.

Atlas indexes this file nightly for semantic search across the team.

Each entry includes a directive: a concrete "Do X, not Y" instruction.
Entries marked `hypothesis` have not been independently verified.
Entries tagged `meta` are cross-cutting (not repo-specific) and surfaced team-wide.

---

<!-- Entries below, newest first -->

### 2026-03-24 — Polyglot QA must be wired outside Turbo (confirmed)

Author: Hatch
Insight: Adding a standalone Go module to a Node/Turbo monorepo does not
inherit pre-commit, pre-push, or CI protection unless those gates call Go
tooling explicitly.

Detail: The new Go analyzer package lived outside the pnpm workspace and was
completely invisible to the existing `turbo build`, `turbo test`, lint-staged,
and CI jobs. Without explicit `gofmt`, `go test`, and Go module hygiene
checks, the repo could claim Go support while shipping broken or unformatted
Go code.

Directive: Add explicit Go QA scripts and hook/CI stages for every standalone
language module; do not assume the Node task graph covers them.
Action: Keep dedicated Go gates in `.husky/pre-commit`, `.husky/pre-push`,
and `.github/workflows/ci.yml`. Mirror this pattern for any future non-Node
package added to the repo.
Context: main branch, adding TSDoc-safe syntax, Go analyzer support, examples,
and repo QA gates
