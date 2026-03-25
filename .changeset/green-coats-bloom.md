---
"@recallnet/codecontext-cli": minor
"@recallnet/codecontext-parser": minor
"@recallnet/codecontext-eslint-plugin": minor
---

Remove `.ctx.md` support and treat `#ref` values as plain references to arbitrary supporting artifacts. JSON/report output no longer exposes `ctxFile` metadata, verification dates must live on inline `@context` tags, and reference resolution no longer falls back to `.ctx.md` conventions.
