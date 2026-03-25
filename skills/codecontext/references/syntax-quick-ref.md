# codecontext Syntax Quick Reference

## Inline Tag Format

```
@context <type>[:<subtype>] [#ref] [!priority] — <summary>
```

## Types and Subtypes

### decision -- A deliberate choice among alternatives

```javascript
// @context decision — Chose REST over GraphQL for simplicity of client caching
// @context decision:tradeoff — LRU over LFU: sacrifices hit rate for O(1) eviction
// @context decision:constraint — Batch size capped at 100 by Stripe API limits
// @context decision:assumption — Assumes user timezone offset fits in i16
```

### requirement -- Traces code to a product or compliance requirement

```javascript
// @context requirement — WCAG 2.1 AA contrast ratio required for all text
// @context requirement #docs/compliance/gdpr-retention.md — 90-day data retention per GDPR Article 17
```

### risk -- Known risk or concern

```python
# @context risk:perf !high — This loop is O(n^2); acceptable for n < 1000
# @context risk:security !critical — Input not sanitized here; relies on upstream validation
# @context risk:compat — Safari < 16.4 doesn't support this CSS property
```

### related -- Points to related context

```go
// @context related #docs/auth-flow.md — Session handling depends on auth-flow decision
// @context related — See also: billing/invoice.ts for the other half of this flow
```

### history -- Why code changed

```rust
// @context history — Migrated from recursive to iterative after stack overflow in prod (v2.3)
// @context history — Was a HashMap; switched to BTreeMap for deterministic iteration order
```

### doc -- Supplementary explanation

```sql
-- @context doc — This CTE materializes the join to avoid repeated index scans on orders
```

## Priority Levels

| Level    | Syntax      | When to Use                                               |
| -------- | ----------- | --------------------------------------------------------- |
| Critical | `!critical` | Misunderstanding causes a defect. Learned from incidents. |
| High     | `!high`     | Important for safe modification.                          |
| Standard | _(omit)_    | Relevant but not urgent.                                  |
| Low      | `!low`      | Background information.                                   |

## ID References

Link to supporting context in any project file:

```typescript
// @context decision #docs/context/gate-42.md !critical — Strict > (not >=); see gate-42 for details
```

The `#docs/context/gate-42.md` reference resolves directly to that file.

## Reference Targets

`#ref` can point at any useful supporting artifact:

- project Markdown or HTML docs
- source files
- issue or ADR exports committed into the repo
- generated analysis artifacts

Keep verification dates on the inline `@context` tag itself.

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
| JS / TS / Go / Rust / C / Java | `// @context ...`       |
| Python / Ruby / Shell / YAML   | `# @context ...`        |
| SQL / Lua / Haskell            | `-- @context ...`       |
| HTML / XML                     | `<!-- @context ... -->` |
| CSS                            | `/* @context ... */`    |
| Lisp / Clojure                 | `;; @context ...`       |
