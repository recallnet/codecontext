export default {
  "**/*.{ts,tsx,js,jsx,mjs,cjs}": ["prettier --write --ignore-path .prettierignore"],
  "**/*.{json,md,yml,yaml}": ["prettier --write --ignore-path .prettierignore"],
};
