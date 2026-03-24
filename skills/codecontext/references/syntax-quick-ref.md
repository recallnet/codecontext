# codecontext Syntax Quick Reference

## Inline Tag Format

```
@context:<type>[:<subtype>] [#id] [!priority] — <summary>
```

## Types and Subtypes

### decision -- A deliberate choice among alternatives

```javascript
// @context:decision — Chose REST over GraphQL for simplicity of client caching
// @context:decision:tradeoff — LRU over LFU: sacrifices hit rate for O(1) eviction
// @context:decision:constraint — Batch size capped at 100 by Stripe API limits
// @context:decision:assumption — Assumes user timezone offset fits in i16
```

### requirement -- Traces code to a product or compliance requirement

```javascript
// @context:requirement — WCAG 2.1 AA contrast ratio required for all text
// @context:requirement #gdpr-retention — 90-day data retention per GDPR Article 17
```

### risk -- Known risk or concern

```python
# @context:risk:perf !high — This loop is O(n^2); acceptable for n < 1000
# @context:risk:security !critical — Input not sanitized here; relies on upstream validation
# @context:risk:compat — Safari < 16.4 doesn't support this CSS property
```

### related -- Points to related context

```go
// @context:related #auth-flow — Session handling depends on auth-flow decision
// @context:related — See also: billing/invoice.ts for the other half of this flow
```

### history -- Why code changed

```rust
// @context:history — Migrated from recursive to iterative after stack overflow in prod (v2.3)
// @context:history — Was a HashMap; switched to BTreeMap for deterministic iteration order
```

### doc -- Supplementary explanation

```sql
-- @context:doc — This CTE materializes the join to avoid repeated index scans on orders
```

## Priority Levels

| Level    | Syntax      | When to Use                                               |
| -------- | ----------- | --------------------------------------------------------- |
| Critical | `!critical` | Misunderstanding causes a defect. Learned from incidents. |
| High     | `!high`     | Important for safe modification.                          |
| Standard | _(omit)_    | Relevant but not urgent.                                  |
| Low      | `!low`      | Background information.                                   |

## ID References

Link to extended context in `docs/context/<id>.ctx.md`:

```typescript
// @context:decision #gate-42 !critical — Strict > (not >=); see gate-42 for details
```

The `#gate-42` reference resolves to `docs/context/gate-42.ctx.md`.

## .ctx.md File Template

```markdown
---
id: my-decision-id
type: decision
status: active
verified: 2025-11-15
owners:
  - "@alice"
  - "@bob"
traces:
  - "JIRA-1234"
  - "INCIDENT-5678"
---

## Decision

State what was decided.

## Why

Explain the rationale. Include data, incident references, or benchmarks.

## Alternatives Considered

- **Option B** -- Why it was rejected.
- **Option C** -- Why it was rejected.

## Constraints

External factors that shaped or limit this decision.
```

### Frontmatter Fields

| Field      | Required | Values                                                         |
| ---------- | -------- | -------------------------------------------------------------- |
| `id`       | Yes      | Lowercase alphanumeric with hyphens (`[a-z0-9-]+`)             |
| `type`     | Yes      | `decision`, `requirement`, `risk`, `related`, `history`, `doc` |
| `status`   | No       | `active` (default), `superseded`, `deprecated`                 |
| `verified` | No       | ISO date (YYYY-MM-DD)                                          |
| `owners`   | No       | List of owner handles                                          |
| `traces`   | No       | List of external references                                    |

## CLI Commands

```bash
# Pre-edit: get the briefing for a file
npx codecontext --scope src/gateway.ts

# Post-edit: check if your changes invalidated any context
npx codecontext --diff HEAD src/gateway.ts

# Diff against a specific ref
npx codecontext --diff main src/gateway.ts

# Show only stale entries
npx codecontext --stale src/gateway.ts

# Pre-commit hook: check all staged files
npx codecontext --staged

# Show all annotations (human-readable)
npx codecontext src/gateway.ts

# Show all annotations (JSON for tools/agents)
npx codecontext src/gateway.ts --json
```

## Comment Style by Language

| Language                       | Syntax                  |
| ------------------------------ | ----------------------- |
| JS / TS / Go / Rust / C / Java | `// @context:...`       |
| Python / Ruby / Shell / YAML   | `# @context:...`        |
| SQL / Lua / Haskell            | `-- @context:...`       |
| HTML / XML                     | `<!-- @context:... -->` |
| CSS                            | `/* @context:... */`    |
| Lisp / Clojure                 | `;; @context:...`       |
