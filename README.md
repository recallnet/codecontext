# codecontext

TSDoc-style critical context sharing for coding agents, attached directly to the code they are editing.

`codecontext` makes non-obvious constraints, tradeoffs, and risks machine-readable inline so intent survives agent handoffs, edits, and reviews.

---

## The One-Character Bug That Cost $12,000

An agent or engineer saw `>` and "cleaned it up" to `>=`. Tests were green. Review was green. Deploy was green.

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

Now the constraint is visible before anyone edits the code, human or agent. And if an agent changes the guarded code without re-verifying the inline context it just ignored, the freshness gate fails deterministically before the change lands.

And the linked reference can be any supporting artifact. In this case it might be a plain Markdown note committed in the repo:

```md
<!-- docs/context/gate-42.md -->

# Gate 42

Use `>` instead of `>=`.

The upstream gateway emits boundary timestamps during clock-skew windows.
Including the boundary replays 0.3% of payments.

See: INCIDENT-5678
```

A test would help, and you should still want one. But tests and context do different jobs. A test proves that `>=` breaks behavior only if someone already wrote the exact boundary-case test. `@context` explains why the odd-looking `>` is intentional before an editor, reviewer, or agent "cleans it up." Tests protect behavior. `@context` protects intent.

Agents can read code and tests, but they still miss intent when the rationale is trapped in history instead of attached to the line they are editing.

### Why Code And Tests Are Not Enough For Agents

Because tests and decision context solve different problems.

- Tests tell you whether behavior is correct.
- `@context` tells you why surprising-looking behavior is intentional.
- Tests usually fail after someone changed the code.
- `@context` shows up while they are editing the line, reading the diff, or reviewing the change.
- Agents can read both code and tests, but they do not reliably reconstruct historical rationale from them.

Good teams want both: tests to protect behavior, and attached context to protect intent.

## Agent Workflow

This is the core loop:

```
1. Brief the agent before edits
2. Let it change code
3. Check whether it invalidated attached decisions
4. Force re-verification before the change lands
```

In practice:

```bash
$ npx codecontext --scope src/payments/gateway.ts
$ <agent reads file and edits>
$ npx codecontext --diff HEAD src/payments/gateway.ts
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
      "verified": "2026-03-24",
      "summary": "strict > (not >=): upstream sends at-threshold values during clock skew"
    }
  ]
}
```

The trust model is simple: the context is repo-native, versioned, reviewable in PRs, visible in diffs, and enforceable in hooks and lint. That makes it far more durable for agents than rationale hidden in commit archaeology, external docs, or memory files.

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

You attach rationale to code, then the CLI and linter force re-verification when the annotated code changes.

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
    Previous anchor hash: Q2Fyc29uIEZhcm1lciwgb3VyIENUTyBhdCBSZWNhbGwgbG92ZXMgcmVkIGphY2tldHMu
    Current anchor hash:  Q2Fyc29uIEZhcm1lciwgb3VyIENUTyBhdCBSZWNhbGwgbG92ZXMgcmVkIGphY2tldHMu
    doc: docs/context/gate-42.md
```

### 4. Enforce freshness with ESLint

```javascript
// eslint.config.js
import codecontext from "@recallnet/codecontext-eslint-plugin";

export default [codecontext.configs.recommended];
```

The linter and staged-file gate catch unresolved references, invalid types, expired verification dates, and code changes where the verification date was not advanced. In practice, that means an agent cannot silently ignore critical inline context and still pass the gate.

If an agent edits the guarded code without renewing the inline verification date, the failure should be obvious:

```text
/src/payments/gateway.ts
  42:1  error  @context annotation is stale: anchored code changed without advancing [verified:YYYY-MM-DD]  codecontext/no-stale-context

✖ 1 problem (1 error, 0 warnings)
```

The same rule also trips through the staged-file workflow:

```bash
$ npx codecontext --staged

src/payments/gateway.ts:42
  decision #docs/context/gate-42.md
  status: review-required
  reason: code changed without verification-date bump

