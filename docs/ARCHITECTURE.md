# Rychi Design Factory — Architecture

**Version:** 1.0  
**Last updated:** 2026-04-25  
**Owner:** Jirka (Rychi Design)  
**Status:** Pre-implementation

---

## Účel tohoto dokumentu

ARCHITECTURE.md popisuje **jak je projekt postavený technicky**. Když 
implementuješ feature, najdeš tady patterns, contracts a structures, 
které musíš dodržet.

Pro **co produkt dělá** viz PRD.md. Pro **proč jsme zvolili konkrétní 
řešení** viz DECISIONS.md. Pro **definice pojmů** viz GLOSSARY.md.

Tento dokument je hlavní technický kontext pro Claude Code.

---

## 1. System overview

### 1.1 Three systems, one workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  INTAKE SYSTEM            FACTORY SYSTEM         DASHBOARD       │
│  ─────────────            ──────────────         ─────────       │
│                                                                  │
│  Claude Desktop           Linux server (homelab) Web app         │
│  Project                  ┌───────────────────┐  ┌─────────────┐ │
│                           │  Orchestrator     │  │ Astro       │ │
│  ┌──────────────┐         │  Agents pool      │  │ + React     │ │
│  │ System prompt│         │  Hooks layer      │  │ + Tailwind  │ │
│  │ Archetypes   │ spec/   │  Skills           │  │ + shadcn    │ │
│  │ Schemas      │ ──────> │  Known patterns   │  │             │ │
│  │ Examples     │         │  ──────────────   │  │ SSE stream  │ │
│  └──────────────┘         │  state.json       │<>│ from factory│ │
│                           │  plan.md          │  │             │ │
│                           │  workspace/       │  │             │ │
│                           └───────────────────┘  └─────────────┘ │
│                                                                  │
│  Output: spec/            Output: deployed       Output: visual  │
│                           web + artifacts        control + ops   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
        │                          │                       │
        │                          │                       │
        └────── git/scp ───────────┘                       │
                                   │                       │
                                   └─── files + SSE ───────┘
```

### 1.2 Communication patterns

**Intake → Factory:** Validated spec/ adresář přes git/scp. One-way.
**Factory ↔ Dashboard:** Filesystem (read state.json, plan.md, logs/) 
+ SSE stream pro live updates. Dashboard může triggerovat akce přes 
API → systemd commands.
**Factory → External:** Git (klientské repos), Cloudflare Pages (deploy), 
Sanity (CMS), Telegram (notifications).

### 1.3 Server topology

```
Homelab server (Linux):
├── ~/factory-projects/
│   ├── factory-core/                  # shared config, git repo
│   └── clients/
│       ├── acme-corp-2026/            # vlastní git repo
│       ├── bakery-xy-2026/            # vlastní git repo
│       └── ...
│
├── ~/factory-dashboard/               # dashboard app, vlastní git repo
│
├── ~/.config/factory/
│   └── secrets.env                    # API keys, chmod 600
│
└── /etc/systemd/system/
    ├── factory@.service               # template per projekt
    ├── factory-api.service            # dashboard backend
    ├── factory-dashboard.service      # dashboard frontend
    ├── factory-monitor.service        # heartbeat + Telegram
    └── cloudflared.service            # tunnel daemon
