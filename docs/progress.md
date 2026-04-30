# Implementation Progress

**Účel tohoto dokumentu:** living progress tracker pro factory implementaci podle [ROADMAP.md](ROADMAP.md). Update na konci každé Wave a při slip / scope change. Detail per krok zůstává v ROADMAPu, tady jen aktuální milestone + lessons learned + handoff pro novou session.

---

## Current state: **Wave 2 (Intake MVP) ready to start**

**Wave 1 dokončena:** 2026-04-30  
**Wave 2 plánovaný start:** kdykoliv — neblokuje nic na serveru  
**Last commit:** `9fb3f8d fix(server): three small post-Wave-1 fixes from real provisioning`

---

## Completed waves

### Wave 1: Foundation ✅ Complete

**Started:** 2026-04-26  
**Completed:** 2026-04-30  
**Real duration:** 5 days (planned 14)  

7 kroků z ROADMAPu + 3 polish položky + reálné server provisioning. Faster than planned because schemas / validators / templates are well-bounded engineering work and the operator decisively picked options instead of bikeshedding.

**Klíčové deliverables:**

- 19 JSON Schemas (spec ×8, agent-signals ×4, state, plan-meta, decisions-log, plus 5 archetype YAMLs and stack-catalog).
- 8 CLI tools (spec-validate, validate-json/jsonl/plan, validate-examples.sh, test-permissions, lib.mjs).
- 23-agent permission matrix + 2 hooks (permission-gate.mjs, post-tool-use.mjs).
- Working `astro-sanity` template (Astro 5 + Tailwind 4 + Sanity client + shadcn/ui) — `pnpm dev` runs with mock content out of the box.
- 3 server provisioning scripts + 3 systemd unit files.
- 3 reference docs in `docs/reference/` (spec-schema, state-management, permissions).
- GitHub Actions CI (validate + template smoke test on every push).

**Server (homelab `skynetdev`, Ubuntu 24.04.4) provisioned:**

- `factory` user with lingering enabled, factory-core cloned, deps installed.
- `cloudflared` service running, tunnel `factory.digitaldesigner.cz` → `localhost:3000` returns HTTP 502 (no upstream yet — expected for Wave 1).
- Cloudflare Access policy "Operator only" allows `rychidesign@gmail.com` via One-time PIN.
- Tailscale up as emergency SSH backup.
- secrets.env at `/home/factory/.config/factory/secrets.env` populated with all runtime tokens.

**Lessons learned:**

- Real-server provisioning revealed three drift points (glob expansion in non-root sudo, `head -3 | pipefail` SIGPIPE, redundant `[Install]` on systemd template). Fixed in `9fb3f8d`. **Future waves: always do one real-environment dry-run before declaring "done".**
- Cloudflare Zero Trust UI was opaque to operator; API-driven Access setup (with a separate one-shot admin token) was much faster.
- The runtime `CLOUDFLARE_API_TOKEN` and the Access admin token are different concerns — don't merge scopes. Considered for an ADR if pattern recurs.
- 5 archetypes confidence levels: medium for `small-b2b-services` (operator's core clientele) and `portfolio-creative` (grounded in operator's own portfolio repo); low for `restaurant-hospitality`, `ecommerce-small`, `saas-landing`. Refine with real intakes per Wave 2.4 onwards.

**Open items for follow-up (BACKLOG):** see [BACKLOG.md](BACKLOG.md). ~30 entries, none blocking.

---

## Active wave

### Wave 2: Intake MVP 🚧 Pending start

**Planned duration:** 2 týdny per ROADMAP §"Wave 2: Intake MVP".  
**Runs in:** Claude Desktop Project, NOT on the server. No further server provisioning needed until Wave 3.

**Steps:**

- [ ] **Krok 2.1** — Intake system prompt (3 days). Output: `factory-core/intake/system-prompt.md` + `intake/conventions.md` + `intake/red-flags.md`. Pulls from the 5 archetype YAMLs + 8 spec schemas + 3 reference example specs already in repo.
- [ ] **Krok 2.2** — Claude Desktop Project setup (1 day). Create the Project, upload files, configure custom instructions in Czech.
- [ ] **Krok 2.3** — Workflow & transfer (2 days). `tools/factory-new-project` script + `docs/how-to/conduct-intake.md` + `docs/how-to/transfer-spec-to-server.md`.
- [ ] **Krok 2.4** — První reálný intake (2–3 days). Test on a real or realistic-fictional brief; capture lessons in `docs/intake-learnings.md`.

**Exit criteria:**

- Claude Desktop Project produces validated specs from test scenarios (passes `pnpm spec:validate`).
- Workflow guide exists and works.
- One real spec captured as test data for Wave 3.

**No external dependencies needed beyond what's already in `secrets.env`.**

---

## Pending waves

- **Wave 3** Factory Skeleton (3 weeks) — orchestrator V1, architect agents, minimal builders, deploy. First end-to-end run on staging URL.
- **Wave 4** Design Integration (3 weeks) — Figma MCP, design-director, figma-designer, figma-extractor. Production-quality output.
- **Wave 5** Dashboard + Autonomy (3 weeks) — dashboard repo, audits, Telegram bot, overnight autonomy test.
- **Wave 6** First real client (2–3 weeks) — paying / pilot client, lessons learned, post-mortem.

Realistic total V1: 4 months from kickoff (`dd88e70`, 2026-04-25). **5 days into ~17, on track.**

---

## Handoff for a new Claude Code session

If you're picking this up cold:

1. **Read [CLAUDE.md](../CLAUDE.md) first** — it's the project-level brief, has the doc read order, command table and binding principles.
2. **Memory is loaded automatically** — `~/.claude/projects/<encoded-path>/memory/` ships user profile, collaboration feedback, project status and infrastructure reference. The new session sees them at startup.
3. **Run `pnpm install && pnpm validate:examples && pnpm test:permissions`** to confirm nothing has drifted since the last session.
4. **Server access:** Claude Code Bash on this box runs as `rychi`. Sudo operations need to run from Jirka's SSH terminal (paste output back). Factory user files are read-only from Bash without sudo.
5. **The next concrete task is Wave 2 Krok 2.1 — Intake system prompt.** Open ROADMAP §"Wave 2" + the 5 archetype YAMLs + the 8 spec schemas. The prompt's job is to drive a Czech conversation with the operator during a client briefing and emit a multi-file spec that passes `pnpm spec:validate`.

---

## Changelog

- **2026-04-30** Wave 1 complete (commit `9fb3f8d` after `60e91c6` real provisioning closure). Wave 2 ready.
- **2026-04-25** Initial documentation package (`dd88e70`).