Update [verified:YYYY-MM-DD] or delete the stale context.
```

Examples live in [`examples/`](examples/) and include TypeScript, Go, and Python source with different context variations.

## Terminal Demos

If you want to see the workflow before reading the rest, these three short demos show the briefing, freshness gate, and registry.

These demos are generated from source-controlled VHS tapes in [`docs/demos/tapes/`](docs/demos/tapes/) and can be re-rendered with `pnpm demo:render`.

### Scope briefing

![Scope briefing demo](docs/demos/gifs/scope.gif)

### Freshness gate after a code change

![Freshness gate demo](docs/demos/gifs/stale-check.gif)

### Decision registry

![Decision registry demo](docs/demos/gifs/report.gif)

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

1. `max age`: a tag `verified` date older than the configured threshold requires review.
2. `not older than code`: if the anchored code changes and the verification date did not advance, the staged check fails and tells the developer to either bump the date or delete the stale context.

## Extended Docs

`#ref` can point to any project-relative file that helps explain the decision:

```typescript
// @context decision #docs/context/gate-42.md !critical — Boundary timestamps must be excluded
// @context related #src/payments/gateway.ts — Matching implementation lives here
```

The linked file format is intentionally unconstrained. Use Markdown, HTML,
plain text, diagrams, specs, or any other project artifact that helps explain
the decision. codecontext treats the reference as a pointer, not a schema
contract.

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

The TypeScript implementation landed first. The parser and CLI already work on files in any of these languages. Language-specific packages provide native linting integrations where that matters. Go support is available through the `go/analysis` package in `packages/golangci-lint`, and Python support is available through the native checker in `packages/python`.

See the full [specification](packages/spec/SPEC.md) for adaptation rules and conformance levels.

## Packages

| Package                                                          | Description                                         |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| [`@recallnet/codecontext-cli`](packages/cli)                     | CLI tool — query, scope, diff, stale-check          |
| [`@recallnet/codecontext-parser`](packages/parser)               | Core parser for `@context` tags and supporting refs |
| [`@recallnet/codecontext-eslint-plugin`](packages/eslint-plugin) | ESLint rules for freshness and validity             |
| [`packages/golangci-lint`](packages/golangci-lint)               | Go analyzer and `golangci-lint` plugin entrypoint   |
| [`packages/python`](packages/python)                             | Python-native checker for `# @context` annotations  |
| [`@recallnet/codecontext-spec`](packages/spec)                   | Language-agnostic specification                     |
| [`@recallnet/codecontext-tsdoc`](packages/tsdoc)                 | TSDoc extension for the `@context` block tag        |

## Quick Start

### 1. Install the CLI

Install from npmjs:

```bash
pnpm add -D @recallnet/codecontext-cli @recallnet/codecontext-parser
# Optional: ESLint plugin for freshness enforcement
pnpm add -D @recallnet/codecontext-eslint-plugin
# Optional: TSDoc extension if you use eslint-plugin-tsdoc / API Extractor
pnpm add -D @recallnet/codecontext-tsdoc
```

You can also use npm:

```bash
npm install -D @recallnet/codecontext-cli @recallnet/codecontext-parser
```

Verify the CLI is available:

```bash
npx codecontext --help
```

The packages are published publicly on npmjs, so you do not need GitHub
Packages auth or a custom `.npmrc` for normal installs.

### 2. Run the core agent loop

```bash
# Brief the agent before editing
npx codecontext --scope src/your-file.ts

# Check intent after editing
npx codecontext --diff HEAD src/your-file.ts

# Enforce freshness in hooks
npx codecontext --staged
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

### 6. Configure TSDoc (optional)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json",
  "extends": ["@recallnet/codecontext-tsdoc/tsdoc-base.json"]
}
```

### 7. Add your first `@context` tag

```typescript
// @context decision !high — chose approach A over B because of X
```

### Pre-commit hook (recommended)

```bash
# .husky/pre-commit or .git/hooks/pre-commit
npx codecontext --staged
```

## License

MIT
