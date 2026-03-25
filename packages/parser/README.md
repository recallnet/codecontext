# @recallnet/codecontext-parser

Core parser for `@context` tags and supporting refs.

## Install

```bash
npm install -D @recallnet/codecontext-parser
```

## Use

```ts
import { buildFileContext, parseContextTags } from "@recallnet/codecontext-parser";

const ctx = buildFileContext("src/file.ts");
console.log(ctx.tags);
```

## Docs

- Repo: https://github.com/recallnet/codecontext
- Full README: https://github.com/recallnet/codecontext/blob/main/README.md
- Spec: https://github.com/recallnet/codecontext/blob/main/packages/spec/SPEC.md
