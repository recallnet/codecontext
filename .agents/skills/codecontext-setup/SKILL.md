---
name: codecontext-setup
description: >-
  Set up or repair codecontext adoption in a project. Use this whenever the user
  wants to add @context annotations to a repo, install the codecontext toolchain,
  update AGENTS.md guidance, improve agent workflows around decision capture, or
  audit whether an existing codecontext setup is coherent. Prefer this skill over
  vague "document the tool" work: it is specifically for making a repo actually
  usable with codecontext.
---

# Codecontext Setup

Set up `codecontext` so agents can use it without guessing.

The point of this skill is not just package installation. The real job is to
make the repo's agent contract coherent:

- the toolchain is installed where it belongs
- `AGENTS.md` tells agents when and how to use it
- inline `@context` is treated as the required structured layer
- supporting refs stay unconstrained and user-owned

Do not invent required sidecar document schemas. Do not require `.ctx.md`.
Refs can point to Markdown, HTML, text, diagrams, exported docs, or any other
resolvable file the repo uses.

## When to use

Use this skill when the user asks to:

- install or adopt `codecontext`
- update a repo's `AGENTS.md` or agent guidance around `@context`
- audit a project's current `codecontext` setup
- reconcile a mismatch between codecontext tooling and repo instructions
- improve how agents discover decisions, risks, assumptions, and history

## Outcome

By the end of this workflow, the repo should have:

- a clear `AGENTS.md` section for `codecontext`
- a sane CLI workflow for agents
- the right enforcement surface for the repo's languages and toolchain
- no misleading guidance about structured sidecar docs

## Workflow

### 1. Audit the current state

Inspect:

- package manager and workspace layout
- whether the repo already depends on `@recallnet/codecontext-cli`
- whether the repo already depends on `@recallnet/codecontext-eslint-plugin`
- whether the repo already has Python, Go, Rust, or other language-native
- whether the repo already has Python, Go, Ruby, Rust, or other language-native
  checkers where `codecontext` enforcement belongs
- whether ESLint is present and where its shared config lives
- whether `AGENTS.md` exists at repo root and in subtrees/worktrees
- whether existing agent docs already mention `@context`, `codecontext`, ADRs,
  `contexts/`, or decision logs

Look for the two common failure modes:

1. tool installed, but no agent workflow or guidance
2. guidance exists, but it is stale, contradictory, or points to a policy that
   does not exist

### 2. Decide the installation surface

Install the minimum useful surface:

- `@recallnet/codecontext-cli` when agents should run `--scope`, `--diff`, or
  `--report`
- `@recallnet/codecontext-eslint-plugin` when the repo uses ESLint and wants
  comment validation
- a language-native checker or analyzer when the repo's main enforcement
  surface is Python, Go, Rust, or something else outside ESLint
- `@recallnet/codecontext-parser` only if the repo has custom code that imports
  parser APIs directly

Do not add packages the repo is not going to use.

### 3. Fix `AGENTS.md` before or alongside package changes

`codecontext` setup is incomplete without agent instructions.

Every repo-level `AGENTS.md` section should cover:

- what `@context` is for
- when annotations are required
- a small preferred taxonomy
- the pre-edit and post-edit workflow
- what refs are and are not
- anti-patterns

If subtree `AGENTS.md` files point to a repo-level policy, make sure that
policy actually exists.

## Recommended `AGENTS.md` contract

Keep it short. A good section usually fits in 8-14 bullets.

Use something close to this:

```md
- **codecontext**: Use inline `@context` annotations for non-obvious,
  high-value reasoning that future edits could easily erase.
  - Required for:
    - critical decision logic and invariants
    - security-sensitive behavior and hard-won lessons
    - external integration quirks and contract mismatches
    - regression guards explaining why a simpler change would be wrong
  - Preferred forms: `@context decision`, `@context risk`,
    `@context requirement`, `@context history`
  - Keep notes short and specific: what is true, why it matters, and what
    would break if changed
  - Use `{@link ...}` for supporting material when helpful, but refs are just pointers
    to repo files or docs. Do not require any special doc schema.
  - Before editing critical files, run:
    `npx @recallnet/codecontext-cli --scope <file>`
  - After editing, run:
    `npx @recallnet/codecontext-cli --diff HEAD <file>`
  - For broader orientation in larger repos, run:
    `npx @recallnet/codecontext-cli --report`
  - Do not use `@context` for obvious narration, duplicated ADR prose, or
    generic comments.
```

Adjust the taxonomy only if the repo clearly needs more than the baseline
(`decision`, `risk`, `requirement`, `history`). Add extra categories sparingly.

## Guidance for repos with ADRs or large docs trees

If the repo already uses ADRs, plans, runbooks, or architecture docs:

- keep `@context` as the inline agent-facing layer
- treat refs as optional expansion targets
- do not tell agents to browse the entire docs tree by default
- do not mirror whole ADRs inline

The correct model is:

- `@context` carries the structured local signal
- refs point to arbitrary supporting material
- agents expand refs only when needed

## Refs policy

Be explicit:

- refs are allowed to point to `.md`, `.html`, `.txt`, diagrams, exports, or
  other repo artifacts
- refs are not required on every annotation
- refs should not impose a schema on the target file

Do not write guidance that implies:

- `.ctx.md` is required
- frontmatter is required
- the linked file must be machine-parseable

## CLI workflow guidance

Recommend these commands in agent docs when the CLI is installed:

```bash
npx @recallnet/codecontext-cli --scope path/to/file.ts
npx @recallnet/codecontext-cli --diff HEAD path/to/file.ts
npx @recallnet/codecontext-cli --report
```

Use `--report` for repo orientation and decision review. Use `--scope` and
`--diff` around concrete edits.

## Enforcement guidance

If the repo already has a shared ESLint config, integrate the plugin there.
Prefer enforcing syntax and stale/invalid ref checks centrally rather than
telling agents to self-police.

If the repo does not use ESLint, do not force it just for `codecontext`.
Prefer the native enforcement surface for the repo's actual stack:

- Python repo: native checker or PyPI-distributed tool
- Go repo: analyzer / `golangci-lint` integration
- Ruby repo: native checker gem or RuboCop-style integration
- Rust repo: crate / Clippy-style integration
- mixed or tool-agnostic repo: CLI workflow may be enough initially

The important question is not "did we install the ESLint plugin?"
It is "what actually enforces `@context` correctness in this ecosystem?"

## What to look for in a review

Flag these as setup defects:

- child `AGENTS.md` files pointing to a missing repo policy
- instructions that mention `@context` but give no workflow
- workflow guidance that ignores `--report` in large repos
- guidance that treats linked docs as required structured sidecars
- package installs without corresponding agent documentation
- documentation that tells agents to read giant ADR/doc trees by default

## Delivery

When you finish setup or audit work:

1. state what was installed or changed
2. call out any stale or contradictory `AGENTS.md` guidance you fixed
3. mention any remaining gaps
4. if you did not install an enforcement surface, explain why

## Default recommendation

If the repo has no existing `codecontext` guidance, prefer creating a
`codecontext-setup` section in the root `AGENTS.md` rather than scattering
instructions across multiple child docs first.
