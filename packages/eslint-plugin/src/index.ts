import type { ESLint } from "eslint";

import contextHierarchy from "./rules/context-hierarchy.js";
import noStaleContext from "./rules/no-stale-context.js";
import requireContextForComplex from "./rules/require-context-for-complex.js";
import validContextRefs from "./rules/valid-context-refs.js";

const plugin: ESLint.Plugin & { configs: Record<string, unknown> } = {
  meta: {
    name: "@recallnet/codecontext-eslint-plugin",
    version: "0.1.0",
  },
  rules: {
    "context-hierarchy": contextHierarchy,
    "valid-context-refs": validContextRefs,
    "require-context-for-complex": requireContextForComplex,
    "no-stale-context": noStaleContext,
  },
  configs: {},
};

plugin.configs["recommended"] = {
  plugins: {
    codecontext: plugin,
  },
  rules: {
    "codecontext/context-hierarchy": "error",
    "codecontext/valid-context-refs": "warn",
    "codecontext/require-context-for-complex": "warn",
    "codecontext/no-stale-context": "error",
  },
};

export default plugin;