```

---

## 2. Filesystem layout

### 2.1 factory-core repository

```
factory-core/
├── README.md
├── LICENSE
├── .gitignore
├── package.json                        # CLI tools dependencies
├── pnpm-lock.yaml
│
├── docs/                               # Diátaxis structure
│   ├── PROJECT-BRIEF.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md (toto)
│   ├── DECISIONS.md
│   ├── GLOSSARY.md
│   ├── ROADMAP.md
│   ├── BACKLOG.md
│   ├── concepts/
│   │   ├── orchestrator.md
│   │   ├── healer.md
│   │   ├── stateless-pattern.md
│   │   └── ...
│   ├── reference/
│   │   ├── spec-schema.md
│   │   ├── state-schema.md
│   │   └── ...
│   ├── how-to/
│   │   ├── add-new-stack.md
│   │   ├── add-new-agent.md
│   │   └── ...
│   └── decisions/                      # individuální ADR soubory
│       ├── 0001-opencode-runtime.md
│       ├── 0002-stateless-orchestrator.md
│       └── ...
│
├── .opencode/                          # Opencode konfigurace
│   ├── agents/                         # agent definice
│   │   ├── orchestrator.md
│   │   ├── architect-structure.md
│   │   ├── architect-technical.md
│   │   ├── design-director.md
│   │   ├── figma-designer.md
│   │   ├── figma-extractor.md
│   │   ├── content-writer.md
│   │   ├── frontend-builder.md
│   │   ├── cms-builder.md
│   │   ├── auth-builder.md
│   │   ├── deployer.md
│   │   ├── design-auditor.md
│   │   ├── accessibility-auditor.md
│   │   ├── performance-auditor.md
│   │   ├── content-auditor.md
│   │   ├── route-auditor.md
│   │   ├── e2e-test-runner.md
│   │   ├── ui-consistency-auditor.md
│   │   ├── animation-polish-agent.md
│   │   ├── code-reviewer.md
│   │   ├── healer.md
│   │   ├── bootstrap-agent.md
│   │   └── spec-validator.md
│   │
│   ├── commands/                       # slash commands
│   │   ├── new-project.md
│   │   ├── validate-spec.md
│   │   └── ...
│   │
│   ├── hooks/                          # pre/post tool-use
│   │   ├── permission-gate.sh          # ÚSTŘEDNÍ — enforce permissions
│   │   ├── pre-write.sh                # validate write paths
│   │   ├── pre-bash.sh                 # validate bash commands
│   │   ├── post-tool-use.sh            # audit log, token counter
│   │   └── on-failure.sh               # crash handler
│   │
│   ├── skills/                         # capability packages
│   │   ├── astro/
│   │   │   ├── SKILL.md
│   │   │   ├── patterns.md
│   │   │   └── common-pitfalls.md
│   │   ├── nextjs/
│   │   ├── sveltekit/
│   │   ├── sanity/
│   │   │   ├── SKILL.md
│   │   │   ├── schema-patterns.md
│   │   │   └── groq-cookbook.md
│   │   ├── payload/
│   │   ├── tailwind/
│   │   ├── frontend-design/            # Anthropic skill (vendored)
│   │   ├── impeccable/                 # third-party skill
│   │   └── figma-patterns/             # custom skill
│   │       ├── SKILL.md
│   │       ├── learnings/
│   │       │   ├── pending/            # agent-generated, čeká review
│   │       │   └── approved/           # schválené patterns
│   │       └── README.md
│   │
│   ├── permissions.yaml                # per-agent allow/deny matrix
│   └── opencode.config.yaml            # Opencode runtime config
│
├── schemas/                            # JSON Schemas
│   ├── spec/                           # multi-file spec schemas
│   │   ├── meta.schema.json
│   │   ├── business.schema.json
│   │   ├── audience.schema.json
│   │   ├── goals.schema.json
│   │   ├── scope.schema.json
│   │   ├── stack.schema.json
│   │   ├── design-direction.schema.json
│   │   └── constraints.schema.json
│   ├── state.schema.json
│   ├── plan.schema.md                  # plan.md format spec
│   ├── agent-signals/                  # JSON Signal contracts
│   │   ├── auditor-result.schema.json
│   │   ├── builder-result.schema.json
│   │   ├── blocker.schema.json
│   │   └── orchestrator-decision.schema.json
│   └── decisions-log.schema.json
│
├── archetypes/                         # project archetypes
│   ├── small-b2b-services.yaml
│   ├── ecommerce-small.yaml
│   ├── portfolio-creative.yaml
│   ├── restaurant-hospitality.yaml
│   └── saas-landing.yaml
│
├── stack-catalog.yaml                  # supported stacks
│
├── templates/                          # starter projects per stack
│   ├── astro-sanity/                   # git submodule nebo vendored
│   ├── astro-payload/
│   ├── nextjs-sanity/
│   └── webflow-stub/
│
├── known-patterns/                     # healer knowledge base
│   ├── README.md
│   ├── pending/                        # navržené, čekají review
│   └── approved/                       # schválené patterns
│       ├── npm-install-failures.md
│       ├── sanity-schema-issues.md
│       ├── astro-build-errors.md
│       └── ...
│
├── conventions/                        # design + code patterns
│   ├── component-naming.md
│   ├── code-style.md
│   ├── commit-messages.md
│   └── tone-of-voice.md
│
└── tools/                              # CLI utilities
    ├── factory                         # main wrapper command
    ├── spec-validate
    ├── factory-new-project
    ├── factory-status
    └── factory-resume
```

### 2.2 Per-client project structure

```
clients/acme-corp-2026/
├── .git/                               # vlastní git repo
├── .gitignore
├── README.md                           # auto-generated
│
├── spec/                               # z intake (read-only po lock)
│   ├── meta.yaml
│   ├── brief.md
│   ├── business.yaml
│   ├── audience.yaml
│   ├── goals.yaml
│   ├── scope.yaml
│   ├── stack.yaml
│   ├── design-direction.yaml
│   └── constraints.yaml
│
├── client-assets/                      # z intake
│   ├── logo/
│   ├── photos/
│   ├── existing-brand-guide.pdf
│   └── reference-sites.md
│
├── intake-journal.md                   # audit trail z intake
│
├── .factory-state/                     # factory output
│   ├── state.json                      # current state (atomic writes)
│   ├── plan.md                         # living document
│   ├── decisions.jsonl                 # append-only decision log
│   ├── .locks                          # lock files (plan, design)
│   │
│   ├── blockers/                       # pending decisions
│   │   ├── B-001.json
│   │   └── B-002.json
│   │
│   ├── logs/                           # structured logs per agent
│   │   ├── orchestrator.jsonl
│   │   ├── frontend-builder.jsonl
│   │   ├── healer.jsonl
│   │   └── ...
│   │
│   ├── artifacts/                      # agent outputs
│   │   ├── architecture/
│   │   │   ├── sitemap.json
│   │   │   ├── content-model.json
│   │   │   └── technical-plan.md
│   │   ├── design/
│   │   │   ├── directions.json
│   │   │   ├── chosen-direction.txt
│   │   │   ├── design-tokens.json
│   │   │   ├── components-manifest.json
│   │   │   └── figma-link.txt
│   │   ├── audits/
│   │   │   ├── a11y-2026-04-25.json
│   │   │   ├── perf-2026-04-25.json
│   │   │   └── ...
│   │   ├── screenshots/
│   │   └── reports/
│   │
│   └── workspace/                      # actual web code
│       ├── package.json
│       ├── src/
│       ├── public/
│       └── ...
│
└── deploy-info.json                    # staging URL, production URL
```

### 2.3 Why filesystem and not database

Detail v ADR-0004. Shrnutí:
- Git-versionable (history, blame, branching)
- Human-readable (debugging without tools)
- Recovery-friendly (no DB corruption, no migrations)
- Zero setup (no DB server)
- LLM-friendly (agents read/write files natively)

Trade-off: žádné transactions napříč soubory. Řeší se atomic writes 
+ commit per iteration.

---

## 3. Stateless orchestrator pattern

### 3.1 Klíčový princip

Orchestrátor **si nepamatuje nic mezi iteracemi**. Každý run je čistý:

```
Iteration N:

 1. Read state.json
 2. Read plan.md (current phase, next task)
 3. Read last 5 entries z decisions.jsonl
 4. Read pending blockers
 5. Decide: spawn agent, advance phase, escalate, or pause
 6. Execute decision (spawn agent OR update state)
 7. Wait for agent result (if spawned)
 8. Validate result against JSON Signal schema
 9. Update state.json (atomic write)
