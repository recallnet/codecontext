# @recallnet/codecontext-cli

CLI for querying `@context` annotations in source code.

## Install

```bash
npm install -D @recallnet/codecontext-cli @recallnet/codecontext-parser
```

## Common commands

```bash
npx codecontext --scope src/file.ts
npx codecontext --diff HEAD src/file.ts
npx codecontext --report
npx codecontext --staged
```

## Packages

- `@recallnet/codecontext-cli`: CLI commands and repo scanning
- `@recallnet/codecontext-parser`: parser and staleness logic
- `@recallnet/codecontext-eslint-plugin`: ESLint integration
- `@recallnet/codecontext-tsdoc`: TSDoc tag definitions

## Docs

- Repo: https://github.com/recallnet/codecontext
- Full README: https://github.com/recallnet/codecontext/blob/main/README.md
