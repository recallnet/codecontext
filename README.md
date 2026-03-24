# codecontext

Structured decision context, embedded where you read code.

---

## The One-Character Bug That Cost $12,000

Someone changed `>` to `>=`. The tests passed. The code review looked fine. The deploy went smoothly.

Three days later, 0.3% of transactions were processing twice. The payment gateway sends messages with timestamps that land exactly on the cutoff boundary during clock-skew windows. The original author knew this. They chose `>` deliberately. But that knowledge lived in a commit message from 8 months ago, buried under 47 subsequent commits.

**The fix took 5 minutes. Finding the reason took 3 days.**

This is the problem codecontext solves.

```typescript
// @context:decision #gate-42 !critical — strict > (not >=): upstream sends
//   at-threshold values during clock skew. >= causes double-processing.
//   See INCIDENT-5678.
if (message.timestamp > cutoff) {
  process(message);
}
```

Now anyone — human or AI agent — sees the constraint *before* they touch the code. And if they change it anyway, the staleness system flags the annotation for review.

## Why Everything Else Falls Short

You already have places to put decisions. They all fail at one thing: **being in front of you at the moment you're about to break something.**

### Commit Logs

Commit logs record *what changed*, not *why the current code looks this way*. After 50 commits touch a function, the original rationale is archaeology. You'd need to `git blame` every line, then `git log` each blame result, then hope the commit message explains the *decision* and not just "fix threshold comparison."

`@context` lives with the code. When the code moves, it moves. When the code changes, it gets flagged.

### External Wikis and Design Docs

External docs are a write-once-read-never graveyard. They live in Confluence or Notion, behind a context switch, maintained by no one. They describe the system as it was designed, not as it exists. Nobody opens a wiki page before changing an `if` statement.

`@context` is in the file you already have open. It shows up in `git diff`. It gets reviewed in PRs. It can't drift because the linter catches it.

### AI Memory and .claude Files

AI memory is the newest entrant and the most dangerous. It's a shadow knowledge base — not version-controlled, not reviewable in PRs, invisible to teammates, impossible to audit. If an AI agent "remembers" why code was written a certain way, that knowledge dies when the context window clears, the memory gets pruned, or a different agent picks up the task.

`@context` is plain text in your repo. Every agent reads it. Every human reviews it. `git log` tracks who wrote it and when.

### The Complement, Not the Replacement

codecontext doesn't replace any of these. It fills the gap between them:

| Tool | What it's for |
|------|--------------|
| **Commit logs** | *What changed* and *when* |
| **Wikis** | *High-level architecture* and *system design* |
| **AI memory** | *Agent workflow preferences* and *user context* |
| **@context** | ***Why this code is the way it is right now*** |

## How It Works

### 1. Annotate decisions in code

```typescript
// @context:decision:tradeoff #cache-strategy !critical — LRU over LFU
//   for O(1) eviction. LFU was 3x slower in benchmarks at our p99 load.
const cache = new LRUCache({ maxSize: 10_000 });
```

```python
# @context:risk:security !high — Rate limiter uses in-memory counter.
#   Resets on deploy. Acceptable because deploy frequency < attack window.
def check_rate_limit(client_id: str) -> bool:
    ...
```

```sql
-- @context:decision:constraint — Foreign keys disabled on this table.
--   Bulk import from legacy system requires it. Re-enabled by migration 047.
CREATE TABLE imports ( ... );
```

```go
// @context:decision:assumption — Retry count of 3 assumes p99 latency < 500ms.
//   If upstream SLA changes, revisit this.
const maxRetries = 3
```

### 2. Query context before editing

```bash
$ npx codecontext --scope src/payments/gateway.ts

  src/payments/gateway.ts — 4 context entries

  CRITICAL  decision #gate-42  (verified 2025-11-15)
    strict > (not >=): upstream sends at-threshold values during clock skew
    doc: docs/context/gate-42.ctx.md

  HIGH  risk:security  (stale — code changed 2026-03-10)
    API key rotation assumes 24h TTL from provider

  decision:assumption  (verified)
    Retry count of 3 assumes p99 latency < 500ms

  LOW  history  (verified)
    Migrated from REST to gRPC in v4.0 for streaming support
```

