# Agent Learnings

Cross-cutting insights from AI agent sessions. These are learnings that
don't belong in a specific doc but help future agents work smarter.

Atlas indexes this file nightly for semantic search across the team.

Each entry includes a directive: a concrete "Do X, not Y" instruction.
Entries marked `hypothesis` have not been independently verified.
Entries tagged `meta` are cross-cutting (not repo-specific) and surfaced team-wide.

---

<!-- Entries below, newest first -->

### 2026-03-24 — Freshness gates need first-class verified dates (confirmed)

Author: Hatch
Insight: If freshness depends on a date, that date must be parsed as
structured metadata and tied to the block-hash cache; scraping dates from
free-form summaries produces inconsistent gates and cannot reliably detect
"code changed but verification was not renewed."

Detail: The repo had two competing ideas of staleness: hash-based code-change
detection in the parser/CLI and a separate ESLint rule that scraped dates
from `history` summaries. That split could not enforce the desired workflow
of "you changed the code, so bump the verification date or delete the stale
context." The fix was to add explicit `[verified:YYYY-MM-DD]` syntax on tags,
flow that field through the shared parser/types, fall back to `.ctx.md`
frontmatter `verified:` when present, and compare both hash and date in the
same staleness engine.

Directive: Model verification dates as first-class parsed fields, not prose.
Use one shared staleness engine for CLI, lint, and future language bindings.
Action: Keep `[verified:YYYY-MM-DD]` in the core grammar, preserve the shared
conformance fixtures for verified-date cases, and avoid adding tooling that
re-parses dates from summaries.
Context: main branch, adding verified-date freshness modes, conformance
fixtures, and staged-cache enforcement

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
