---
name: context-scope
description: >
  Surface @context annotations before editing a file. Shows critical constraints,
  tradeoffs, and risks sorted by priority. Use when about to modify unfamiliar or
  complex code, or when the user asks what constraints apply to a file.
user-invocable: true
allowed-tools: Bash(npx codecontext *)
argument-hint: "<file>"
---

Run the codecontext scope command on the target file to surface all @context
annotations sorted by priority.

```bash
npx codecontext --scope $ARGUMENTS
```

Present the results grouped by priority:

- **Critical** — MUST read before editing. Violating these risks defects or constraint violations.
- **High** — SHOULD read. Significantly reduces risk of unintended consequences.
- **Normal/Low** — Informational context.

If any annotations contain `{@link file:.claude/skills/.../SKILL.md}` references,
tell the user which skill to load before editing that code.

If annotations have `review-required` or `stale` status, flag them and recommend
the user verify or update the `[verified:YYYY-MM-DD]` date.
