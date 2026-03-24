# codecontext

Decision context, attached to code where it matters.

---

## The One-Character Bug That Cost $12,000

Someone changed `>` to `>=`. Tests were green. Review was green. Deploy was green.

Three days later, 0.3% of transactions started processing twice. The payment gateway sometimes emits timestamps exactly on the cutoff boundary during clock-skew windows. The original author knew that. `>` was not an accident. But the reason was trapped in an 8-month-old commit message buried under 47 more commits.

**The code fix took 5 minutes. Recovering the reason took 3 days.**

That is the problem codecontext solves.

```typescript
// @context decision #docs/context/gate-42.md !critical [verified:2026-03-24] — strict > (not >=): upstream sends
//   at-threshold values during clock skew. >= causes double-processing.
//   See INCIDENT-5678.
if (message.timestamp > cutoff) {
  process(message);
}
```

Now the constraint is visible before anyone edits the code, human or agent. If someone changes the code without re-verifying the attached context, the freshness gate fails.

## Why Everything Else Falls Short

You already have places to store decisions. They mostly fail at one job: **showing up at the exact moment someone is about to break the code.**

### Commit Logs

Commit logs are good at _what changed_. They are weak at _why this code looks the way it does right now_. After 50 commits touch a function, the original rationale becomes archaeology. You end up doing `git blame`, then `git log`, then hoping the relevant commit message contains a design constraint instead of "fix threshold comparison."

`@context` lives next to the code. When the code moves, it moves. When the code changes, tooling can flag it.

### External Wikis and Design Docs

External docs tend to drift toward write-once-read-never. They live behind a context switch, are maintained inconsistently, and usually describe the system as designed rather than the system as it exists. Almost nobody opens a wiki page before changing an `if` statement.

`@context` is already in the file you are editing. It shows up in `git diff`. It gets reviewed in PRs. Tooling can validate it.

### AI Memory and .claude Files

AI memory is the newest option and probably the most brittle. It is a shadow knowledge base: not version-controlled, not reviewable in PRs, invisible to teammates, and hard to audit. If an agent "remembers" why code was written a certain way, that memory disappears when the context window resets, the memory is pruned, or a different agent takes over.

`@context` is just text in the repo. Humans can read it. Agents can read it. Review sees it. `git log` records who changed it and when.

### The Complement, Not the Replacement

codecontext does not replace these tools. It fills the gap between them:

| Tool            | What it's for                                   |
| --------------- | ----------------------------------------------- |
| **Commit logs** | _What changed_ and _when_                       |
| **Wikis**       | _High-level architecture_ and _system design_   |
| **AI memory**   | _Agent workflow preferences_ and _user context_ |
| **@context**    | **_Why this code is the way it is right now_**  |

## How It Works

### 1. Annotate decisions in code

```typescript
// @context decision:tradeoff #docs/context/cache-strategy.md !critical [verified:2026-03-24] — LRU over LFU
//   for O(1) eviction. LFU was 3x slower in benchmarks at our p99 load.
const cache = new LRUCache({ maxSize: 10_000 });
```

```python
# @context risk:security !high [verified:2026-03-24] — Rate limiter uses in-memory counter.
#   Resets on deploy. Acceptable because deploy frequency < attack window.
def check_rate_limit(client_id: str) -> bool:
    ...
```

```sql
-- @context decision:constraint [verified:2026-03-24] — Foreign keys disabled on this table.
--   Bulk import from legacy system requires it. Re-enabled by migration 047.
CREATE TABLE imports ( ... );
```

```go
// @context decision:assumption [verified:2026-03-24] — Retry count of 3 assumes p99 latency < 500ms.
//   If upstream SLA changes, revisit this.
const maxRetries = 3
```

### 2. Query context before editing

```bash
$ npx codecontext --scope src/payments/gateway.ts

  src/payments/gateway.ts — 4 context entries

    CRITICAL  decision #docs/context/gate-42.md  (verified 2025-11-15)
    strict > (not >=): upstream sends at-threshold values during clock skew
    doc: docs/context/gate-42.md

  HIGH  risk:security  (STALE)
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
    CRITICAL  decision #docs/context/gate-42.md  — strict > (not >=)
    STATUS: ANCHORED CODE CHANGED — review required
    Previous anchor hash: a1b2c3d4
    Current anchor hash:  e5f6a7b8
    doc: docs/context/gate-42.md
```

