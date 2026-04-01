# @recallnet/codecontext-eslint-plugin

ESLint rules for validating `@context` annotations and related freshness checks.

## Install

```bash
npm install -D @recallnet/codecontext-eslint-plugin @recallnet/codecontext-parser eslint
```

## Configure

```js
import codecontext from "@recallnet/codecontext-eslint-plugin";

export default [codecontext.configs.recommended];
```

## Rules

| Rule                          | Default | Description                                                     |
| ----------------------------- | ------- | --------------------------------------------------------------- |
| `context-hierarchy`           | error   | Type/subtype combinations must be valid                         |
| `valid-context-refs`          | error   | Local `{@link file:...}` targets must resolve to existing files |
| `require-context-for-complex` | warn    | Complex functions (cyclomatic > 5) should have `@context`       |
| `no-stale-context`            | error   | Verification dates too old, or code changed without date bump   |

## Docs

- Repo: https://github.com/recallnet/codecontext
- Full README: https://github.com/recallnet/codecontext/blob/main/README.md
