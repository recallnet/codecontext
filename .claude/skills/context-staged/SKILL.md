---
name: context-staged
description: >
  Check all staged files for stale @context annotations before committing.
  Use as a pre-commit verification step.
user-invocable: true
allowed-tools: Bash(npx codecontext *)
context: fork
---

Run the codecontext staged check across all files in the git staging area.

```bash
npx codecontext --staged
```

If stale annotations are found:

1. List each stale annotation with its file, line, and reason.
2. For each, recommend either:
   - Bumping `[verified:YYYY-MM-DD]` to today if the context is still accurate.
   - Updating the annotation summary if the context changed.
   - Removing the annotation if the code it described was deleted.
3. Do not proceed with the commit until all annotations are verified.

If all annotations are fresh, confirm that the staged files are clear to commit.
