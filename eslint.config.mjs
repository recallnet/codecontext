import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import security from "eslint-plugin-security";
import promise from "eslint-plugin-promise";
import noSecrets from "eslint-plugin-no-secrets";
import importX from "eslint-plugin-import-x";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "*.config.mjs",
      "**/tsup.config.ts",
      "vitest.config.ts",
    ],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript strict + stylistic
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["packages/*/test/*.test.ts"],
          defaultProject: "tsconfig.eslint.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // TypeScript rule overrides
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Unicorn plugin
  {
    plugins: { unicorn },
    rules: {
      "unicorn/prefer-node-protocol": "error",
      "unicorn/no-array-reduce": "warn",
      "unicorn/no-null": "off", // too aggressive for this project
      "unicorn/prevent-abbreviations": "off", // too aggressive
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
    },
  },

  // SonarJS plugin
  {
    plugins: { sonarjs },
    rules: {
      "sonarjs/cognitive-complexity": ["error", 15],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 3 }],
      "sonarjs/no-identical-functions": "error",
    },
  },

  // Security plugin
  {
    plugins: { security },
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-eval-with-expression": "error",
    },
  },

  // Promise plugin
  {
    plugins: { promise },
    rules: {
      "promise/always-return": "error",
      "promise/no-return-wrap": "error",
      "promise/param-names": "error",
      "promise/catch-or-return": "error",
      "promise/no-nesting": "warn",
    },
  },

  // No secrets plugin
  {
    plugins: { "no-secrets": noSecrets },
    rules: {
      "no-secrets/no-secrets": ["error", { tolerance: 4.5 }],
    },
  },

  // Import ordering (import-x)
  {
    plugins: { "import-x": importX },
    rules: {
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import-x/no-duplicates": "error",
      "import-x/no-self-import": "error",
    },
  },

  // General rules
  {
    rules: {
      "no-console": "warn",
      "no-debugger": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },

  // Test file overrides — relax strictness
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "no-console": "off",
      "sonarjs/no-duplicate-string": "off",
      "security/detect-object-injection": "off",
    },
  },

  // Prettier last (disables formatting rules)
  prettier
);
