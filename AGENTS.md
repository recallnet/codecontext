# AGENTS

## codecontext

- Use inline `@context` annotations for non-obvious, high-value reasoning that
  future edits could easily erase.
- Required for:
  critical decision logic and invariants
  security-sensitive behavior and hard-won lessons
  external integration quirks and contract mismatches
  regression guards explaining why a simpler change would be wrong
- Preferred forms:
  `@context decision`
  `@context risk`
  `@context requirement`
  `@context history`
- Keep notes short and specific: what is true, why it matters, and what would
  break if changed.
- Use `{@link ...}` for supporting material when helpful. Refs are just
  pointers to repo files, URLs, skills, or docs. Do not require any special doc
  schema.
- Before editing critical files, run:
  `npx @recallnet/codecontext-cli --scope <file>`
- After editing, run:
  `npx @recallnet/codecontext-cli --diff HEAD <file>`
- For broader repo orientation, run:
  `npx @recallnet/codecontext-cli --report`
- Do not use `@context` for obvious narration, duplicated ADR prose, or
  generic comments.

## Package Publishing

- This repo publishes packages through Changesets, not from every successful
  merge to `main`.
- The publish automation lives in
  `.github/workflows/publish-packages.yml`.
- The only user-facing package registry for this repo is npmjs.
- Do not send users to GitHub Packages for install or version verification.
- npmjs publishing uses GitHub Actions trusted publishing via OIDC, not an
  `NPM_TOKEN` secret.
- That workflow only publishes when CI succeeds on `main` and there is at
  least one pending file in `.changeset/`.
- If there is no pending changeset, the workflow does nothing, even if code in
  a publishable package changed.

## What To Do When A Package Fix Must Ship

1. Add a changeset for each publishable package that needs a new release.
2. Commit and push the changeset with the code fix.
3. Wait for `CI` to pass on `main`.
4. Wait for `Publish Packages` to run after CI.
5. Verify the new version is actually on the registry before telling anyone
   the fix is published.

## Important Constraints

- `@recallnet/codecontext-cli` owns repo-wide file scanning and `--report`
  behavior. Parser releases do not ship CLI-only fixes.
- Do not close a bug as "published" just because the fix merged. Confirm the
  package version changed on the registry.
- For public installs and published-version checks, use npmjs with `npm view`.
- If a package fix merged without a changeset, publishing will not happen until
  a new commit adds the missing changeset.
