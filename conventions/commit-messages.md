# Commit message conventions

We follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), with the type prefix lowercase and the description in the imperative mood (`add` not `added`).

## Format

```
<type>(<optional scope>): <short description>

<optional body>

<optional footer(s)>
```

Keep the subject line under 72 characters. Wrap the body at 80.

## Types

| Type | When to use |
|------|-------------|
| `feat` | New user-visible capability (agent, command, schema, page). |
| `fix` | Bug fix in code, schema, hook, or doc that misled. |
| `docs` | Documentation-only change. |
| `refactor` | Code/config change that does not alter behaviour. |
| `chore` | Tooling, deps, scaffolding, repo housekeeping. |
| `test` | Adding or fixing tests. |
| `perf` | Performance change without behaviour change. |
| `build` | Build system / dependency change (`package.json`, lockfile). |
| `ci` | CI workflow change. |
| `revert` | Reverts a previous commit. |

## Scope

Optional, lowercase. Useful values for this repo:

- `intake`, `factory`, `dashboard` — system the change targets.
- `schemas`, `agents`, `skills`, `hooks`, `permissions`, `archetypes`, `templates`, `tools` — area within `factory-core/`.
- `<stack-name>` (`astro-sanity`, `nextjs-sanity`, …) — when the change is stack-specific.

## Examples

```
feat(schemas): add stack.schema.json with track + cms required fields
fix(hooks): permission-gate.sh allow npm bin paths under workspace
docs: add ADR-0016 on parallel project execution
chore: scaffold factory-core directory layout per ARCHITECTURE §2.1
refactor(agents): split frontend-builder permissions out of inline list
```

## Breaking changes

Append `!` after the type/scope and add a `BREAKING CHANGE:` footer:

```
feat(schemas)!: rename `track` to `stack_track` in stack.yaml

BREAKING CHANGE: existing client specs must be migrated; see
docs/how-to/migrate-stack-yaml.md.
```

## What goes in commit messages, what goes in ADRs

A commit explains **what** changed and **why now**. An ADR (in [`docs/DECISIONS.md`](../docs/DECISIONS.md)) explains **why this approach** over alternatives, with reasoning that survives the commit. When in doubt, put the rationale in the ADR and link it from the commit body.

## Co-authoring

Pair work or AI-assisted changes that materially shaped the diff get a `Co-Authored-By:` trailer.