### 3. Catch invalidated context after editing

```bash
$ npx codecontext --diff HEAD src/payments/gateway.ts

  Lines 42-44 (modified):
    CRITICAL  decision #gate-42  — strict > (not >=)
    STATUS: ANCHORED CODE CHANGED — review required
    Previous anchor hash: a1b2c3d4
    Current anchor hash:  e5f6a7b8
    doc: docs/context/gate-42.ctx.md
```

### 4. Enforce freshness with ESLint

```javascript
// eslint.config.js
import codecontext from "eslint-plugin-codecontext";

export default [codecontext.configs.recommended];
```

The linter catches stale context, unresolved references, invalid types, and complex functions without annotations — before the PR merges.

## The Agent Integration (The Killer Feature)

AI coding agents are powerful but context-blind. They read code, not intent. They see `>` and have no way to know it's load-bearing.

codecontext gives agents a structured briefing system:

```
Agent workflow:
1. npx codecontext --scope <file>     ← "what should I know?"
2. Read the file                       ← "now I'll read the code"
3. Make changes                        ← "informed by context"
4. npx codecontext --diff HEAD <file>  ← "did I break any decisions?"
```

The `--json` flag outputs structured data agents consume directly:

```bash
$ npx codecontext --scope src/payments/gateway.ts --json
```

```json
{
  "file": "src/payments/gateway.ts",
  "entries": [
    {
      "line": 42,
      "type": "decision",
      "id": "gate-42",
      "priority": "critical",
      "status": "verified",
      "summary": "strict > (not >=): upstream sends at-threshold values during clock skew",
      "ctxFile": {
        "body": "## Decision\n\nUse strict greater-than...",
        "verified": "2025-11-15",
        "traces": ["JIRA-1234", "INCIDENT-5678"]
      }
    }
  ]
}
```

A Claude skill is included in `skills/codecontext/` that automates this entire workflow — reading context before edits, checking for invalidation after, and maintaining annotations as code evolves.

### Pre-Commit Hook

```bash
# .husky/pre-commit
npx codecontext --staged
```

Exits non-zero if any staged files have stale context. Catches it before it reaches the branch.

## Future: The Decision Registry

```bash
$ npx codecontext --report

# Decision Registry — my-project
# Generated: 2026-03-24 | 47 entries across 23 files

## Critical Decisions (3)
| ID         | File                      | Summary                        | Status   |
|------------|---------------------------|--------------------------------|----------|
| #gate-42   | payments/gateway.ts:42    | strict > excludes boundary     | verified |
| #auth-flow | auth/session.ts:15        | JWT over session cookies       | stale    |
| #cache-str | data/cache.ts:8           | LRU over LFU for O(1) evict   | verified |

## Stale Context Requiring Review (5)
...

## Assumptions (still valid?) (4)
...
```

A centralized view of every decision, risk, and assumption in the codebase. Generated from code, always current.

## Comment Syntax

```
@context:<type>[:<subtype>] [#id] [!priority] — <summary>
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `decision`, `requirement`, `risk`, `related`, `history`, `doc` |
| `subtype` | No | Narrows the type (e.g., `decision:tradeoff`, `risk:security`) |
| `#id` | No | Links to a `docs/context/<id>.ctx.md` file |
| `!priority` | No | `!critical`, `!high`, or `!low` |
| `summary` | Yes | Human-readable description after the em-dash |

### Type Taxonomy

| Type | Subtypes | Use When |
|------|----------|----------|
| `decision` | `tradeoff`, `constraint`, `assumption` | Code reflects a deliberate choice among alternatives |
| `requirement` | — | Code traces to a product requirement, compliance rule, or external spec |
| `risk` | `perf`, `security`, `compat` | Code carries a known risk future editors should understand |
| `related` | — | Cross-reference to related context elsewhere in the codebase |
| `history` | — | Current form would be surprising without knowing what changed |
| `doc` | — | Points to extended documentation beyond what a normal comment covers |