10. Append decision to decisions.jsonl
11. Commit to git: "iter-N: <decision summary>"
12. End iteration
```

### 3.2 State.json schema

```json
{
  "schema_version": "1.0",
  "project_id": "acme-corp-2026",
  "status": "running",
  "current_phase": "build",
  "phases": {
    "bootstrap": { "status": "complete", "completed_at": "..." },
    "architecture": { "status": "complete", "completed_at": "..." },
    "design": {
      "status": "complete",
      "sub_phases": {
        "direction": { "status": "complete" },
        "figma_generation": { "status": "complete" },
        "lock_extract": { "status": "complete" }
      }
    },
    "foundation": { "status": "complete" },
    "content": { "status": "complete" },
    "build": { "status": "in_progress" },
    "qa": { "status": "pending" },
    "polish": { "status": "pending" },
    "deploy": { "status": "pending" }
  },
  "plan_progress": {
    "total_tasks": 47,
    "completed": 32,
    "in_progress": 1,
    "pending": 14
  },
  "active_work": {
    "agent": "frontend-builder",
    "task": "Build /services/consulting page",
    "started_at": "2026-04-25T14:32:00Z",
    "tokens_used_so_far": 8420,
    "estimated_remaining_tokens": 4000
  },
  "recent_iterations": [
    {
      "iteration": 86,
      "timestamp": "...",
      "agent_spawned": "frontend-builder",
      "task": "Build /about page",
      "result": "complete",
      "tokens": 12400,
      "duration_seconds": 92
    }
  ],
  "blockers": {
    "pending_count": 1,
    "pending_ids": ["B-002"]
  },
  "health": {
    "consecutive_failures": 0,
    "total_failures_session": 2,
    "budget_used_percent": 34,
    "tokens_used": 1240000,
    "tokens_budget": 5000000,
    "cost_used_usd": 2.40,
    "cost_budget_usd": 10.00
  },
  "last_iteration": 86,
  "last_updated": "2026-04-25T14:35:12Z"
}
```

### 3.3 Plan.md format

Markdown s checkboxes. Living document. Updated by orchestrator a builder agents.

```markdown
# Implementation Plan: Acme Corp 2026

**Generated:** 2026-04-23  
**Last updated:** 2026-04-25  
**Status:** Phase 5 (Build) in progress

## Phase 0: Bootstrap ✅ Complete

- [x] Validate spec
- [x] Initialize .factory-state/
- [x] Setup git repo
- [x] Generate skeleton plan.md

## Phase 1: Architecture ✅ Complete

- [x] Generate sitemap.json
- [x] Define content-model.json
- [x] Choose stack track (astro-sanity)
- [x] Document technical-plan.md

## Phase 2: Design ✅ Complete

### 2a: Direction
- [x] Generate 3 directions
- [x] HUMAN GATE: Direction chosen (B - Industrial Precision)

### 2b: Figma Generation
- [x] Foundation page (variables)
- [x] Components library (18 components)
- [x] Pages: Homepage, About, Services, Service detail, Cases, Case detail, Contact, ...
- [x] HUMAN GATE: Design approved

### 2c: Lock & Extract
- [x] Extract design-tokens.json
- [x] Extract components-manifest.json
- [x] Lock Figma file

## Phase 3: Foundation ✅ Complete

- [x] Scaffold from astro-sanity template
- [x] Apply design tokens to Tailwind config
- [x] Generate base layout
- [x] Setup Sanity client

## Phase 4: Content ✅ Complete

- [x] Generate Sanity schemas
- [x] Generate copy for all pages

## Phase 5: Build 🚧 In Progress

- [x] Build / (homepage)
- [x] Build /about
- [x] Build /services
- [x] Build /services/consulting
- [x] Build /services/development
- [x] Build /services/support
- [x] Build /team
- [x] Build /contact
- [x] Build /privacy
- [x] Build /terms
- [x] Build /case-studies (list)
- [x] Build /case-studies/ford
- [x] Build /case-studies/bosch
- [ ] **Build /case-studies/siemens** ← current
- [ ] Build /faq
- [ ] Build /blog (list)
- [ ] Build /careers

**Progress:** 13/17 pages built

## Phase 6: QA ⏸ Pending

- [ ] Route audit
- [ ] Accessibility audit
- [ ] Performance audit
- [ ] UI consistency audit
- [ ] Content audit
- [ ] E2E tests
- [ ] Code review

## Phase 7: Polish ⏸ Pending

- [ ] Animation suggestions
- [ ] HUMAN GATE: Animation approval
- [ ] Implement approved animations

## Phase 8: Deploy ⏸ Pending

- [ ] Deploy to staging
- [ ] HUMAN GATE: Staging approval
- [ ] Deploy to production
```

### 3.4 Decisions.jsonl format

Append-only JSONL. Každý řádek je jeden decision objekt.

```json
{"iter": 87, "ts": "2026-04-25T14:35:12Z", "decision": "spawn", "agent": "frontend-builder", "task": "Build /case-studies/siemens", "rationale": "Next pending task in plan, no blockers, budget OK"}
{"iter": 88, "ts": "2026-04-25T14:42:34Z", "decision": "agent_complete", "agent": "frontend-builder", "task": "Build /case-studies/siemens", "result_status": "complete", "tokens": 11200, "duration_s": 442}
{"iter": 89, "ts": "2026-04-25T14:42:35Z", "decision": "advance", "from_task": "Build /case-studies/siemens", "to_task": "Build /faq", "rationale": "Previous task complete, plan continues"}
```

Orchestrátor čte jen posledních ~5 entries, ne celý history. Stateless 
context engineering.

### 3.5 Recovery scenarios

**Crash mid-iteration:**  
State.json je atomic write (write to .tmp, rename). Pokud crash mezi 
read a write, state.json je v posledním známém valid stavu. Restart 
factory: orchestrátor přečte state, pokračuje.

**Agent process killed:**  
Orchestrátor detekuje timeout, zaloguje failure, spawnuje znovu nebo 
escalate na healer.

**Manual intervention:**  
Jirka edituje state.json přímo (přes dashboard nebo SSH). Restart 
factory: pokračuje od edited state.

**Total server outage:**  
State je v git. `git pull` na novém serveru, `factory resume <project>`, 
pokračuje.

---

## 4. Agent architecture

### 4.1 Universal agents + skill injection

Místo `astro-builder.md`, `nextjs-builder.md`, `sveltekit-builder.md` 
máme jeden `frontend-builder.md`, který dostává relevantní 
[Skill](GLOSSARY.md#skill) podle [Stack Track](GLOSSARY.md#stack-track) 
projektu.

**Důvod:** Přidání nového stacku = napsat skill, ne napsat agent. 
Detail v ADR-0006.

### 4.2 Agent file structure

```markdown
---
name: frontend-builder
description: Builds frontend pages according to project stack
model: opencode/minimax-m2.7
fallback_model: opencode/minimax-m2.5
skills:
  - "{project.stack.track}"        # dynamicky injektováno
  - "frontend-design"               # always
  - "tailwind"                      # always
