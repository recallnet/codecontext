# @recallnet/codecontext-parser

## 0.4.0

### Minor Changes

- 8abd83f: Adopt `{@link ...}` as the canonical supporting-reference syntax for `@context` annotations.

  Local references should now use `{@link file:...}` and remote references may use `{@link https://...}`. Parser, lint, spec, and README examples were updated to match.

## 0.3.0

### Minor Changes

- 29dfb88: Remove `.ctx.md` support and treat `#ref` values as plain references to arbitrary supporting artifacts. JSON/report output no longer exposes `ctxFile` metadata, verification dates must live on inline `@context` tags, and reference resolution no longer falls back to `.ctx.md` conventions.

## 0.2.2

### Patch Changes

- 32f6214: Add package-level READMEs so npmjs package pages render useful install and usage docs.

## 0.2.1

### Patch Changes

- ef9be00: Publish all packages publicly to npmjs and update package metadata for the new registry.

## 0.2.0

### Minor Changes

- Add verified-date freshness gates and tsdoc-safe syntax support.