### Priority Levels

| Priority | Meaning |
|----------|---------|
| `!critical` | Read this before modifying or you **will** break something |
| `!high` | Should read — reduces risk of unintended consequences |
| *(omitted)* | Standard relevance |
| `!low` | Background context, informational |

## Extended Context Files (.ctx.md)

When the decision needs more than a one-liner, create `docs/context/<id>.ctx.md`:

```markdown
---
id: gate-42
type: decision
status: active
verified: 2025-11-15
owners: ["@alice", "@bob"]
traces: ["JIRA-1234", "INCIDENT-5678"]
---

## Decision

Use strict greater-than (`>`) not greater-than-or-equal (`>=`) when
comparing `message.timestamp` against `cutoff`.

## Why

The upstream payment gateway sends messages with timestamps that land
exactly on the cutoff boundary during clock-skew windows (observed in
INCIDENT-5678). Using `>=` caused duplicate processing of ~0.3% of
transactions during peak hours, totaling $12,000 in Q4.

## Alternatives Considered

1. **`>=` with Redis dedup** — Adds a hard dependency on Redis for a
   case that only matters during clock skew. Rejected.
2. **Widen the window by 1ms** — Masks the problem, creates a different
   off-by-one. Rejected.
3. **Fix upstream clock skew** — Gateway team has no plans to fix.
   Not an option.

## Constraints

- Upstream gateway will not fix clock-skew behavior
- SLA requires zero duplicate processing
```

## ESLint Rules

```bash
npm install -D eslint-plugin-codecontext
```

| Rule | Default | Description |
|------|---------|-------------|
| `codecontext/context-hierarchy` | error | Type/subtype combinations must be valid |
| `codecontext/valid-context-refs` | error | `#id` must resolve to an existing `.ctx.md` file |
| `codecontext/require-context-for-complex` | warn | Complex functions (cyclomatic complexity > 5) should have `@context` |
| `codecontext/no-stale-context` | warn | `@context:history` dates older than 90 days trigger a warning |

## Language Support

codecontext is a **language-agnostic specification**. The `@context` tag works inside whatever comment syntax your language supports. The parser already handles all of these:

| Comment Style | Languages |
|--------------|-----------|
| `//` | JavaScript, TypeScript, Go, Rust, C, C++, Java, Kotlin, Swift, C# |
| `#` | Python, Ruby, Shell, YAML, Perl, Elixir |
| `--` | SQL, Lua, Haskell |
| `/* */` | CSS, C, Go, Rust (also block comments in most C-family languages) |
| `<!-- -->` | HTML, XML, SVG |
| `{/* */}` | JSX, TSX |

The TypeScript implementation is the first. The parser and CLI already work on files in any of these languages. Language-specific packages (linter plugins for Ruff, clippy, golangci-lint) are the only per-language pieces — everything else is universal.

See the full [specification](packages/spec/SPEC.md) for adaptation rules and conformance levels.

## Packages

| Package | Description |
|---------|-------------|
| [`codecontext`](packages/cli) | CLI tool — query, scope, diff, stale-check |
| [`@codecontext/parser`](packages/parser) | Core parser for `@context` tags and `.ctx.md` files |
| [`eslint-plugin-codecontext`](packages/eslint-plugin) | ESLint rules for freshness and validity |
| [`@codecontext/spec`](packages/spec) | Language-agnostic specification |

## Quick Start

```bash
# Install
pnpm add -D codecontext eslint-plugin-codecontext

# Add to ESLint
echo 'import codecontext from "eslint-plugin-codecontext";
export default [codecontext.configs.recommended];' > eslint.config.js

# Create context directory
mkdir -p docs/context

# Add your first @context tag to any file, then:
npx codecontext --scope <your-file>
```

## License

MIT
