# @recallnet/codecontext-pi

`pi` steering extension for surfacing `@context` annotations when an agent reads
annotated code.

## Install

```bash
npm install @recallnet/codecontext-pi
```

## Use

Install it in `pi` from npmjs:

```bash
pi install @recallnet/codecontext-pi
```

The package exposes one extension entry:

- `dist/index.js`

It watches `read` tool results, detects inline `@context` annotations using
`@recallnet/codecontext-parser`, and sends an advisory steering reminder when
annotated code is loaded.

## Docs

- Repo: https://github.com/recallnet/codecontext
- Full README: https://github.com/recallnet/codecontext/blob/main/README.md
