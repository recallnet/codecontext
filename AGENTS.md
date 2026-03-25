# AGENTS

## Package Publishing

- This repo publishes packages through Changesets, not from every successful
  merge to `main`.
- The publish automation lives in
  `.github/workflows/publish-packages.yml`.
- The canonical public registry is npmjs, not GitHub Packages.
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
- For public installs, verify against npmjs with `npm view`, not GitHub
  Packages.
- If a package fix merged without a changeset, publishing will not happen until
  a new commit adds the missing changeset.