permissions: frontend-builder       # reference do permissions.yaml
budget:
  max_tokens_per_invocation: 80000
  max_duration_minutes: 15
  max_retries: 3
---

# Frontend Builder

## Role

You are a frontend specialist responsible for building one page or 
component at a time according to the project's design system and 
architecture.

## Process

1. Read the assigned task from your input
2. Read relevant artifacts:
   - design-tokens.json (always)
   - components-manifest.json (always)
   - sitemap.json (for navigation context)
   - relevant Figma frame ID (for visual reference)
3. Read the relevant Figma frame via Figma MCP for visual ground truth
4. Build the page/component using:
   - Tailwind classes mapped to design tokens
   - Components from components-manifest only (no new components)
   - Naming convention strictly enforced
5. Validate locally (build succeeds, types check)
6. Return JSON Signal with result

## Constraints

- Use ONLY components listed in components-manifest.json
- If you need a component that doesn't exist, return blocker signal
- Don't modify spec, design tokens, or other agents' artifacts
- Don't push to remote git (local commits only)

## Output (JSON Signal)

Required schema: agent-signals/builder-result.schema.json

Example:
{
  "status": "complete",
  "artifacts_created": ["src/pages/about.astro"],
  "tests_passed": true,
  "summary": "Built /about page with team grid and company timeline",
  "next_suggested_action": "continue-plan"
}

## Error handling

- Build fails → return status: "failed" with error details
- Missing component → return blocker (type: missing-component)
- Budget exceeded → return status: "partial" with progress so far
```

### 4.3 Agent lifecycle

```
Orchestrator iteration
    ↓
Decide: spawn frontend-builder for task X
    ↓
Inject context:
  - System prompt (from frontend-builder.md)
  - Skills (resolved from project.stack.track)
  - Task description
  - Required artifacts (design-tokens, manifest, sitemap)
  - Permission constraints (from permissions.yaml)
    ↓
Spawn Opencode agent process
    ↓
Agent runs:
  - Reads context
  - Performs tool calls (with hook validation)
  - Generates artifacts
  - Returns JSON Signal
    ↓
Orchestrator validates signal
    ↓
Orchestrator updates state, plan, logs
    ↓
End iteration
```

### 4.4 Agent communication: JSON Signals

**Princip:** Žádný volný text mezi agenty a orchestrátorem. Vše JSON 
podle schema.

**Signal types:**

```typescript
// Auditor result
type AuditorResult = {
  status: "passed" | "failed" | "warning";
  findings: Array<{
    severity: "critical" | "major" | "minor";
    category: string;
    message: string;
    location?: string;
    suggested_fix?: string;
  }>;
  metadata: {
    agent: string;
    duration_seconds: number;
    tokens_used: number;
  };
}

// Builder result
type BuilderResult = {
  status: "complete" | "partial" | "failed";
  artifacts_created: string[];
  tests_passed: boolean;
  summary: string;
  next_suggested_action: "continue-plan" | "run-audit" | null;
  error?: {
    type: string;
    message: string;
    recovery_attempted: boolean;
  };
}

// Blocker
type Blocker = {
  blocker_id: string;
  type: 
    | "design-approval-needed"
    | "copy-variants" 
    | "missing-info"
    | "scope-change"
    | "missing-component";
  severity: "blocks-phase" | "blocks-project" | "informational";
  description: string;
  options?: BlockerOption[];
  context_files: string[];
  created_at: string;
}