### 4. Enforce freshness with ESLint

```javascript
// eslint.config.js
import codecontext from "@recallnet/codecontext-eslint-plugin";

export default [codecontext.configs.recommended];
```

The linter and staged-file gate catch unresolved references, invalid types, expired verification dates, and code changes where the verification date was not advanced.

Examples live in [`examples/`](examples/) and include both TypeScript and Go source with different context variations.

## Terminal Demos

These demos are generated from source-controlled VHS tapes in [`docs/demos/tapes/`](docs/demos/tapes/) and can be re-rendered with `pnpm demo:render`.

### Scope briefing

![Scope briefing demo](docs/demos/gifs/scope.gif)

### Decision registry

![Decision registry demo](docs/demos/gifs/report.gif)

### Freshness gate after a code change

![Freshness gate demo](docs/demos/gifs/stale-check.gif)

## The Agent Integration (The Killer Feature)

Coding agents are powerful but context-poor. They read code, but not the decision chain that made the code look this way. They see `>` and have no native way to know it is load-bearing.

codecontext gives them a simple briefing loop:

```
Agent workflow:
1. npx codecontext --scope <file>     ← "what should I know?"
2. Read the file                       ← "now I'll read the code"
3. Make changes                        ← "informed by context"
4. npx codecontext --diff HEAD <file>  ← "did I break any decisions?"
```

The `--json` flag produces structured output that agents and tools can consume directly:

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
      "id": "docs/context/gate-42.md",
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

A Claude skill is included in `skills/codecontext/` to automate this workflow: read context before edits, check invalidation after edits, and maintain annotations as code evolves.

### Pre-Commit Hook

```bash
# .husky/pre-commit
npx codecontext --staged
```

This exits non-zero if annotated code changed without advancing its verification date, or if a verification date exceeded the max-age threshold.

## The Decision Registry

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

This gives you a centralized view of decisions, risks, and assumptions across the codebase. It is generated from code, so it stays aligned with the repository instead of drifting into a separate registry.

## Comment Syntax

```
@context <type>[:<subtype>] [#ref] [!priority] [verified:YYYY-MM-DD] — <summary>
```

| Field       | Required | Description                                                    |
| ----------- | -------- | -------------------------------------------------------------- |
| `type`      | Yes      | `decision`, `requirement`, `risk`, `related`, `history`, `doc` |
| `subtype`   | No       | Narrows the type (e.g., `decision:tradeoff`, `risk:security`)  |
| `#ref`      | No       | Project-relative reference to supporting docs or code          |
| `!priority` | No       | `!critical`, `!high`, or `!low`                                |
| `verified`  | No       | Explicit verification date used by freshness checks            |
| `summary`   | Yes      | Human-readable description after the em-dash                   |

### Type Taxonomy

| Type          | Subtypes                               | Use When                                                                |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `decision`    | `tradeoff`, `constraint`, `assumption` | Code reflects a deliberate choice among alternatives                    |
| `requirement` | —                                      | Code traces to a product requirement, compliance rule, or external spec |
| `risk`        | `perf`, `security`, `compat`           | Code carries a known risk future editors should understand              |
| `related`     | —                                      | Cross-reference to related context elsewhere in the codebase            |
| `history`     | —                                      | Current form would be surprising without knowing what changed           |
| `doc`         | —                                      | Points to extended documentation beyond what a normal comment covers    |

### Priority Levels

| Priority    | Meaning                                                    |
| ----------- | ---------------------------------------------------------- |
| `!critical` | Read this before modifying or you **will** break something |
| `!high`     | Should read — reduces risk of unintended consequences      |
| _(omitted)_ | Standard relevance                                         |
| `!low`      | Background context, informational                          |

The canonical form is `@context <type>...`, which is valid TSDoc. The legacy `@context:<type>...` form is still parsed for backwards compatibility, but new annotations should use the canonical form.

Freshness has two modes:

1. `max age`: a tag or `.ctx.md` `verified` date older than the configured threshold requires review.
2. `not older than code`: if the anchored code changes and the verification date did not advance, the staged check fails and tells the developer to either bump the date or delete the stale context.

## Extended Docs

`#ref` can point to any project-relative file that helps explain the decision:

