---
name: codecontext
description: >
  Read, maintain, and create @context annotations during code changes.
  Use this skill whenever editing files in a project that uses codecontext
  (look for @context comments in code or a docs/context/ directory).
  Also use when the user asks about code decisions, context, rationale,
  or why code is written a certain way. Use when reviewing PRs that touch
  files with @context tags.
---

# codecontext Skill

## Why This Exists

Decisions evaporate from code. Someone chose `>` over `>=` for a reason. Someone picked LRU over LFU after an incident. Someone disabled foreign keys during bulk import because of a performance constraint. That knowledge lives in commit messages from two years ago, or in a wiki page that was last updated before the refactor, or in nobody's memory at all.

codecontext keeps decisions anchored to the code they describe, in a format that's machine-readable, version-controlled, and visible in every code review. When the code changes, the staleness system flags the annotation so nobody silently inherits outdated rationale.

Your job is to treat `@context` tags as load-bearing documentation: read them before editing, check them after editing, and maintain them as part of your changes.

## Before Editing: Get the Briefing

Before modifying any file, run the scope command:

```bash
npx codecontext --scope <filepath>
```

This returns all `@context` entries sorted by priority, with critical entries first. Read the output. If any `!critical` entries exist, open and read the linked supporting files before proceeding.

**Why this matters:** The briefing surfaces constraints you would otherwise violate unknowingly. A `!critical` tag on a comparison operator means someone learned the hard way that changing it breaks things. If you skip the briefing and change that operator, you reintroduce the bug.

Example output:

```
Scope Briefing: src/payments/gateway.ts
3 entries, sorted by priority

  @context(decision) [CRITICAL]  (verified)
    Strict > (not >=) because upstream sends at-threshold values during clock skew
    -> #docs/context/gate-42.md

  @context(risk:perf) [HIGH]  (review-required)
    This loop is O(n^2); acceptable for n < 1000

  @context(history)  (verified)
    Migrated from polling to event-driven in v3.1
```

If you see `-> #docs/context/gate-42.md`, that file has extended context. Read it.

## After Editing: Check for Invalidation

After making changes to a file that has `@context` tags, run the diff command:

```bash
npx codecontext --diff HEAD <filepath>
```

This shows which context entries are associated with lines you changed. If any entries come back as `stale` or `review-required`, update them as part of the same change.

**Why this matters:** Stale context is worse than no context. It actively misleads the next person (or agent) who reads it. If you changed a comparison from `>` to `>=` and left the `@context` tag saying "strict > because of clock skew," the next developer will trust that comment and not investigate -- even though it no longer matches the code.

## Maintaining Existing Context

When you change code that has `@context` annotations:

1. **Update the summary** if the rationale changed. If you changed the retry count from 3 to 5, update the tag that explains why it was 3.

2. **Remove dead context.** If you deleted the code a tag annotates, delete the tag. If you refactored away the tradeoff a `decision:tradeoff` describes, remove it.

3. **Check linked supporting files.** If the tag has a `#ref` reference, open the referenced file and check whether its content still applies. If it is a structured `.ctx.md` file and you've confirmed it is still accurate, update the `verified` date in frontmatter.

4. **Don't leave stale annotations.** A stale `@context` tag that contradicts the code is a trap. Either update it to match reality or remove it entirely.

## Adding New Context

### When to Add

Add `@context` when:

- You chose A over B and the reason isn't obvious from the code. (`decision`)
- The code has a known fragility or limitation. (`risk`)
- An external system, API, or regulation constrains how the code works. (`decision:constraint` or `requirement`)
- The code relies on an assumption that could change. (`decision:assumption`)
- The current form would surprise someone who doesn't know the history. (`history`)

### When NOT to Add

Do not add `@context` for:

- Trivial or self-evident code. A tag saying "this function adds two numbers" adds noise.
- TODOs or future work. Use `// TODO` for that. `@context` documents _current_ decisions, not aspirations.
- Restating what the code already says. If the code is `retryCount = 3`, don't add a tag saying "retry count is 3." Explain _why_ 3.