// Orchestrator decision
type OrchestratorDecision = {
  action: "spawn" | "advance-phase" | "escalate" | "pause" | "complete";
  // For spawn:
  agent?: string;
  task?: string;
  task_id?: string;
  // For advance:
  from_phase?: string;
  to_phase?: string;
  // For escalate:
  level?: 1 | 2 | 3;
  reason?: string;
  // Always:
  rationale: string;
  iteration: number;
  timestamp: string;
}
```

Schemas v `factory-core/schemas/agent-signals/`. Validovány pomocí 
ajv při každém receive.

### 4.5 Agent catalog (V1)

| Agent | Role | Model | Phases |
|---|---|---|---|
| orchestrator | Workflow control | GLM-5.1 | All |
| bootstrap-agent | Project init | MiniMax M2.5 | 0 |
| spec-validator | Schema validation | MiniMax M2.5 | 0 |
| architect-structure | Sitemap, content model | GLM-5.1 | 1 |
| architect-technical | Stack confirmation, deps | GLM-5.1 | 1 |
| design-director | 3 directions | Kimi K2.5 | 2a |
| figma-designer | Generate Figma | Gemini 3.1 Pro | 2b |
| figma-extractor | Extract tokens | MiniMax M2.5 | 2c |
| content-writer | Copy generation | Kimi K2.5 | 4 |
| frontend-builder | Page/component build | MiniMax M2.7 | 3, 5 |
| cms-builder | CMS schemas | MiniMax M2.7 | 3 |
| auth-builder | Auth setup (if needed) | GLM-5.1 | 3 |
| design-auditor | Visual consistency | Kimi K2.5 | 5, 6 |
| accessibility-auditor | a11y check | MiniMax M2.5 | 6 |
| performance-auditor | Lighthouse | Qwen3.5 Plus | 6 |
| content-auditor | Tone, grammar | Kimi K2.5 | 6 |
| route-auditor | Links, 404s | MiniMax M2.5 | 6 |
| ui-consistency-auditor | Cross-page | Kimi K2.5 | 6 |
| e2e-test-runner | Playwright | MiniMax M2.5 | 6 |
| code-reviewer | Code quality | MiniMax M2.7 | 6 |
| animation-polish-agent | Animation suggestions | Kimi K2.5 | 7 |
| deployer | CF Pages / Vercel | MiniMax M2.5 | 8 |
| healer | Recovery, self-improve | GLM-5.1 | All (on-demand) |

---

## 5. Hook-based security

### 5.1 Princip: defense through infrastructure

LLM pod tlakem ignorují instrukce v promptech. Bezpečnost musí být 
**enforced před každým tool call**, ne v promptu.

Detail v ADR-0005.

### 5.2 Hook execution flow

```
Agent attempts tool call (e.g., Write to /etc/passwd)
    ↓
Opencode invokes pre-tool-use hooks:
    ↓
permission-gate.sh:
  - Reads FACTORY_AGENT env var (set by orchestrator)
  - Reads permissions.yaml
  - Checks if agent X can perform tool Y on resource Z
  - If allowed: exit 0 (tool proceeds)
  - If denied: exit 1 + log + signal orchestrator
    ↓
post-tool-use.sh:
  - Logs tool call to audit log
  - Updates token counter
  - Updates cost tracker
```

### 5.3 Permission matrix

```yaml
# factory-core/.opencode/permissions.yaml

agents:
  orchestrator:
    write:
      allow:
        - ".factory-state/state.json"
        - ".factory-state/plan.md"
        - ".factory-state/decisions.jsonl"
        - ".factory-state/logs/orchestrator.jsonl"
        - ".factory-state/blockers/**"
      deny:
        - "spec/**"
        - ".factory-state/workspace/**"
        - ".factory-state/artifacts/**"
    bash:
      allow:
        - "git status"
        - "git log"
        - "ls"
        - "cat"
        - "systemctl status"
      deny:
        - "*"
  
  frontend-builder:
    write:
      allow:
        - ".factory-state/workspace/**"
        - ".factory-state/artifacts/screenshots/**"
        - ".factory-state/logs/frontend-builder.jsonl"
      deny:
        - "spec/**"
        - ".factory-state/state.json"
        - ".factory-state/plan.md"
        - ".factory-state/decisions.jsonl"
    bash:
      allow:
        - "npm *"
        - "npx *"
        - "pnpm *"
        - "git add"
        - "git commit"
        - "ls"
        - "cat"
      deny:
        - "git push"
        - "npm publish"
        - "rm -rf"
        - "sudo *"
        - "curl *"
        - "wget *"
  
  design-auditor:
    write:
      allow:
        - ".factory-state/artifacts/audits/**"
        - ".factory-state/artifacts/screenshots/**"
        - ".factory-state/logs/design-auditor.jsonl"
      deny:
        - ".factory-state/workspace/**"
        - "spec/**"
    bash:
      allow:
        - "npx playwright *"
        - "ls"
        - "cat"
      deny:
        - "*"
  
  # ... ostatní agenti
  
  default:                              # fallback pro neznámé agenty
    write:
      deny: ["*"]
    bash:
      deny: ["*"]
```

### 5.4 Hook implementation outline

```bash
#!/bin/bash
# factory-core/.opencode/hooks/permission-gate.sh

set -euo pipefail

AGENT="${FACTORY_AGENT:-default}"
TOOL="${OPENCODE_TOOL_NAME}"
RESOURCE="${OPENCODE_TOOL_RESOURCE}"
PERMISSIONS_FILE="${FACTORY_CORE}/.opencode/permissions.yaml"

# Use yq to query permissions
ALLOW_PATTERNS=$(yq ".agents.${AGENT}.${TOOL}.allow[]" "${PERMISSIONS_FILE}")
DENY_PATTERNS=$(yq ".agents.${AGENT}.${TOOL}.deny[]" "${PERMISSIONS_FILE}")

# Check deny first (deny wins)
for pattern in ${DENY_PATTERNS}; do
  if [[ "${RESOURCE}" == ${pattern} ]]; then
    echo "DENIED: ${AGENT} cannot ${TOOL} on ${RESOURCE} (matched deny: ${pattern})" >&2
    # Log to audit
    echo "{\"ts\":\"$(date -Iseconds)\",\"agent\":\"${AGENT}\",\"tool\":\"${TOOL}\",\"resource\":\"${RESOURCE}\",\"result\":\"denied\"}" \
      >> "${FACTORY_AUDIT_LOG}"
    exit 1
  fi
done

# Check allow
for pattern in ${ALLOW_PATTERNS}; do
  if [[ "${RESOURCE}" == ${pattern} ]]; then
    # Log to audit
    echo "{\"ts\":\"$(date -Iseconds)\",\"agent\":\"${AGENT}\",\"tool\":\"${TOOL}\",\"resource\":\"${RESOURCE}\",\"result\":\"allowed\"}" \
      >> "${FACTORY_AUDIT_LOG}"
    exit 0
  fi
done

# Default: deny
echo "DENIED: ${AGENT} has no allow rule for ${TOOL} on ${RESOURCE}" >&2
exit 1
```

---

## 6. Stack catalog

### 6.1 Stack-catalog.yaml structure

```yaml
# factory-core/stack-catalog.yaml

