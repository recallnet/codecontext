# codecontext Specification

**Version:** 1.0.0-draft
**Status:** Draft

## Abstract

codecontext is a specification for embedding structured decision context directly in source code comments, designed for both human readability and machine consumption. By using a universal `@context` tag syntax that works within any programming language's native comment delimiters, codecontext enables developers, tools, and AI agents to capture, discover, and reason about the *why* behind code — tradeoffs, constraints, risks, and historical decisions — without leaving the source file. Companion `.ctx.md` files provide extended context when inline comments are insufficient.

## Terminology

| Term | Definition |
|------|------------|
| **Context tag** | A structured annotation beginning with the `@context` sigil, embedded in a source code comment. A context tag carries a type, optional subtype, optional ID, optional priority, and a human-readable summary. |
| **Context file** | A Markdown file with the extension `.ctx.md` that provides extended context for a decision or annotation. Context files use YAML frontmatter for structured metadata and a Markdown body for prose. |
| **Logical block** | The contiguous region of code immediately following a context tag. The logical block is the scope to which the tag applies. Block boundaries are language-dependent (e.g., the next function, class, statement, or brace-delimited block). |
| **Anchor** | The association between a context tag and its logical block. The anchor is what makes staleness detection possible: when the logical block changes, the anchor's hash changes. |
| **Staleness** | The condition where the logical block associated with a context tag has been modified since the tag was last verified. Staleness indicates that the context may no longer accurately describe the code. |
| **Verification** | The act of confirming that a context tag still accurately describes its logical block. Verification updates the content hash stored in the cache. |

## Comment Syntax

A context tag is a single annotation with the following structure:

```
@context:<type>[:<subtype>] [#id] [!priority] — <summary>
```

### Fields

| Field | Required | Format | Description |
|-------|----------|--------|-------------|
| `type` | Yes | Lowercase alphanumeric | The primary classification of the context. See Type Taxonomy. |
| `subtype` | No | Lowercase alphanumeric | A secondary classification within the type. |
| `#id` | No | `#` followed by `[a-z0-9-]+` | A reference to a `.ctx.md` file for extended context. |
| `!priority` | No | `!critical`, `!high`, or `!low` | The importance level of the annotation. |
| `summary` | Yes | Free-form text | A human-readable description of the context. Follows an em-dash (`—`) separator. |

### Universal Comment Embedding

The `@context` sigil can appear inside any comment form that a programming language supports. A conforming parser MUST strip the language's comment delimiter(s) and then parse the remaining text for `@context` tags.

Examples across languages:

```javascript
// @context:decision:tradeoff #cache-strategy !critical — LRU chosen over LFU for O(1) eviction
```

```python
# @context:risk:perf !high — This loop is O(n^2); acceptable for n < 1000
```

```sql
-- @context:decision:constraint — Foreign keys disabled for bulk import performance
```

```css
/* @context:requirement — WCAG 2.1 AA contrast ratio required */
```

```html
<!-- @context:related #auth-flow — See authentication context for session handling -->
```

```lisp
;; @context:history — Migrated from recursive to iterative approach in v2.3
```

A context tag MUST appear on a single logical line. Multi-line context is achieved through consecutive context tags (see [syntax.md](syntax.md)).

## Type Taxonomy

| Type | Subtypes | Description |
|------|----------|-------------|
| `decision` | `tradeoff`, `constraint`, `assumption` | Records a design or implementation decision and its rationale. |
| `requirement` | *(none)* | Links code to a functional or non-functional requirement. |
| `risk` | `perf`, `security`, `compat` | Flags a known risk or concern associated with the code. |
| `related` | *(none)* | Points to related code, documentation, or external resources. |
| `history` | *(none)* | Records historical context — what changed, when, and why. |
| `doc` | *(none)* | Provides supplementary documentation that aids understanding. |

### Type Descriptions

**decision** — Use when code reflects a deliberate choice among alternatives.
- `decision:tradeoff` — A choice that sacrifices one quality for another.
- `decision:constraint` — A choice imposed by an external constraint (API limitation, regulatory requirement, dependency behavior).
- `decision:assumption` — A choice predicated on an assumption that may change.

**requirement** — Use to trace code back to a product requirement, user story, or specification item.

**risk** — Use to flag code that carries known risk.
- `risk:perf` — Performance risk (algorithmic complexity, resource consumption, latency).
- `risk:security` — Security risk (input validation, authentication, data exposure).
- `risk:compat` — Compatibility risk (browser support, API versioning, platform differences).

**related** — Use to connect code to related context elsewhere in the codebase or external resources.

**history** — Use to record why code changed, especially when the current form would otherwise be surprising.

**doc** — Use for inline explanations that go beyond what a normal code comment would cover.

## Priority Levels

| Priority | Syntax | Semantics |
|----------|--------|-----------|
| Critical | `!critical` | MUST read before modifying the associated code. Failure to understand this context risks introducing a defect or violating a constraint. |
| High | `!high` | SHOULD read before modifying. Understanding this context significantly reduces the risk of unintended consequences. |
| Low | `!low` | Informational. Useful background context but not essential for safe modification. |
| *(none)* | *(omitted)* | Standard priority. The context is relevant but does not carry special urgency. |

