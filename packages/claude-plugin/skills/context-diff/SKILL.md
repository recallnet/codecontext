---
name: context-diff
description: >
  Check which @context annotations are affected by recent code changes.
  Use after editing code to verify context accuracy and flag stale annotations.
user-invocable: true
allowed-tools: Bash(npx codecontext *)
argument-hint: "<file>"
---

Run the codecontext diff command on the target file to see which annotations
are affected by uncommitted changes.

```bash
npx codecontext --diff HEAD $ARGUMENTS
```

For each affected annotation:

1. Check if the annotation still accurately describes the code.
2. If accurate, recommend bumping `[verified:YYYY-MM-DD]` to today's date.
3. If no longer accurate, recommend updating the annotation summary.
4. If the annotated code was removed, recommend removing the annotation.

Flag any `!critical` annotations that changed — these require careful review.