```typescript
// @context decision #docs/context/gate-42.md !critical — Boundary timestamps must be excluded
// @context related #src/payments/gateway.ts — Matching implementation lives here
```

If you want a structured long-form document, `.ctx.md` is still supported, but optional rather than required.

## Structured Context Files (.ctx.md)

When a decision needs more than a one-liner and you want frontmatter plus predictable sections, use a `.ctx.md` file:

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
npm install -D @recallnet/codecontext-eslint-plugin
```

| Rule                                      | Default | Description                                                                  |
| ----------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `codecontext/context-hierarchy`           | error   | Type/subtype combinations must be valid                                      |
| `codecontext/valid-context-refs`          | error   | `#ref` must resolve to an existing local file                                |
| `codecontext/require-context-for-complex` | warn    | Complex functions (cyclomatic complexity > 5) should have `@context`         |
| `codecontext/no-stale-context`            | error   | Explicit verification dates are too old, or code changed without a date bump |

## Language Support

codecontext is a **language-agnostic specification**. The `@context` tag works inside whatever comment syntax your language supports. The parser already handles all of the following:

| Comment Style | Languages                                                         |
| ------------- | ----------------------------------------------------------------- |
| `//`          | JavaScript, TypeScript, Go, Rust, C, C++, Java, Kotlin, Swift, C# |
| `#`           | Python, Ruby, Shell, YAML, Perl, Elixir                           |
| `--`          | SQL, Lua, Haskell                                                 |
| `/* */`       | CSS, C, Go, Rust (also block comments in most C-family languages) |
| `<!-- -->`    | HTML, XML, SVG                                                    |
| `{/* */}`     | JSX, TSX                                                          |

The TypeScript implementation landed first. The parser and CLI already work on files in any of these languages. Language-specific packages provide native linting integrations where that matters. Go support is available through the `go/analysis` package in `packages/golangci-lint`.

See the full [specification](packages/spec/SPEC.md) for adaptation rules and conformance levels.

## Packages

| Package                                                          | Description                                         |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| [`@recallnet/codecontext-cli`](packages/cli)                     | CLI tool — query, scope, diff, stale-check          |
| [`@recallnet/codecontext-parser`](packages/parser)               | Core parser for `@context` tags and structured docs |
| [`@recallnet/codecontext-eslint-plugin`](packages/eslint-plugin) | ESLint rules for freshness and validity             |
| [`packages/golangci-lint`](packages/golangci-lint)               | Go analyzer and `golangci-lint` plugin entrypoint   |
| [`@recallnet/codecontext-spec`](packages/spec)                   | Language-agnostic specification                     |
| [`@recallnet/codecontext-tsdoc`](packages/tsdoc)                 | TSDoc extension for the `@context` block tag        |

## Quick Start

### 1. Configure the GitHub Packages registry

Packages are published to GitHub Packages under the `@recallnet` scope. Add this to your project's `.npmrc`:

```ini
@recallnet:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

You will need a GitHub personal access token with `read:packages` scope. Set it as `GITHUB_TOKEN`, or use `npm login --registry=https://npm.pkg.github.com`.

### 2. Install

```bash
pnpm add -D @recallnet/codecontext-cli @recallnet/codecontext-parser
# Optional: ESLint plugin for freshness enforcement
pnpm add -D @recallnet/codecontext-eslint-plugin
# Optional: TSDoc extension if you use eslint-plugin-tsdoc / API Extractor
pnpm add -D @recallnet/codecontext-tsdoc
```

### 3. Configure ESLint (optional)

```javascript
// eslint.config.js
import codecontext from "@recallnet/codecontext-eslint-plugin";

export default [
  codecontext.configs.recommended,
  // ... your other config
];
```

### 4. Create context directory

```bash
mkdir -p docs/context
```

### 5. Configure TSDoc (optional)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json",
  "extends": ["@recallnet/codecontext-tsdoc/tsdoc-base.json"]
}
```

### 6. Add your first `@context` tag

```typescript
// @context decision !high — chose approach A over B because of X
```

### 7. Run the CLI

```bash
# Briefing before editing
npx codecontext --scope src/your-file.ts

# Check after editing
npx codecontext --diff HEAD src/your-file.ts
```

### Pre-commit hook (recommended)

```bash
# .husky/pre-commit or .git/hooks/pre-commit
npx codecontext --staged
```

## License

MIT
