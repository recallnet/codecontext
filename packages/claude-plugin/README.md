# @recallnet/codecontext-claude-plugin

Claude Code plugin for surfacing `@context` annotations during reads and edits.

## Install

```bash
npm install @recallnet/codecontext-claude-plugin
```

Point Claude Code at the installed plugin directory:

```bash
claude --plugin-dir ./node_modules/@recallnet/codecontext-claude-plugin
```

## What it includes

- `on-read`: injects priority-tiered reminders after Claude reads annotated files
- `on-edit-guard`: warns before edits to files with `!critical` annotations
- `on-stop-check`: checks staged files for stale context when Claude stops
- `/context-scope <file>`: pre-edit briefing
- `/context-diff <file>`: post-edit check
- `/context-staged`: staged-file staleness check

## Docs

- Repo: https://github.com/recallnet/codecontext
- Full README: https://github.com/recallnet/codecontext/blob/main/README.md
