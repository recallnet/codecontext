# codecontext Syntax Reference

**Version:** 1.0.0-draft
**Parent document:** [SPEC.md](SPEC.md)

This document defines the formal grammar, provides examples for all type/subtype combinations, and covers multi-line context blocks and edge cases.

## Formal Grammar

The following grammar uses a BNF-like notation. Terminal symbols are enclosed in quotes or described by regex patterns in angle brackets.

```
context-tag     ::= "@context" <space> type sub-type? ref? priority? verified? separator summary

type            ::= <[a-z][a-z0-9]*>
sub-type        ::= ":" <[a-z][a-z0-9]*>
ref             ::= "#" <non-space path text>
priority        ::= "!" priority-level
priority-level  ::= "critical" | "high" | "low"
verified        ::= "[verified:" iso-date "]"
iso-date        ::= <\d{4}-\d{2}-\d{2}>
separator       ::= <em-dash>                      ; U+2014 (—)
                   | <space> <hyphen> <hyphen> <space>  ; " -- " as ASCII fallback
summary         ::= <any printable characters to end of line>
```

### Whitespace Rules

- A single space (U+0020) MUST separate each field from the next.
- Leading and trailing whitespace in the summary MUST be trimmed by the parser.
- The separator MUST be preceded and followed by at least one space.

### Comment Extraction

Before applying the grammar above, a parser MUST extract the comment text:

```
comment-text    ::= line-comment-text | block-comment-text

line-comment-text   ::= line-delim ws? raw-text
line-delim          ::= "//" | "#" | "--" | ";;"

block-comment-text  ::= block-open ws? raw-text ws? block-close
block-open          ::= "/*" | "<!--" | "{-" | "--[["
block-close         ::= "*/" | "-->" | "-}" | "]]"

ws                  ::= <one or more whitespace characters>
raw-text            ::= <text to parse for context-tag>
```

For block comments spanning multiple lines, the parser MUST process each line independently. Per-line decoration (such as a leading `*` in `/** */` style) MUST be stripped before parsing.

## Examples by Type and Subtype

### decision

```javascript
// @context decision #docs/api/versioning.md [verified:2026-03-24] — REST versioning uses URL path prefix over Accept headers
```

#### decision:tradeoff

```go
// @context decision:tradeoff #docs/benchmarks/mem-vs-cpu.md !high [verified:2026-03-24] — Pre-compute lookup table; trades 64MB RAM for 10x query speedup
```

#### decision:constraint

```python
# @context decision:constraint [verified:2026-03-24] — Must use stdlib only; no third-party dependencies allowed in this module
```

#### decision:assumption

```rust
// @context decision:assumption #docs/tenancy.md [verified:2026-03-24] — Assumes single-tenant deployment; multi-tenant requires rework
```

### requirement

```typescript
// @context requirement #docs/finance/billing-calc.md !critical [verified:2026-03-24] — Implements rounding rules from finance spec section 4.2
```

### risk

```sql
-- @context risk [verified:2026-03-24] — This migration is not reversible; back up the table before running
```

#### risk:perf

```python
# @context risk:perf !high [verified:2026-03-24] — Nested loop over full dataset; O(n*m) where n,m can reach 100k
```

#### risk:security

```java
// @context risk:security !critical [verified:2026-03-24] — User input interpolated into query; parameterize before production
```

#### risk:compat

```css
/* @context risk:compat [verified:2026-03-24] — Flexbox gap not supported in Safari < 14.1 */
```

### related

```html
<!-- @context related #auth/session.ts [verified:2026-03-24] — Session token validation logic is in auth/session.ts -->
```

### history

```ruby
# @context history [verified:2026-03-24] — Switched from Nokogiri to Ox in v3.1 for 5x XML parsing speedup
```

### doc

```lua
-- @context doc [verified:2026-03-24] — State machine transitions: IDLE -> LOADING -> READY | ERROR -> IDLE
```

## Multi-line Context Blocks

When a single line is insufficient, consecutive `@context` comments form a **context block**. All tags in a block MUST share the same type, subtype, ID, and priority. Only the first tag carries the full annotation; subsequent tags carry continuation text.

### Convention

The first line contains the full context tag. Subsequent lines use `@context+` to indicate continuation:

```typescript
// @context decision:tradeoff #docs/persistence/orm-choice.md !high — Chose raw SQL over ORM for this module
// @context+ — ORM added 200ms p99 latency due to hydration overhead
// @context+ — Raw SQL is acceptable here because the schema is stable and well-tested
```

### Parsing Rules

1. A `@context+` line MUST immediately follow a `@context` or `@context+` line (no intervening non-comment lines).
2. A `@context+` line inherits the type, subtype, ID, and priority from the initiating `@context` line.
3. The summary text from all lines in the block is concatenated (joined with a single space) to form the complete summary.
4. A `@context+` line that appears without a preceding `@context` line is a parse error.

### Grammar Extension

```
context-block   ::= context-tag continuation*
continuation    ::= "@context+" separator summary
```

## Edge Cases

### Em-dash vs. Double Hyphen

The canonical separator is the em-dash character (U+2014: `—`). As an ASCII-compatible fallback, parsers MUST also accept a space-surrounded double hyphen (`--`):

```python
# @context decision — Using em-dash separator (canonical)
# @context decision -- Using double-hyphen fallback (ASCII)
```

A parser MUST normalize both forms to the same internal representation. When serializing, a tool SHOULD use the em-dash form.

The following are NOT valid separators:

- En-dash (U+2013: `--`) without surrounding spaces
- A single hyphen (`-`)
- A triple hyphen (`---`)

### Escaping

The summary field is free-form text and does not require escaping. The parser terminates the summary at end of line (for line comments) or at the block comment close delimiter (for block comments).

If a summary must contain a literal `@context` string (unusual but possible), no escaping is needed because the parser only recognizes `@context` at the start of comment text.

### Unicode

- The `type` and `subtype` fields are restricted to ASCII lowercase alphanumeric characters.
- The `ref` field MAY contain path characters such as letters, numbers, `_`, `-`, `/`, and `.`.
- The `summary` field MAY contain any Unicode characters.
- Parsers MUST handle UTF-8 encoded source files.
- Parsers SHOULD handle other encodings (UTF-16, Latin-1) if common for the target language.

### Empty Summary

A context tag with an empty summary (separator followed by only whitespace) is a parse error. The summary MUST contain at least one non-whitespace character.

### Duplicate References

Multiple `@context` tags in the same file MAY reference the same `#ref`. This indicates that multiple code locations share the same supporting material. This is valid and expected.

### Nested Block Comments

Some languages support nested block comments (e.g., Haskell `{- {- -} -}`). A parser for such languages MUST correctly handle nesting before extracting comment text for `@context` parsing.

### Comment Decorations

Many codebases use decorative comment styles:

```java
/**
 * @context decision:tradeoff — Builder pattern over constructor telescoping
 */
```

```python
###############################################
# @context risk:security !critical — Input not sanitized
###############################################
```

A conforming parser MUST strip common decorations (leading `*`, `#`, or whitespace) before searching for the `@context` sigil.