### Choosing the Type

| Situation                            | Type                              |
| ------------------------------------ | --------------------------------- |
| Chose between alternatives           | `decision` or `decision:tradeoff` |
| Constrained by external system       | `decision:constraint`             |
| Based on an assumption               | `decision:assumption`             |
| Known performance concern            | `risk:perf`                       |
| Known security concern               | `risk:security`                   |
| Browser/platform compat issue        | `risk:compat`                     |
| Traces to product requirement        | `requirement`                     |
| Cross-reference to other code/docs   | `related`                         |
| Surprising code that needs backstory | `history`                         |
| Extended explanation                 | `doc`                             |

### Choosing the Priority

- `!critical` -- "Read this or you will break something." Use sparingly. Reserve for constraints learned from incidents or invariants that are non-obvious and load-bearing.
- `!high` -- "You should understand this before changing nearby code."
- _(no priority)_ -- Standard relevance. The default.
- `!low` -- Background information. Nice to know, not essential.

### When to Create a Structured .ctx.md File

Create a `.ctx.md` file when:

- The rationale needs more than one or two lines.
- There are alternatives considered, constraints, or external references to document.
- Multiple code locations reference the same decision.

Reference it inline with `#ref`:

```javascript
// @context decision #docs/context/cache-strategy.md !high — LRU chosen over LFU; see benchmarks
```

### .ctx.md File Template

```markdown
---
id: <kebab-case-id>
type: decision
status: active
verified: YYYY-MM-DD
owners:
  - "@yourname"
traces:
  - "JIRA-XXXX"
---

## Decision

What was decided.

## Why

Why this option was chosen over alternatives.

## Alternatives Considered

- **Option B** -- Why it was rejected.
- **Option C** -- Why it was rejected.

## Constraints

External factors that shaped the decision.
```

## Syntax Quick Reference

Tag format:

```
@context <type>[:<subtype>] [#ref] [!priority] — <summary>
```

Types and subtypes:

| Type          | Subtypes                               |
| ------------- | -------------------------------------- |
| `decision`    | `tradeoff`, `constraint`, `assumption` |
| `requirement` | --                                     |
| `risk`        | `perf`, `security`, `compat`           |
| `related`     | --                                     |
| `history`     | --                                     |
| `doc`         | --                                     |

Priority levels: `!critical`, `!high`, _(none)_, `!low`

Status values (in .ctx.md frontmatter): `active`, `superseded`, `deprecated`

CLI commands:

| Command                              | Purpose                   |
| ------------------------------------ | ------------------------- |
| `npx codecontext --scope <file>`     | Pre-edit briefing         |
| `npx codecontext --diff HEAD <file>` | Post-edit staleness check |
| `npx codecontext --stale <file>`     | Show stale entries only   |
| `npx codecontext --staged`           | Pre-commit hook           |
| `npx codecontext <file>`             | Show all annotations      |
| `npx codecontext <file> --json`      | JSON output for tools     |

## Anti-patterns

**Don't annotate every function.** Context tags are for non-obvious decisions. If every function has one, developers stop reading them. Signal degrades to noise.

**Don't use @context for TODOs.** `@context` documents why code _is_ the way it is. Use `// TODO` or issue trackers for what it should become.

**Don't duplicate what the code says.** `@context doc — This function returns a boolean` is worse than nothing. It's one more thing to keep in sync for zero informational value.

**Don't add context retroactively without understanding the original decision.** If you don't know _why_ the code uses `>` instead of `>=`, don't guess in a `@context` tag. Guessing produces confident-sounding misinformation. Investigate first, or leave the code unannotated.

**Don't use !critical for everything.** If every tag is critical, none of them are. Reserve `!critical` for constraints learned from production incidents or invariants where violation causes data loss, security issues, or silent corruption.

**Don't create .ctx.md files for one-liners.** If the rationale fits in a single comment line, keep it inline. Extended context files are for decisions that genuinely need multiple paragraphs of explanation.
