# factory-core

Shared core of **Rychi Design Factory** — schemas, agent runtime config, skills, archetypes, templates and tooling that drive the autonomous web-build pipeline.

> **Status:** pre-implementation. The repo currently contains design documentation and the directory scaffolding committed by Wave 1 of the [roadmap](docs/ROADMAP.md). No agents run yet.

## What this is

Rychi Design Factory is a three-system pipeline:

1. **Intake** — a Claude Desktop Project that interviews the operator during/after a client brief and emits a validated `spec/` directory.
2. **Factory** — an Opencode agent runtime on a homelab Linux server that builds the website from spec.
3. **Dashboard** — a separate Astro web app at `factory.digitaldesigner.cz` that visualises and controls the factory.

`factory-core` (this repo) hosts the shared parts of systems 1 and 2: schemas, agent definitions, hooks, skills, archetypes, stack catalogue, templates and CLI tooling. The dashboard and each client project live in their **own repositories** by design (per-project isolation).

## Where to start

Read the docs in this order:

1. [`docs/PROJECT-BRIEF.md`](docs/PROJECT-BRIEF.md) — scope, principles, what's explicitly out of scope.
2. [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — definitions of project-specific terms.
3. [`docs/PRD.md`](docs/PRD.md) — what the product does, user stories, acceptance criteria.
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — primary technical context.
5. [`docs/DECISIONS.md`](docs/DECISIONS.md) — ADR log.
6. [`docs/ROADMAP.md`](docs/ROADMAP.md) — the 6-wave implementation plan.

For commit conventions see [`conventions/commit-messages.md`](conventions/commit-messages.md).

## Repository layout

```
factory-core/
├── docs/                  # Diátaxis-structured documentation
├── .opencode/             # Opencode runtime config (agents, hooks, skills, commands)
├── schemas/               # JSON Schemas: spec/, agent-signals/, state, plan, decisions-log
├── archetypes/            # Project archetypes (small-b2b, ecommerce-small, ...)
├── templates/             # Per-stack starter projects (astro-sanity, ...)
├── known-patterns/        # Healer knowledge base (approved/, pending/)
├── conventions/           # Project-wide conventions
├── intake/                # Intake system prompt + supporting files (Wave 2)
├── tools/                 # CLI utilities (factory, spec-validate, ...)
├── scripts/               # Server provisioning (server-setup, install-cloudflared, install-tailscale)
├── systemd/               # systemd unit files (factory@, factory-dashboard, factory-monitor)
├── config/                # Templates for runtime config (secrets.env.example)
└── stack-catalog.yaml     # Supported stack tracks (added in Wave 1, step 1.4)
```

This skeleton matches [`docs/ARCHITECTURE.md` §2.1](docs/ARCHITECTURE.md). Empty directories use `.gitkeep` placeholders until the relevant roadmap step populates them.

## Server-side mirror

The factory runtime expects this repo cloned at `~/factory-projects/factory-core/` on the homelab server. Full server preparation (factory user, cloudflared, systemd services) is described in [`docs/how-to/server-setup.md`](docs/how-to/server-setup.md). Three idempotent scripts cover provisioning:

```bash
sudo bash scripts/server-setup.sh         # factory user, deps, repo, secrets template
sudo bash scripts/install-cloudflared.sh  # tunnel, DNS, systemd
sudo bash scripts/install-tailscale.sh    # emergency SSH backup
```

## License

[WTFPL](LICENSE) — do what the fuck you want.
