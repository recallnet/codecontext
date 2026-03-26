---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rb"
  - "**/*.java"
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.swift"
  - "**/*.kt"
---

When you encounter @context annotations in source code:

- `!critical` annotations MUST be read and understood before making any edits to the annotated block. Violating a critical constraint risks defects or constraint violations.
- `!high` annotations SHOULD be reviewed. They significantly reduce the risk of unintended consequences.
- When `{@link file:.claude/skills/...}` appears in an annotation, load that skill before editing the annotated code.
- After editing code guarded by @context annotations, verify the context is still accurate and bump `[verified:YYYY-MM-DD]` to today's date.
- If the annotation is no longer accurate after your edit, update the summary text to reflect the new behavior.
- If the annotated code was removed entirely, remove the @context annotation too.
