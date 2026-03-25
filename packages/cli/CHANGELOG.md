# @recallnet/codecontext-cli

## 0.3.0

### Minor Changes

- 8abd83f: Adopt `{@link ...}` as the canonical supporting-reference syntax for `@context` annotations.

  Local references should now use `{@link file:...}` and remote references may use `{@link https://...}`. Parser, lint, spec, and README examples were updated to match.

### Patch Changes

- Updated dependencies [8abd83f]
  - @recallnet/codecontext-parser@0.4.0

## 0.2.0

### Minor Changes

- 29dfb88: Remove `.ctx.md` support and treat `#ref` values as plain references to arbitrary supporting artifacts. JSON/report output no longer exposes `ctxFile` metadata, verification dates must live on inline `@context` tags, and reference resolution no longer falls back to `.ctx.md` conventions.

### Patch Changes

- Updated dependencies [29dfb88]
  - @recallnet/codecontext-parser@0.3.0

## 0.1.5

### Patch Changes

- 32f6214: Add package-level READMEs so npmjs package pages render useful install and usage docs.
- Updated dependencies [32f6214]
  - @recallnet/codecontext-parser@0.2.2

## 0.1.4

### Patch Changes

- ef9be00: Publish all packages publicly to npmjs and update package metadata for the new registry.
- Updated dependencies [ef9be00]
  - @recallnet/codecontext-parser@0.2.1

## 0.1.3

### Patch Changes

- d1e93e5: Make `--report` group entries by decision-oriented categories and summarize linked references.

## 0.1.2

### Patch Changes

- aad0ecf: Publish the CLI report scan fix for modern module extensions.

## 0.1.1

### Patch Changes

- Updated dependencies
  - @recallnet/codecontext-parser@0.2.0
