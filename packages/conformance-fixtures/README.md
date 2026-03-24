# Conformance Fixtures

Shared fixtures for core codecontext parsing behavior across implementations.

Each fixture declares:

- `implementations`: which runners should execute it
- `filePath`: the source file path to use in the temp project
- `source`: source text to parse
- `filePathByImplementation`: optional per-implementation file path overrides
- `sourceByImplementation`: optional per-implementation source overrides
- `supportFiles`: optional additional files to materialize in the temp project
- `expected.tags`: normalized parsed tags
- `expected.errors`: normalized parse/validation errors
- `expected.resolvedCtxFiles`: refs that should resolve as structured `.ctx.md` files
