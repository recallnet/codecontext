# Context Files (.ctx.md)

**Version:** 1.0.0-draft
**Parent document:** [SPEC.md](SPEC.md)

Context files provide extended decision context when inline `@context` tags are insufficient. They are Markdown files with YAML frontmatter, identified by the `.ctx.md` extension.

## File Naming

Context files MUST be named `<id>.ctx.md`, where `<id>` matches the ID used in `@context` tags (pattern: `[a-z0-9]+(-[a-z0-9]+)*`).

Examples:

- `cache-strategy.ctx.md`
- `auth-flow.ctx.md`
- `orm-choice.ctx.md`

## File Location

Context files reside in the project's **context directory**. The default context directory is:

```
<project-root>/docs/context/
```

This path MAY be overridden by setting `contextDir` in `codecontext.json`:

```json
{
  "contextDir": ".context"
}
```

Subdirectories within the context directory are NOT part of the resolution path. All context files MUST be placed directly in the context directory (flat structure). If a project needs organizational grouping, use ID prefixes (e.g., `auth-session-handling.ctx.md`, `auth-token-refresh.ctx.md`).

## YAML Frontmatter Schema

Every `.ctx.md` file MUST begin with a YAML frontmatter block delimited by `---`.

```yaml
---
id: cache-strategy
type: decision
status: active
verified: 2025-11-15
owners:
  - "@alice"
  - "@bob"
traces:
  - "JIRA-1234"
  - "RFC-0042"
---
```

### Required Fields

| Field  | Type   | Description                                                                                                             |
| ------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `id`   | string | The unique identifier for this context. MUST match the filename (without `.ctx.md`). Pattern: `[a-z0-9]+(-[a-z0-9]+)*`. |
| `type` | string | The context type. MUST be one of the types defined in the spec or a custom type defined in `codecontext.json`.          |

### Optional Fields

| Field           | Type                   | Default    | Description                                                                             |
| --------------- | ---------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `status`        | string                 | `"active"` | The lifecycle status of this context. One of: `active`, `superseded`, `deprecated`.     |
| `verified`      | string (ISO 8601 date) | _(none)_   | The date when this context was last verified as accurate. Format: `YYYY-MM-DD`.         |
| `owners`        | string[]               | `[]`       | People or teams responsible for this context. Typically usernames prefixed with `@`.    |
| `traces`        | string[]               | `[]`       | External references (issue tracker IDs, RFC numbers, URLs) that relate to this context. |
| `superseded-by` | string                 | _(none)_   | When `status` is `superseded`, the ID of the context file that replaces this one.       |
| `tags`          | string[]               | `[]`       | Freeform tags for categorization and search.                                            |

### Field Validation

- `id` MUST match the filename stem. A file named `cache-strategy.ctx.md` MUST have `id: cache-strategy`.
- `type` MUST be a recognized type (built-in or custom). Unrecognized types SHOULD produce a warning.
- `status` MUST be one of the three enumerated values. Unrecognized values are a parse error.
- `verified` MUST be a valid ISO 8601 date (`YYYY-MM-DD`). Timestamps with time components are accepted but the time portion is ignored.
- `superseded-by` SHOULD only be present when `status` is `superseded`. If present with another status, parsers SHOULD warn.

## Markdown Body

The body of a `.ctx.md` file is standard Markdown. While the structure is flexible, the following sections are RECOMMENDED for `decision` type contexts:

### Recommended Sections

#### Context

Describe the situation that prompted the decision. What problem needed solving? What constraints existed?

#### Options Considered

List the alternatives that were evaluated. For each option, describe its pros and cons.

#### Decision

State what was decided and why. This is the most important section.

#### Risks

Describe any known risks of the chosen approach and any mitigations in place.

### Example

```markdown
---
id: cache-strategy
type: decision
status: active
verified: 2025-11-15
owners:
  - "@alice"
traces:
  - "JIRA-1234"
---

## Context

The product page loads 50+ items from the catalog service. Uncached, this takes
800ms at p95. The SLA requires < 200ms.

## Options Considered

### 1. LRU Cache (in-process)

- **Pros:** Simple, no infrastructure dependency, O(1) operations.
- **Cons:** Per-instance (not shared), memory pressure on small containers.

### 2. Redis

- **Pros:** Shared across instances, TTL support, mature tooling.
- **Cons:** Network hop adds ~2ms, operational overhead, new dependency.

### 3. CDN Edge Cache

- **Pros:** Lowest latency for repeat visitors, offloads origin.
- **Cons:** Cache invalidation is complex, not suitable for personalized data.

## Decision

Use an in-process LRU cache with a 5-minute TTL. The catalog data is
non-personalized and tolerates staleness. Memory footprint is bounded at 64MB
per instance, which fits within our container limits.

Redis was rejected because the added operational complexity is not justified for
this use case. CDN caching may be added later for public-facing pages.

## Risks

- **Memory pressure:** If the catalog grows beyond projections, the 64MB bound
  may need adjustment. Monitor container memory usage.
- **Stale data:** A 5-minute TTL means price changes take up to 5 minutes to
  propagate. Accepted by product team.
```

### Non-decision Types

For types other than `decision`, the recommended sections differ:

| Type          | Recommended Sections                         |
| ------------- | -------------------------------------------- |
| `requirement` | Context, Specification, Acceptance Criteria  |
| `risk`        | Description, Impact, Likelihood, Mitigations |
| `related`     | Context, References                          |
| `history`     | Background, Timeline, Outcome                |
| `doc`         | _(Free-form; no prescribed sections)_        |

These are recommendations, not requirements. A conforming parser MUST NOT reject a `.ctx.md` file based on which Markdown sections are present or absent.

## Status Lifecycle

Context files progress through the following statuses:

```
active ──> superseded
  │
  └──> deprecated
```

### active

The context is current and accurately describes the codebase. This is the default status for new context files.

### superseded

The context has been replaced by a newer decision. The `superseded-by` field SHOULD reference the ID of the replacement context file.

When superseding a context:

1. Create the new `.ctx.md` file with `status: active`.
2. Update the old file: set `status: superseded` and `superseded-by: <new-id>`.
3. Update `@context` tags in source code to reference the new ID (or leave them if both contexts are relevant).

### deprecated

The context is no longer relevant. The code it described may have been removed, or the concern it raised is no longer applicable.

A deprecated context file SHOULD be retained (not deleted) for historical reference. Tools MAY filter out deprecated contexts from default views.

## Cross-referencing

Context files MAY reference other context files using standard Markdown links:

```markdown
This decision builds on [auth-flow](auth-flow.ctx.md).
```

Context files MAY also reference source code locations, though such references are inherently fragile:

```markdown
See the implementation in `src/cache/lru.ts`.
```

Tools SHOULD NOT validate source code references in context files (they change frequently). Tools SHOULD validate context-to-context references.
