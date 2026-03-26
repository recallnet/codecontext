# @recallnet/codecontext-formatter

Shared formatting and reminder utilities for `@context` annotations.

## Install

```bash
npm install @recallnet/codecontext-formatter
```

## Exports

- `ReminderCooldown`: suppress repeated reminders for the same annotation set
- `formatReminder`: render grouped reminder text for agent integrations
- `groupByPriority`: split tags into critical, high, standard, and low groups
- `formatTagLabel`: render compact labels for individual tags

This package is used by the `pi` and Claude Code integrations to keep reminder
output consistent across agent surfaces.

## Docs

- Repo: https://github.com/recallnet/codecontext
- Full README: https://github.com/recallnet/codecontext/blob/main/README.md