stacks:
  astro-sanity:
    type: "content-static"
    description: "Marketing weby, blog, portfolia. Default content track."
    best_for:
      - marketing
      - portfolio
      - docs
      - blog
      - b2b-services
      - small-firm
    required_skills:
      - astro
      - sanity
      - tailwind
      - frontend-design
    deployment:
      preferred: cloudflare-pages
      alternatives: [vercel, netlify]
    template_repo: "templates/astro-sanity"
    cms:
      type: hosted
      provider: sanity
      free_tier_sufficient_for:
        max_documents: 10000
        max_users: 3
        max_api_calls_per_month: 100000
  
  astro-payload:
    type: "content-static"
    description: "Self-hosted CMS, plná kontrola dat. Pro klienty 
      vyžadující on-premise data nebo specific compliance."
    best_for:
      - data-sensitive-clients
      - clients-with-it-team
      - large-content-volumes
    required_skills:
      - astro
      - payload
      - tailwind
      - frontend-design
    deployment:
      preferred: vercel
      alternatives: [railway, self-hosted]
    template_repo: "templates/astro-payload"
    cms:
      type: self-hosted
      provider: payload
      hosting_required: true
      hosting_cost_estimate_monthly: 20-40
  
  nextjs-sanity:
    type: "content-dynamic"
    description: "Marketing + portál s auth. Pro projekty s gated 
      content nebo member areas."
    best_for:
      - marketing-with-portal
      - member-area
      - gated-content
    required_skills:
      - nextjs
      - sanity
      - clerk
      - tailwind
    deployment:
      preferred: vercel
      alternatives: [cloudflare-pages]
    template_repo: "templates/nextjs-sanity"
    auth:
      provider: clerk
      free_tier_users: 10000
  
  webflow:
    type: "no-code"
    description: "Klient chce self-edit přes vizuální editor. V1 
      placeholder, real implementation post-V1."
    best_for:
      - clients-wanting-full-control
      - simple-marketing-without-cms
    required_skills:
      - webflow-api
    deployment:
      preferred: webflow-hosting
    template_repo: "templates/webflow-stub"
    status: "v1-placeholder"
```

### 6.2 Stack selection process

1. **Architect agent** čte spec.yaml a stack-catalog.yaml
2. Pokud `spec/stack.yaml` má `track: <specific>`, použije se ten
3. Pokud ne, architect vybere podle:
   - Archetype matching
   - Required features (auth, e-commerce, atd.)
   - Best-for keywords
4. Architect zapisuje rationale do `.factory-state/artifacts/architecture/technical-plan.md`
5. Spec.yaml se updatuje s chosen track + lock

### 6.3 Adding new stack

How-to dokument: `docs/how-to/add-new-stack.md`. Steps:

1. Vytvořit `templates/<new-stack>/` (real Astro/Next.js/whatever skeleton)
2. Vytvořit `.opencode/skills/<new-stack>/SKILL.md`
3. Přidat entry do `stack-catalog.yaml`
4. Update `permissions.yaml` pokud builder potřebuje nové bash commandy
5. Test na fiktivním projektu
6. ADR pokud rozhodnutí stack-related

---

## 7. Design phase architecture

### 7.1 Three sub-phases

**Phase 2a: Direction generation**
- Input: spec/design-direction.yaml + reference sites scraping
- Agent: design-director
- Output: 3 direction proposals (prose + moodboard images)
- Human gate: Jirka chooses one direction (or iterate)

**Phase 2b: Figma generation**
- Input: chosen direction + spec/scope.yaml (sitemap)
- Agent: figma-designer
- Output: complete Figma file:
  - Foundation page (variables: colors, typography, spacing, ...)
  - Components page (atoms, molecules, organisms)
  - Pages page (every page from sitemap)
- Human gate: Jirka reviews in Figma, edits, approves

**Phase 2c: Lock & extract**
- Input: approved Figma file URL
- Agent: figma-extractor
- Output:
  - design-tokens.json
  - components-manifest.json
  - figma-link.txt (for build phase reference)
- Lock: Figma file marked, plan.md design phase complete

### 7.2 Figma file structure (generated)

```
Figma file: "Acme Corp Design System"
├── 1-Brand-Guidelines             (auto-populated from direction)
├── 2-Foundation
│   ├── Color variables
│   ├── Typography styles
│   ├── Spacing scale
│   ├── Effects (shadows, etc.)
│   └── Grid + breakpoints
├── 3-Components
│   ├── shadcn-base/               (imported kit)
│   ├── heroes/
│   ├── feature-grids/
│   ├── cards/
│   ├── ctas/
│   ├── navigation/
│   └── footer/
├── 4-Templates
│   ├── marketing-landing
│   ├── content-page
│   └── listing-page
└── 5-Pages
    ├── Homepage
    ├── About
    ├── Services
    ├── Service detail (template)
    ├── Case studies (list)
    ├── Case study detail (template)
    ├── Contact
    └── ...
```

### 7.3 Naming convention contract

```
Figma component name    →    Code component name
Button/Primary/Large    →    <Button variant="primary" size="lg" />
Hero/Centered/Image     →    <HeroCentered withImage />
Card/Service            →    <ServiceCard />
Nav/Main                →    <MainNav />
```

Validátor: `tools/validate-naming` checkuje korespondence Figma ↔ kód. 
Mismatch = blocker.

### 7.4 Self-improvement loop pro figma-patterns

Agent učení popsáno v ADR-0011. Mechanika:

```
figma-designer dokončí projekt
    ↓
Po úspěchu: figma-designer reflektuje:
"Jaký pattern jsem objevil, co stojí za zapamatování?"
    ↓
Návrhy do figma-patterns/learnings/pending/<pattern-name>.md
    ↓
Dashboard zobrazí "N pending patterns"
    ↓
Jirka review → approve/reject/edit
    ↓
Approved patterns → figma-patterns/learnings/approved/
    ↓