A conforming tool SHOULD surface `!critical` tags prominently when a developer is editing the associated logical block.

## ID References

An ID reference takes the form `#<id>` where `<id>` matches the pattern `[a-z0-9]+(-[a-z0-9]+)*` (lowercase alphanumeric segments separated by hyphens).

### Resolution

When a parser encounters `#<id>`, it resolves the reference by searching for a file named `<id>.ctx.md` in the project's context directory. The default context directory is `docs/context/` relative to the project root. This path MAY be overridden in `codecontext.json`.

Resolution order:

1. Check `codecontext.json` for a custom `contextDir` path.
2. Look for `<contextDir>/<id>.ctx.md`.
3. If not found, report an unresolved reference (tools SHOULD warn, not error).

See [ctx-files.md](ctx-files.md) for the `.ctx.md` file format.

## Language Adaptation

codecontext is language-agnostic. The specification does NOT prescribe which comment form to use — any comment form supported by the language is valid. The following table lists common languages and their comment forms:

| Language | Line Comment | Block Comment |
|----------|-------------|---------------|
| JavaScript / TypeScript | `//` | `/* */` |
| Go | `//` | `/* */` |
| Rust | `//` | `/* */` |
| C / C++ | `//` | `/* */` |
| Java / Kotlin | `//` | `/* */` |
| C# | `//` | `/* */` |
| Swift | `//` | `/* */` |
| Python | `#` | *(none; `"""` is a string literal, not a comment)* |
| Ruby | `#` | `=begin ... =end` |
| Shell (Bash, Zsh) | `#` | *(none)* |
| YAML | `#` | *(none)* |
| SQL | `--` | `/* */` |
| Lua | `--` | `--[[ ]]` |
| Haskell | `--` | `{- -}` |
| HTML / XML | *(none)* | `<!-- -->` |
| CSS | *(none)* | `/* */` |
| Lisp / Clojure | `;;` | *(none)* |
| Erlang / Elixir | `#` or `%` | *(none)* |

### Adaptation Rules

1. A parser MUST understand the comment syntax of its target language.
2. A parser MUST strip the comment delimiter (and any conventional leading whitespace) before searching for `@context`.
3. For block comments, each line within the block is treated independently after stripping the block delimiters and any per-line decoration (e.g., leading `*` in `/** */` style comments).
4. The `@context` sigil MUST appear at the start of the comment text (after delimiter stripping and whitespace normalization).

## Conformance Levels

### Level 1: Minimal

A **Minimal** conforming implementation MUST:

- Parse `@context` tags from source code comments in at least one language.
- Extract the type, subtype (if present), ID (if present), priority (if present), and summary.
- Report parse errors for malformed tags.

### Level 2: Standard

A **Standard** conforming implementation MUST satisfy all Minimal requirements and additionally:

- Resolve `#id` references to `.ctx.md` files.
- Parse `.ctx.md` YAML frontmatter and Markdown body.
- Report unresolved references as warnings.

### Level 3: Full

A **Full** conforming implementation MUST satisfy all Standard requirements and additionally:

- Identify the logical block associated with each context tag.
- Compute content hashes for logical blocks.
- Track staleness by comparing stored hashes with current hashes.
- Maintain a `.codecontext-cache.json` file.
- Report stale context tags.

See [staleness.md](staleness.md) for the staleness model.

## Extensibility

Projects MAY define custom types and subtypes by creating a `codecontext.json` configuration file at the project root.

### Configuration Schema

```json
{
  "version": "1.0",
  "contextDir": "docs/context",
  "stalenessThresholdDays": 30,
  "customTypes": {
    "compliance": {
      "description": "Regulatory compliance context",
      "subtypes": {
        "gdpr": { "description": "GDPR-related compliance" },
        "hipaa": { "description": "HIPAA-related compliance" },
        "sox": { "description": "SOX-related compliance" }
      }
    }
  },
  "hashAlgorithm": "sha256",
  "hashLength": 16
}
```

### Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | string | `"1.0"` | The specification version this config targets. |
| `contextDir` | string | `"docs/context"` | Path to the context directory, relative to project root. |
| `stalenessThresholdDays` | number | `30` | Number of days after which a stale tag enters `review-required` status. |
| `customTypes` | object | `{}` | Map of custom type names to their definitions. |
| `hashAlgorithm` | string | `"sha256"` | Hash algorithm for content-addressable staleness tracking. |
| `hashLength` | number | `16` | Number of hex characters to retain from the hash. |

Custom types MUST NOT collide with the built-in types defined in this specification. A conforming parser SHOULD reject configurations that attempt to redefine built-in types.

## References

- [syntax.md](syntax.md) — Detailed syntax reference and formal grammar
- [ctx-files.md](ctx-files.md) — The `.ctx.md` file format
- [staleness.md](staleness.md) — The staleness detection model
