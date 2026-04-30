# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

**Wave 1 (Foundation) complete.** The repo ships every contract, validator, template, archetype, permission rule, hook, server-provisioning script and systemd unit Wave 1 promises. Wave 2 (Intake MVP, Claude Desktop Project) and onwards will land on top of these foundations. Track waves in [docs/ROADMAP.md](docs/ROADMAP.md).

## What this project is

**Rychi Design Factory** — a three-system autonomous pipeline that takes a client web project from briefing to deployed site:

1. **Intake** — Claude Desktop Project that interviews Jirka during/after a client brief and emits a validated `spec/` directory.
2. **Factory** — Opencode-based agent runtime on a homelab Linux server that builds the site from spec.
3. **Dashboard** — Astro web app at `factory.digitaldesigner.cz` that visualises and controls the factory.

Single operator (Jirka, designer/account/ops in one person). Sequential execution in V1; parallelism deferred. Target: 4–8 projects/month with 60–80 % time savings vs. manual work.

## Document map (read order)

The docs form a deliberate pyramid. When asked about the project, read in this order:

1. **[docs/PROJECT-BRIEF.md](docs/PROJECT-BRIEF.md)** — top-of-pyramid: scope, principles, what's explicitly out of scope. Changes only on major pivots.
2. **[docs/GLOSSARY.md](docs/GLOSSARY.md)** — definitions of project-specific terms (Agent, Skill, Spec, Stack Track, JSON Signal, Blocker, …). Cross-referenced from other docs.
3. **[docs/PRD.md](docs/PRD.md)** — what the product does, user stories, acceptance criteria. Source of truth for "is feature X in V1?".
4. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — primary technical context: filesystem layout, stateless orchestrator pattern, JSON Signal contracts, hook-based security, agent catalog, stack catalog, design phase 2a/2b/2c, network topology, systemd services.
5. **[docs/DECISIONS.md](docs/DECISIONS.md)** — ADR log. Every architectural choice has rationale + alternatives considered.
6. **[docs/ROADMAP.md](docs/ROADMAP.md)** — implementation order across 6 waves (~4 months). Living document; update progress as work happens.

Plus three reference docs land in `docs/reference/` once Wave 1 is done:

- [docs/reference/spec-schema.md](docs/reference/spec-schema.md) — every spec field, cross-file integrity rules, validator usage.
- [docs/reference/state-management.md](docs/reference/state-management.md) — atomic writes, append-only logs, recovery scenarios.
- [docs/reference/permissions.md](docs/reference/permissions.md) — matching semantics, audit log shape, how to add an agent.

When changing direction, first check PROJECT-BRIEF's "Co explicitně neděláme" and "Klíčová architektonická rozhodnutí", then write a new ADR.

## Common commands

The repo is a `pnpm` project (Node ≥ 20.10, pnpm ≥ 8). After `pnpm install`:

| Command | What it does |
|---|---|
| `pnpm spec:validate <dir>` | Validate one client `spec/` directory against schemas + 11 cross-file integrity rules. |
| `pnpm spec:validate:examples` | Validate every `examples/specs/*/` (3 reference specs). |
| `pnpm validate:json <schema> <file>` | Generic JSON Schema validator (state, agent signals, blockers, …). |
| `pnpm validate:jsonl <schema> <file>` | Per-line JSONL validator (decisions log). |
| `pnpm validate:plan <plan.md>` | Markdown structural check for `plan.md`. |
| `pnpm validate:examples` | Master regression: every example against its schema. |
| `pnpm test:permissions` | 33 scenarios across the agent permission matrix. |

Templates have their own `package.json`; `cd templates/astro-sanity && pnpm install && pnpm dev` brings up the starter (mock content when `SANITY_PROJECT_ID` is unset).

## Binding principles (from PROJECT-BRIEF §"Klíčové principy")

These are not aspirations — they constrain implementation choices:

- **File-based state, no database.** All project state lives in files (JSON, Markdown, YAML). Git-versionable, human-readable, no migrations.
- **Stateless orchestrator.** Each iteration reads current state from disk; remembers nothing across runs. Enables crash recovery and manual intervention via direct file edits.
- **Deterministic where possible.** LLMs only for genuine judgment calls; routing, validation, budget checks live in code/scripts.
- **Security through infrastructure.** Permission enforcement happens in `PreToolUse` hooks (`.opencode/hooks/permission-gate.mjs`) reading `.opencode/permissions.yaml`, not in prompts. LLMs ignore prompt instructions under pressure; hooks don't.
- **Structured agent communication.** Agents talk to the orchestrator only via JSON Signals validated against schemas in `schemas/agent-signals/` (`AuditorResult`, `BuilderResult`, `Blocker`, `OrchestratorDecision`). No free text.
- **Universal agents + skill injection.** One `frontend-builder.md`, not `astro-builder.md` + `nextjs-builder.md`. Stack-specific knowledge lives in skills resolved from `project.stack.track` at spawn time. Adding a stack = writing a skill, not an agent.
- **Human-in-the-loop at decision gates.** Explicit gates before: spec approval, design direction choice, design approval, scope changes, production deploy. Automation handles execution, humans handle decisions.
- **Per-project isolation.** Every client gets its own directory, git repo, systemd unit (`factory@<project-id>.service`). Only `factory-core` is shared.
- **Eat your own dogfood.** The dashboard is built with the same Astro + Tailwind + shadcn stack as client sites — first real factory project = building the dashboard.