Příští figma-designer run je má v skill kontextu
```

Stejný pattern platí pro known-patterns u healera.

---

## 8. Self-healing architecture

### 8.1 Escalation levels

```
Issue detected
    ↓
Level 0: Auto-resolve
  - Agent has decide-then-document instruction
  - For minor issues: agent decides, documents, continues
  - Example: "broken import → fix import path"
    ↓ (if can't resolve)
Level 1: Healer
  - Healer agent invoked
  - Reads known-patterns/approved/
  - Tries matching patterns
  - If fix → apply, log, continue
  - If no match → tries reasoning approach
    ↓ (if can't resolve)
Level 2: Async digest
  - Log to digest queue
  - Continue with other tasks if possible
  - Daily morning email/Telegram with digest
  - Jirka reviews when available
    ↓ (if blocking)
Level 3: Sync Telegram
  - Immediate Telegram alert
  - Factory pauses (or continues parallel work)
  - Jirka responds via dashboard or Telegram
```

### 8.2 Known-patterns library

```
factory-core/known-patterns/
├── approved/
│   ├── npm-install-eperm-error.md
│   ├── sanity-cors-issue.md
│   ├── astro-build-out-of-memory.md
│   ├── tailwind-class-not-applied.md
│   └── ...
└── pending/                           # waiting for Jirka review
    └── ...
```

Each pattern:

```markdown
---
id: pattern-001
name: "npm install EPERM error"
discovered_at: 2026-04-15
discovered_by: healer
confidence: high
applies_to: [astro-sanity, astro-payload, nextjs-sanity]
---

# NPM Install EPERM Error

## Symptom
`npm install` fails with `EPERM: operation not permitted, mkdir '/path/node_modules/.cache'`

## Root cause
Permission issue with .cache directory, often from previous run as 
different user or corrupted permissions.

## Resolution
1. Remove node_modules and package-lock
2. Clear npm cache: `npm cache clean --force`
3. Re-run install with `--no-cache` flag if persists
4. If still fails: check directory ownership

## Validation
After fix, `npm install` completes without error and `node_modules/` 
populated.

## Confidence
High — applied successfully in 8/8 cases.
```

### 8.3 Self-improvement loop

```
Healer encounters unknown problem
    ↓
Healer reasons through resolution
    ↓
If successful resolution:
  Healer writes proposed pattern to known-patterns/pending/
    ↓
Dashboard surface: "1 new pattern proposed for review"
    ↓
Jirka reviews:
  - Approve → moves to approved/
  - Edit + approve → edited version to approved/
  - Reject → deletes from pending/
    ↓
Approved patterns immediately available for next runs
```

---

## 9. Budget and cost controls

### 9.1 Budget hierarchy

```
Project budget (constraints.yaml)
  - max_tokens_total: 5000000
  - max_dollar_cost: 10.00
  - max_iterations: 300
  - max_duration_hours: 48
  - max_consecutive_failures: 5
    ↓
Agent budget (per agent definition)
  - max_tokens_per_invocation: 80000
  - max_retries: 3
  - max_duration_minutes: 15
    ↓
Auto-actions:
  - 75% project budget  → Level 2 notification
  - 95% project budget  → Level 3 notification + pause
  - 100% project budget → auto-stop
  - 5 consecutive failures → auto-stop after healing attempts
  - 48h wall clock → auto-stop
```

### 9.2 Cost tracking implementation

Every API call logged:

```json
{
  "timestamp": "2026-04-25T14:32:01Z",
  "project_id": "acme-corp-2026",
  "agent": "frontend-builder",
  "task_id": "build-services-page",
  "provider": "opencode",
  "model": "minimax-m2.7",
  "input_tokens": 8400,
  "output_tokens": 1240,
  "cost_usd": 0.012,
  "cache_hit": false
}
```

Logs aggregated to `factory-logs/cost.jsonl`. Dashboard reads, 
aggregates, visualizes.

---

## 10. Network architecture

### 10.1 No open ports

Server has zero public open ports except SSH (key-only).

```
Internet
    ↓
Cloudflare DNS (digitaldesigner.cz on Cloudflare)
    ↓
    ├── digitaldesigner.cz → Cloudflare Pages (portfolio, separate)
    └── factory.digitaldesigner.cz → Cloudflare Tunnel
            ↓ (encrypted outbound)
        Homelab server:
            ├── cloudflared (outbound to CF)
            ├── localhost:3000 (dashboard frontend)
            ├── localhost:3001 (dashboard API)
            ├── localhost:3002 (factory monitor)
            └── localhost:*    (per-project dev servers, ephemeral)
```

### 10.2 Cloudflare Access auth

```
User → factory.digitaldesigner.cz
    ↓
Cloudflare Access policy check:
  - Allowed emails: jirka@..., team@...
  - Identity provider: Google
    ↓
    ├── Allowed → request proxied to localhost:3000
    └── Denied  → 403, Cloudflare login screen
```

Free tier: 50 users. Sufficient for V1+V2.

### 10.3 Tailscale backup access

For emergency access if Cloudflare fails or for SSH:

- Server has tailscale daemon
- Jirka's laptop, phone in same tailnet
- Private IPs in 100.x.x.x range
- SSH via tailscale: `ssh jirka@homelab-server` (using MagicDNS)

---

## 11. Dashboard architecture

### 11.1 Tech stack

- **Astro 5** (hybrid mode: static marketing + SSR app routes)
- **React islands** for interactive components
- **Tailwind 4** + **shadcn/ui**
- **Nanostores** for client state
- **Server-Sent Events** for live updates
- **systemd** service: factory-dashboard.service

### 11.2 Component structure

```
factory-dashboard/
├── src/
│   ├── pages/
│   │   ├── index.astro                # project list (SSR)
│   │   ├── projects/
│   │   │   └── [id].astro             # project detail (SSR + islands)
│   │   ├── api/
│   │   │   ├── projects.ts            # GET list
│   │   │   ├── projects/[id]/
│   │   │   │   ├── state.ts           # GET current state
│   │   │   │   ├── stream.ts          # SSE endpoint
│   │   │   │   ├── start.ts           # POST start
│   │   │   │   ├── pause.ts           # POST pause
│   │   │   │   ├── resume.ts          # POST resume
│   │   │   │   ├── stop.ts            # POST stop
│   │   │   │   └── blockers/[bid]/resolve.ts
│   │   │   ├── system/
│   │   │   │   └── metrics.ts         # CPU/RAM/disk
│   │   │   └── webhooks/
│   │   │       └── telegram.ts        # bot integration
│   │   └── auth/
│   │       └── ...                    # CF Access integration
│   │
│   ├── islands/                       # React components
│   │   ├── ProjectList.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── AgentGraph.tsx
│   │   ├── LiveEventFeed.tsx
│   │   ├── ServerMetrics.tsx
│   │   ├── BlockerResolver/
│   │   │   ├── CopyVariants.tsx
│   │   │   ├── DesignVariants.tsx
│   │   │   ├── MissingInfo.tsx
│   │   │   └── ScopeChange.tsx
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── factory-state.ts           # read state.json
│   │   ├── factory-control.ts         # systemctl wrapper
│   │   ├── sse.ts                     # SSE utilities
│   │   ├── telegram.ts                # bot client
│   │   └── ...
│   │
│   ├── stores/                        # nanostores
│   │   ├── projects.ts
│   │   ├── activeProject.ts
│   │   └── ui.ts
│   │
│   └── styles/
│       └── globals.css
│
├── public/
├── astro.config.mjs
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 11.3 Data flow: project detail page

```
Browser request: /projects/acme-corp-2026
    ↓
Astro SSR:
  - Read clients/acme-corp-2026/.factory-state/state.json
  - Read plan.md (parsed)
  - Read recent decisions
  - Render shell
    ↓
Browser receives HTML, hydrates islands
    ↓
LiveEventFeed island connects to SSE:
  GET /api/projects/acme-corp-2026/stream
    ↓
Server: SSE endpoint
  - Tails .factory-state/logs/orchestrator.jsonl
  - On new line: emit "event" SSE message
  - Heartbeat every 30s
    ↓
Browser: receives events, updates UI
```

### 11.4 Control flow: start project

```
User clicks "Start" button
    ↓
POST /api/projects/acme-corp-2026/start
    ↓
Server:
  - Validate request (CF Access verified user)
  - Run: systemctl --user start factory@acme-corp-2026
  - Wait for service active
  - Return 200 OK
    ↓
Browser:
  - Update UI status
  - LiveEventFeed continues to receive new events
```

---

## 12. Deployment architecture

### 12.1 systemd services

```ini
# /etc/systemd/system/factory@.service
# Template service, instance per project

[Unit]
Description=Rychi Design Factory: %i
After=network-online.target

[Service]
Type=simple
User=factory
Group=factory
WorkingDirectory=/home/factory/factory-projects/clients/%i
EnvironmentFile=/home/factory/.config/factory/secrets.env
Environment="FACTORY_PROJECT_ID=%i"
Environment="FACTORY_CORE=/home/factory/factory-projects/factory-core"

ExecStart=/home/factory/factory-projects/factory-core/tools/factory-runner --project=%i

Restart=on-failure
RestartSec=10
TimeoutStartSec=60

# Resource limits
MemoryMax=4G
CPUQuota=200%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=factory-%i

[Install]
WantedBy=default.target
```

```ini
# /etc/systemd/system/factory-dashboard.service

[Unit]
Description=Rychi Design Factory Dashboard
After=network-online.target

[Service]
Type=simple
User=factory
Group=factory
WorkingDirectory=/home/factory/factory-dashboard
EnvironmentFile=/home/factory/.config/factory/secrets.env
Environment="NODE_ENV=production"
Environment="PORT=3000"

ExecStart=/usr/bin/node /home/factory/factory-dashboard/dist/server/entry.mjs

Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

### 12.2 Service operations

```bash
# Start project
systemctl --user start factory@acme-corp-2026

# Pause (via dashboard API or CLI)
factory pause acme-corp-2026

# View logs
journalctl --user -u factory@acme-corp-2026 -f

# Dashboard
systemctl --user status factory-dashboard
systemctl --user restart factory-dashboard
```

---

## 13. Future architecture decisions deferred

For V2+ (not in V1 scope, but architecture allows):

### Parallelism

systemd template enables:
```bash
systemctl --user start factory@acme-corp-2026
systemctl --user start factory@bakery-xy-2026  # parallel
```

Per-project isolation already in place. Bottleneck: shared API rate 
limits. Solution: queue manager TBD.

### Multi-tenant dashboard

Current: single Jirka user. Future: multi-user with per-tenant project 
isolation. Requires:
- Auth upgrade (Clerk instead of CF Access)
- Per-user project filtering
- DB layer for users/permissions (introduces actual DB)

### TypeScript orchestrator

Current: LLM orchestrator (GLM). Future: deterministic TypeScript 
orchestrator for routing decisions, LLM only for genuine judgment.

Migration cost: rewrite orchestrator-as-process, keep all other agents.

### Custom harness

If Opencode becomes limiting after months of operation, fork-based 
custom harness based on pi-mono primitives. Migration cost: medium 
(agents are markdown, portable).

---

## 14. References

- **DECISIONS.md** — rationale for all architectural choices
- **GLOSSARY.md** — terminology definitions
- **PRD.md** — what features and why
- **ROADMAP.md** — implementation order
- **docs/concepts/** — deep dives on specific concepts
- **docs/reference/** — schema definitions, API references
- **docs/how-to/** — practical guides

---

## Changelog

- **1.0** (2026-04-25): Initial version with full architecture from 
  pre-implementation conversation. All major patterns defined: stateless 
  orchestrator, JSON Signals, hooks security, agent catalog, stack 
  catalog, design phase 2a/2b/2c, healer + known patterns, escalation 
  levels, file-based state, network topology.
