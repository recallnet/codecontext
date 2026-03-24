export default {
  "**/*.{ts,tsx,js,jsx,mjs,cjs}": ["prettier --write --ignore-path .prettierignore"],
  "**/*.{json,md,yml,yaml}": ["prettier --write --ignore-path .prettierignore"],
  "packages/golangci-lint/**/*.go": [
    'sh -c \'cd packages/golangci-lint && gofmt -w $(printf "%s\\n" "$@" | sed "s#^packages/golangci-lint/##")\' --',
  ],
};