## Conventions to follow when editing docs

- **Language (ADR-0015):** Czech for user-facing prose in docs; English for technical artifacts (schemas, code identifiers, agent names, JSON keys, file paths). Existing docs follow this — match the tone of the file you're editing.
- **ADRs are immutable.** When superseding a decision, add a new ADR with status `Supersedes ADR-XXXX`. Never rewrite an existing one.
- **Scope creep goes to BACKLOG.** New ideas that surface mid-task belong in `BACKLOG.md` (per-project and in factory-core), not in the current step.
- **Cross-references use relative markdown links.** See how `ARCHITECTURE.md` and `GLOSSARY.md` link to each other — keep that style.
- **Each doc has a short "Účel tohoto dokumentu" header** explaining when to read it. Preserve that pattern.
- Commit-message style follows [conventions/commit-messages.md](conventions/commit-messages.md) — Conventional Commits, lowercase type, imperative subject under 72 chars.

## Repository layout

```
factory-core/
├── docs/                  # Diátaxis-structured documentation (concepts, reference, how-to, decisions)
├── .opencode/             # Opencode runtime config
│   ├── agents/            #   markdown agent definitions (Wave 3+ deliverable)
│   ├── commands/          #   slash commands (Wave 3+)
│   ├── hooks/             #   permission-gate.mjs + post-tool-use.mjs
│   ├── skills/            #   stack-specific (astro/, sanity/, …) + shared (figma-patterns/)
│   └── permissions.yaml   #   per-agent allow/deny matrix — security boundary
├── schemas/               # JSON Schemas: spec/, agent-signals/, state, plan-meta, decisions-log
├── archetypes/            # 5 archetype YAMLs (small-b2b-services, …)
├── templates/             # Per-stack starter projects (astro-sanity ships, others land per real demand)
├── known-patterns/        # Healer knowledge base (approved/, pending/) — Wave 3+ populates
├── conventions/           # Project-wide conventions (commit-messages.md, more land per need)
├── intake/                # Intake system prompt + supporting files (Wave 2)
├── tools/                 # CLI utilities (spec-validate, validate-json/jsonl/plan, test-permissions, lib.mjs)
├── scripts/               # Server provisioning (server-setup, install-cloudflared, install-tailscale)
├── systemd/               # Unit files (factory@.service, factory-dashboard.service, factory-monitor.service)
├── config/                # secrets.env.example template
├── examples/              # Reference inputs (specs/, state/, agent-signals/, decisions-log/, plan/)
└── stack-catalog.yaml     # Supported stack tracks
```

If a path appears in [ARCHITECTURE.md §2 "Filesystem layout"](docs/ARCHITECTURE.md) but not above, follow ARCHITECTURE — that's the canonical layout. Mismatches go in BACKLOG.

## Working in this repo

- **Editing schemas** — use `pnpm validate:examples` after every change; the regression catches inconsistencies between schemas, examples and `tools/spec-validate` cross-file rules.
- **Editing `.opencode/permissions.yaml`** — run `pnpm test:permissions`. Empty `deny:` arrays parse fine (the matcher handles `null`); a wildcard `deny: ["*"]` for an agent that *also* has an `allow` list is a bug (the test runner caught one in step 1.6 — see commit history).
- **Adding a new spec field** — update the `*.schema.json`, refresh the affected `examples/specs/*/`, document in [docs/reference/spec-schema.md](docs/reference/spec-schema.md), bump `meta.schema_version` if breaking.
- **Adding a new agent** — append to `.opencode/permissions.yaml`, add probes in `tools/test-permissions.mjs`, then write the agent markdown. Walkthrough in [docs/reference/permissions.md §6](docs/reference/permissions.md).
- **Server-side changes** — `scripts/*.sh` are idempotent. Walkthrough in [docs/how-to/server-setup.md](docs/how-to/server-setup.md). Don't expect them to run from this checkout — they target a clean homelab Linux server.
- **Secrets** — never commit. Live file lives at `~/.config/factory/secrets.env` (chmod 600). Template is [config/secrets.env.example](config/secrets.env.example). `.gitignore` covers `secrets.env` and `.env*` (except `.env.example`).
