# @recallnet/codecontext-claude-plugin

Claude Code plugin that surfaces inline `@context` annotations automatically
during reads and edits. The goal is to keep critical constraints, risks, and
historical decisions in the agent loop without relying on manual reminder
commands.

## Install

Install the npm package:

```bash
npm install @recallnet/codecontext-claude-plugin
```

Then point Claude Code at the installed plugin directory:

```bash
claude --plugin-dir ./node_modules/@recallnet/codecontext-claude-plugin
```

## What it does

The plugin adds three native hooks:

| Hook            | Event                 | Behavior                                                                                                                                           |
| --------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `on-read`       | `PostToolUse -> Read` | When Claude reads a file with `@context` tags, a priority-tiered reminder is injected into the conversation so critical annotations surface first. |
| `on-edit-guard` | `PreToolUse -> Edit   | Write`                                                                                                                                             | Before Claude edits a file with `!critical` annotations, an advisory warning reminds it about those constraints. |
| `on-stop-check` | `Stop`                | When Claude finishes responding, staged files are checked for stale context before commit.                                                         |

It also installs three slash commands:

| Command                 | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `/context-scope <file>` | Pre-edit briefing: show all annotations on a file by priority    |
| `/context-diff <file>`  | Post-edit check: show which annotations are affected by a change |
| `/context-staged`       | Staged-file staleness check                                      |

## What the reminders look like

Priority-tiered steering groups annotations by urgency:

```text
-- MUST-READ (critical) --
L42  @context decision:constraint !critical -- Strict > avoids duplicate processing

-- WARNING (high) --
L78  @context risk:security !high -- Rate limit bypass if cache evicted

-- INFO --
L103 @context history -- Migrated from v1 API
```

When an annotation links to a Claude skill via
`{@link file:.claude/skills/.../SKILL.md}`, the hook explicitly tells Claude to
load that skill before editing.

## Why use this instead of manual CLI calls

Without the plugin, the normal loop is manual:

1. run a scope command before editing
2. remember the critical constraints while editing
3. run a diff or staged check afterward

With the plugin:

1. Claude reads a file and gets the `@context` reminder automatically
2. Claude starts an edit and gets warned about `!critical` constraints
3. Claude stops and the plugin checks staged files for stale context

The plugin uses the same `codecontext` CLI and parser under the hood, but keeps
the workflow inside Claude Code instead of depending on manual operator steps.

## Related packages

- `@recallnet/codecontext-cli`: CLI for scope, diff, staged, and report flows
- `@recallnet/codecontext-parser`: parser and staleness logic
- `@recallnet/codecontext-formatter`: reminder formatting and cooldown helpers

## Docs

- Repo: https://github.com/recallnet/codecontext
- Full README: https://github.com/recallnet/codecontext/blob/main/README.md
