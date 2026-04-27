# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

**Pre-implementation, docs-only.** The repo currently contains only `docs/` — no source code, no `package.json`, no build/test/lint commands yet. All work so far is design documentation describing what will be built. Do not invent commands or claim a build system exists.

## What this project is

**Rychi Design Factory** — a three-system autonomous pipeline that takes a client web project from briefing to deployed site:

1. **Intake** — Claude Desktop Project that interviews Jirka during/after a client brief and emits a validated `spec/` directory.
2. **Factory** — Opencode-based agent runtime on a homelab Linux server that builds the site from spec.
3. **Dashboard** — Astro web app at `factory.digitaldesigner.cz` that visualizes and controls the factory.

Single operator (Jirka, designer/account/ops in one person). Sequential execution in V1; parallelism deferred. Target: 4–8 projects/month with 60–80 % time savings vs. manual work.

## Document map (read order)

The docs form a deliberate pyramid. When asked about the project, read in this order:

1. **[docs/PROJECT-BRIEF.md](docs/PROJECT-BRIEF.md)** — top-of-pyramid: scope, principles, what's explicitly out of scope. Changes only on major pivots.
2. **[docs/GLOSSARY.md](docs/GLOSSARY.md)** — definitions of project-specific terms (Agent, Skill, Spec, Stack Track, JSON Signal, Blocker, …). Cross-referenced from other docs.
3. **[docs/PRD.md](docs/PRD.md)** — what the product does, user stories, acceptance criteria. Source of truth for "is feature X in V1?".
4. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — primary technical context: filesystem layout, stateless orchestrator pattern, JSON Signal contracts, hook-based security, agent catalog, stack catalog, design phase 2a/2b/2c, network topology, systemd services.
5. **[docs/DECISIONS.md](docs/DECISIONS.md)** — ADR log. Every architectural choice has rationale + alternatives considered.
6. **[docs/ROADMAP.md](docs/ROADMAP.md)** — implementation order across 6 waves (~4 months). Living document; update progress as work happens.

When changing direction, first check PROJECT-BRIEF's "Co explicitně neděláme" and "Klíčová architektonická rozhodnutí", then write a new ADR.

## Binding principles (from PROJECT-BRIEF §"Klíčové principy")

These are not aspirations — they constrain implementation choices:

- **File-based state, no database.** All project state lives in files (JSON, Markdown, YAML). Git-versionable, human-readable, no migrations.
- **Stateless orchestrator.** Each iteration reads current state from disk; remembers nothing across runs. Enables crash recovery and manual intervention via direct file edits.
- **Deterministic where possible.** LLMs only for genuine judgment calls; routing, validation, budget checks live in code/scripts.
- **Security through infrastructure.** Permission enforcement happens in `PreToolUse` hooks (`permission-gate.sh`) reading `permissions.yaml`, not in prompts. LLMs ignore prompt instructions under pressure; hooks don't.
- **Structured agent communication.** Agents talk to the orchestrator only via JSON Signals validated against schemas in `factory-core/schemas/agent-signals/` (`AuditorResult`, `BuilderResult`, `Blocker`, `OrchestratorDecision`). No free text.
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
- The repo's recent commit style is `docs: <short description>` (lowercase prefix, imperative). Match it.

## Anchors for forthcoming code (not yet present)

When implementation starts, these are the anchor paths the docs commit to. Don't invent variants:

- `factory-core/.opencode/{agents,commands,hooks,skills}/` — Opencode runtime config
- `factory-core/.opencode/permissions.yaml` — per-agent allow/deny matrix (the security boundary)
- `factory-core/schemas/{spec,agent-signals}/*.schema.json` — JSON Schemas
- `factory-core/stack-catalog.yaml`, `factory-core/archetypes/*.yaml`, `factory-core/templates/<stack>/`
- Per-project: `clients/<id>/{spec,client-assets,.factory-state}/` with `state.json`, `plan.md`, `decisions.jsonl`, `blockers/`, `logs/`, `artifacts/`, `workspace/`
- Tooling: `factory-core/tools/{factory,spec-validate,factory-new-project,factory-status,factory-resume}`

If asked to scaffold, follow [docs/ARCHITECTURE.md §2 "Filesystem layout"](docs/ARCHITECTURE.md) verbatim.
