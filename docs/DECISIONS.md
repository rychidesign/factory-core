# Rychi Design Factory — Architecture Decision Records

**Version:** 1.0  
**Last updated:** 2026-04-25  
**Owner:** Jirka (Rychi Design)

---

## Účel tohoto dokumentu

DECISIONS.md je **log všech architektonických rozhodnutí** s rationale,
zvažovanými alternativami a důsledky. Každý záznam je samostatný ADR
(Architecture Decision Record).

Když se za 6 měsíců ptáš "proč jsme to udělali takhle?", odpověď je
zde. Když uvažuješ o změně rozhodnutí, najdi ADR a posuď, jestli
původní context stále platí.

**Pravidlo:** Pokud měníš zásadní architektonické rozhodnutí, **nepřepisuj
existující ADR**. Místo toho přidej nový ADR se statusem "Supersedes
ADR-XXXX" a vysvětli, co se změnilo a proč.

---

## ADR Index

| ID | Status | Title |
|----|--------|-------|
| 0001 | Accepted | Opencode jako agent runtime |
| 0002 | Accepted | Stateless orchestrator pattern |
| 0003 | Accepted | Multi-file spec structure |
| 0004 | Accepted | File-based state, no database |
| 0005 | Accepted | Hook-based permission enforcement |
| 0006 | Accepted | Universal agents with skill injection |
| 0007 | Accepted | Strukturovaná JSON komunikace mezi agenty |
| 0008 | Accepted | Figma-first AI-assisted design workflow |
| 0009 | Accepted | Sequential operation in V1, parallelism deferred |
| 0010 | Accepted | Specialized dashboard, ne generický monitoring tool |
| 0011 | Accepted | Self-learning known-patterns library s human approval |
| 0012 | Accepted | 4-úrovňový escalation protocol |
| 0013 | Accepted | Cloudflare Tunnel + Access pro homelab dashboard |
| 0014 | Accepted | Sanity jako default CMS, Payload jako alternative track |
| 0015 | Accepted | Český jazyk pro user-facing, anglický pro technické artifacts |

---

## ADR-0001: Opencode jako agent runtime

**Status:** Accepted (2026-04-25)

### Context

Pro řízení AI agentů potřebujeme runtime/harness, který poskytuje:
- Multi-provider LLM access
- Agent definice a spawning
- Tool calling s validací
- MCP integraci
- Sub-agent pattern
- Production-ready stability

Zvažovali jsme Opencode, LangGraph, CrewAI, Pi (vlastní fork), Claude
Code SDK.

### Decision

**Opencode** je primární agent runtime. Konfigurace v `factory-core/.opencode/`.

### Rationale

**Pro Opencode:**
- Markdown-based agent definice (rychlé iterace, version-friendly)
- Native MCP support (Figma MCP, Context7 MCP kritické pro náš workflow)
- Opencode Go subscription ($10/měsíc = $60 hodnoty modelů)
- Větší komunita než alternativy
- Sub-agent pattern out of the box
- Slash commands, hooks, skills system

**Proti LangGraph:**
- Python-heavy, vyžaduje Python expertise
- Steeper learning curve
- Méně designed pro náš file-based workflow

**Proti CrewAI:**
- Více "framework-y", silnější opinionated patterns
- Méně transparentní context management

**Proti Pi (fork):**
- Žádné MCP support — deal-breaker pro Figma integraci
- Žádné sub-agenty out of the box
- Nutnost vlastní vývoj základních features (3-6 týdnů navíc)
- Single-author projekt, sustainability risk
- Pravděpodobná ztráta Opencode Go subscription přístupu

**Proti Claude Code SDK:**
- Tightly coupled na Anthropic ecosystem
- Žádný Opencode Go cost benefit

### Consequences

**Pozitivní:**
- Rychlý start vývoje (známá technologie)
- Hotové integrace pro většinu requirements
- Sustainable community a ekosystem
- Cost-effective přes Opencode Go

**Negativní:**
- Vendor dependency na Opencode tým
- Méně customizable než vlastní harness
- Subject to Opencode breaking changes

**Mitigace negativ:**
- Spec schemas, conventions, agent definice jako markdown jsou
  framework-agnostic. Pokud později migrujeme jinam, 80 % práce
  zůstane přenositelné.
- Sledujeme Opencode changelog, plánujeme upgrady.

### Reevaluation triggers

- Pokud Opencode mění API breaking způsobem, který nás nutí přestavbu
- Pokud Opencode Go subscription ekonomika přestane sedět
- Pokud po 6 měsících reálného provozu identifikujeme fundamentální
  limity Opencode pro náš use case

### Alternatives reconsidered

Po finalizaci jsme zvažovali fork Pi jako custom harness. Detail
diskuze v conversation log z 2026-04-25. Závěr: předčasná optimalizace,
bez reálných dat o limitech Opencode.

---

## ADR-0002: Stateless orchestrator pattern

**Status:** Accepted (2026-04-25)

### Context

Continuous-running orchestrator akumuluje kontext napříč iteracemi.
Pro 60-iteration projekt přesahuje 200k token limit. Recovery z padu
náročné, debugging složitý.

### Decision

Orchestrátor je **stateless**. Každá iterace = fresh context.

```
Iteration N:

1. Read state.json
2. Read plan.md
3. Read last 5 decisions z decisions.jsonl
4. Decide next action
5. Spawn agent OR advance phase
6. Update state.json (atomic)
7. End iteration
```

State žije v souborech: `state.json`, `plan.md`, `decisions.jsonl`,
`logs/`, `blockers/`.

### Rationale

**Pro stateless:**
- Recovery z padu trivial (just read state)
- Restart idempotent
- Debugging snadný (state je inspektovatelný file)
- Context window management — orchestrátor vždy < 15k tokenů
- Možnost "rewind" — edit state, restart, nový směr

**Proti continuous orchestrator:**
- Context bloat (každá iterace přidá tokens)
- Loss of context po crashi
- Harder to debug (context je v session memory)
- Single point of failure

### Consequences

**Pozitivní:**
- Vysoká resilience
- Snadné horizontal scaling do budoucna (per-projekt instances)
- Excellent debugging (file system jako single source of truth)

**Negativní:**
- Každá iterace musí re-read state files (overhead ~100ms)
- Orchestrátor nemá "intuition" o trendech napříč iteracemi
  (řeší decision log read)

**Mitigace negativ:**
- Decisions.jsonl: orchestrátor čte posledních 5 entries pro context
- State.json contains "recent_iterations" array s poslední aktivitou
- Performance impact (~100ms per iter) negligible vs. LLM call (5-30s)

### Implementation notes

- Atomic writes: `write to .tmp, rename` pattern
- File locking via flock pro concurrent safety
- Git commit po každé iteraci jako audit trail

### Reevaluation triggers

- Pokud iterace overhead > 1 sekunda (zatím není predikováno)
- Pokud state files přerostou 1MB (extrémně nepravděpodobné)

---

## ADR-0003: Multi-file spec structure

**Status:** Accepted (2026-04-25)

### Context

Spec popisuje klientský projekt: business context, audience, goals,
scope, technical stack, design direction, constraints. Otázka: jeden
monolitický YAML nebo více strukturovaných souborů?

### Decision

**Multi-file structure** v `clients/{project-id}/spec/`:

```
spec/
├── meta.yaml
├── brief.md
├── business.yaml
├── audience.yaml
├── goals.yaml
├── scope.yaml
├── stack.yaml
├── design-direction.yaml
└── constraints.yaml
```

Plus `client-assets/` adresář pro binární soubory.

### Rationale

**Pro multi-file:**
- Granular editing — change tone of voice without touching scope
- Token efficiency — agent čte jen relevantní soubor
- Per-section validation — chyby snadno lokalizovat
- Clean git diffs (změna v 1 souboru, ne v 1 monstrózním YAML)
- Schema per soubor = klarifikuje kontrakt
- Different update lifecycles (constraints vs business stable, scope evolving)

**Proti single file:**
- Nemožnost partial updates v isolation
- Agent musí načíst celý kontext i pro malou věc
- Validation errors hard to locate (line 240 of 600-line YAML)
- Merge conflicts časté

### Consequences

**Pozitivní:**
- Jasný separation of concerns
- Jednodušší schema validation (per-file)
- Better LLM context economics
- Cleaner version control

**Negativní:**
- Více souborů ke správě
- Cross-file references (např. stack.yaml referuje archetypes)
  potřebují konvence
- Initial intake komplexnější (vyplnit 8 souborů místo 1)

**Mitigace negativ:**
- Intake System (Claude Desktop) skrývá multi-file komplexitu před
  Jirkou — vede konverzaci, generuje všechny soubory najednou
- Schemas s explicit references (`$ref` v JSON Schema) drží konzistenci
- Spec validator čte všechny soubory současně, ověřuje cross-file integrity

### Spec lifecycle

1. **Draft** — rozpracovaný během intake
2. **Complete** — všechny povinné sekce vyplněny
3. **Validated** — prošlo schema validation
4. **Approved** — Jirka označil za final
5. **Locked** — factory může startovat; jakákoli změna vyžaduje unlock

### Reevaluation triggers

- Pokud klienti začnou požadovat features, které vyžadují radikální
  restrukturalizaci spec
- Pokud cross-file integrity issues převažují benefity

---

## ADR-0004: File-based state, no database

**Status:** Accepted (2026-04-25)

### Context

Factory potřebuje persistovat stav projektu (current phase, decisions,
artifacts, logs) napříč iteracemi. Volba: SQL databáze, NoSQL,
file system.

### Decision

**File-based state** ve struktuře `.factory-state/`:

```
.factory-state/
├── state.json
├── plan.md
├── decisions.jsonl
├── blockers/
├── logs/
├── artifacts/
└── workspace/
```

Žádná databáze.

### Rationale

**Pro file-based:**
- Git-versionable (free history, blame, branching)
- Human-readable (debugging without tools)
- Zero setup (no DB server, migrations, backups)
- LLM-friendly (agents read/write files natively)
- Recovery-friendly (no DB corruption)
- Per-project isolation trivial (just directories)
- Backup strategy = git push

**Proti SQL:**
- Schema migrations při každé change
- Setup overhead (server, credentials, monitoring)
- Less human-readable
- Harder for LLM agents to query

**Proti NoSQL (MongoDB, etc.):**
- Same setup overhead
- Less mature for our scale (we don't need big data)

### Consequences

**Pozitivní:**
- Dramatically simpler architecture
- Excellent observability (cat, less, grep)
- Cheap backups (git)
- LLM agents work naturally with files

**Negativní:**
- No transactions across files (atomic writes per file only)
- No complex queries (no SQL JOINs)
- Concurrent access requires file locking
- Performance limited by filesystem (irrelevant pro náš scale)

**Mitigace negativ:**
- Atomic writes via `write to .tmp, rename` pattern
- File locking přes `flock` pro safety
- Concurrent access minimal (sequential V1)
- Queries solved via dashboard reading + parsing (in-memory)

### Scale boundaries

File-based state pracuje dobře do:
- Stovky projektů
- Tisíce decisions per project
- Miliony tokens of logs per project

Nad tím by mohla být potřeba relační databáze. **Daleko nad naším V1 scope.**

### Reevaluation triggers

- Pokud single project state files přerostou 100MB
- Pokud queries napříč projekty stanou kritickými (cross-project analytics)
- Pokud team grows a concurrent edits stanou problémem

---

## ADR-0005: Hook-based permission enforcement

**Status:** Accepted (2026-04-25)

### Context

LLM agenti pod tlakem ignorují instrukce v promptech ("nikdy nepiš
do /etc/passwd"). Reálné jailbreak experimenty ukazují 5-15% rate
ignorování konkrétních prompt restrictions.

Pro autonomous factory běžící bez supervize na klientských projektech
je toto **bezpečnostní deal-breaker**. Potřebujeme enforcement, který
LLM nemůže ignorovat.

### Decision

**Hook-based permission enforcement** přes Opencode pre-tool-use hooks:

```
factory-core/.opencode/
├── hooks/
│   └── permission-gate.sh    # central enforcement
├── permissions.yaml          # per-agent allow/deny matrix
```

Před každým tool call hook:
1. Čte FACTORY_AGENT env var
2. Ověřuje proti permissions.yaml
3. Allow → tool proceeds. Deny → tool blocked, logged, escalated.

### Rationale

**Pro hook enforcement:**
- LLM nemůže obejít (běží v hostujícím procesu)
- Centralizováno (jedna source of truth)
- Auditable (každý attempt logged)
- Inspirace z Dev Squad, Anthropic best practices
- Detail v Anthropic blog: "LLM agents disregard prompt instructions
  10-15% of the time under pressure"

**Proti prompt-only restrictions:**
- LLM cuts corners pod time/token pressure
- Confused deputy attacks (file s instrukcemi obsahuje "ignore previous")
- Prompt injection via shared resources

**Proti container sandboxing:**
- Heavyweight pro náš use case
- Loss of integration s existing toolchain (npm, git)
- Sub-agents v containers složité

### Consequences

**Pozitivní:**
- Robust security boundary
- Clear audit trail
- Limits blast radius při LLM mistakes
- Industry-aligned best practice

**Negativní:**
- Permissions.yaml musí být udržován při změnách agent capabilities
- Performance overhead per tool call (~10-50ms)
- Debugging harder (permission denials need log inspection)

**Mitigace negativ:**
- ADR-0006 (universal agents) limituje počet agent variants
- Permissions tested v CI před merge
- Dashboard zobrazuje recent permission denials pro fast debugging

### Permission matrix structure

Detail v ARCHITECTURE.md sekce 5. Příklad:

```yaml
agents:
  frontend-builder:
    write:
      allow: ["workspace/**", "artifacts/**"]
      deny: ["spec/**", "state.json"]
    bash:
      allow: ["npm *", "git add"]
      deny: ["git push", "rm -rf", "sudo *"]
```

### Reevaluation triggers

- Pokud permission matrix přerostou 500+ řádků (komplexita problem)
- Pokud reálné security incidents ukazují, že hooks nejsou dostačující

---

## ADR-0006: Universal agents with skill injection

**Status:** Accepted (2026-04-25)

### Context

Factory má podporovat víc tech stacků (astro-sanity, astro-payload,
nextjs-sanity, webflow). Otázka: stack-specific agenty (např.
`astro-builder.md`, `nextjs-builder.md`) nebo univerzální agenty
s dynamic skill injection?

### Decision

**Universal agents + skill injection.**

Jeden `frontend-builder.md`, který dostává relevant skills (Astro,
Next.js, atd.) jako kontext při spawnu.

```yaml
# agent definition
name: frontend-builder
skills:
  - "{project.stack.track}"   # dynamicky resolved
  - "frontend-design"
  - "tailwind"
```

Skills v `factory-core/.opencode/skills/<stack>/SKILL.md`.

### Rationale

**Pro universal agents:**
- Adding new stack = write 1 skill, not new agent
- Single mental model pro všechny stacks
- Konzistentní behavior (stejné rules, různá knowledge)
- Lower maintenance (less duplication)
- Better composability (multi-skill agents)

**Proti stack-specific agents:**
- 5 stacks × 5 roles = 25 agentů
- Maintenance burden při updates
- Drift between agents (každý se vyvíjí jinak)
- Onboarding harder (víc agentů k pochopení)

### Consequences

**Pozitivní:**
- Snadné rozšíření o nové stacky
- Konzistentní agent behavior
- Reduced maintenance
- Cleaner architecture

**Negativní:**
- Skill injection mechanism komplexnější než static
- Agent prompt musí být generic enough pro multiple stacks
- Hardware: skill loading overhead per spawn (~100-500ms)

**Mitigace negativ:**
- Opencode native podpora pro skills (žádný custom mechanism)
- Universal prompts navrženy s explicit skill references
- Skill caching v Opencode runtime

### Exception: deployer agents

Některé stack-specific tools mají dramatically different deployment:
- `astro-deployer` (Cloudflare Pages workflow)
- `vercel-deployer` (Vercel workflow)
- `webflow-deployer` (Webflow API)

Tyto **mohou být separátní**, protože deployment pipelines mají
strukturálně různé tool requirements.

### Reevaluation triggers

- Pokud universal prompt přeroste 5000 tokenů (signal too generic)
- Pokud quality napříč stacky výrazně kolísá (signal that one-size
  doesn't fit all)

---

## ADR-0007: Strukturovaná JSON komunikace mezi agenty

**Status:** Accepted (2026-04-25)

### Context

Agents reportují výsledky orchestrátorovi a komunikují s ním. Volba:
volný text (markdown summary), structured JSON, nebo hybrid?

### Decision

**Strukturovaný JSON podle definovaných schemas.** Žádný volný text
v inter-agent komunikaci.

Schemas v `factory-core/schemas/agent-signals/`:
- `auditor-result.schema.json`
- `builder-result.schema.json`
- `blocker.schema.json`
- `orchestrator-decision.schema.json`

Každý agent **musí** vrátit valid JSON. Orchestrátor validuje pomocí
ajv. Invalid JSON → escalate to healer.

### Rationale

**Pro strukturovaný JSON:**
- Orchestrátor parses, nemá interpret natural language
- Konzistence: status="passed" je jasné, ne "It seems good?"
- Inspirace Dev Squad — proven pattern
- Token efficient (no prose explanation)
- Type-safe via schemas
- Easy to log, query, aggregate

**Proti free text:**
- Orchestrátor by musel LLM call pro interpretation (cost, latency)
- Variance v formátech (každý LLM jinak verbose)
- Ambiguity ("it's mostly working" — pass or fail?)
- Hard to test deterministically

### Consequences

**Pozitivní:**
- Deterministické rozhodování orchestrátora
- Snadné dashboard rendering
- Reliable filtering, aggregation
- Lower token costs

**Negativní:**
- Agents musí dodržovat schema (vyžaduje strict prompts)
- Některý nuance ztracen (shorter context for human review)
- Schema evolution potřebuje versioning

**Mitigace negativ:**
- Agent prompts include explicit JSON Signal example a schema reference
- Validation errors trigger retry s clarification
- Schema versioning přes `schema_version` field

### Schema versioning

Při change schema:
1. Add new version (e.g., `auditor-result-v2.schema.json`)
2. Old agents return v1, new agents return v2
3. Orchestrátor detekuje version, routes accordingly
4. Migration period: v1 i v2 supported
5. Deprecate v1 po 30 dnech

### Reevaluation triggers

- Pokud schema rigidness blokuje critical use cases
- Pokud LLM agents systematicky failují schema validation

---

## ADR-0008: Figma-first AI-assisted design workflow

**Status:** Accepted (2026-04-25)

### Context

Pro klientské weby potřebujeme designový kontrakt — vizuální a
strukturální definici, podle které agents staví kód. Možnosti:

A) Manuální design (Jirka navrhuje vše ve Figmě)
B) AI-first design (AI generuje rovnou kód)
C) Figma-first hybrid (AI generuje Figmu, Jirka schvaluje, pak kód)

### Decision

**Figma-first AI-assisted workflow.**

Phase 2 design má 3 sub-fáze:
- 2a: Direction (3 prose proposals) → Jirka volí
- 2b: Figma generation (kompletní Figma file) → Jirka review/edit
- 2c: Lock & extract (tokens + manifest) → handoff to build

### Rationale

**Pro Figma-first hybrid:**
- AI dělá heavy lifting (90 % designové práce)
- Jirka má designérskou kontrolu (review, edit ve Figmě)
- Figma je nativní designérský nástroj — nativní iterace
- Klient vidí klasický Figma handoff (familiar format)
- Single source of truth pro build phase

**Proti manual design (Jirka navrhuje vše):**
- Eliminuje hlavní benefit factory (time savings)
- Bottleneck na designerovi
- Stejná hodina práce jako traditional workflow

**Proti AI-first kód:**
- Loss of designerské kontroly
- Iterace bolestivější (kód místo Figmy)
- Klient nevidí design v čitelném formátu před buildem
- "AI slop" risk — generic, ne-distinct designy

### Consequences

**Pozitivní:**
- Optimal time/quality ratio
- Designerská kontrola zachována
- Klient handoff format zůstává konzistentní
- Single source of truth (Figma) pro consistency

**Negativní:**
- Závislost na Figma MCP write capability
- Vyžaduje Figma Professional plan (Dev Mode)
- Figma API rate limits možný issue pro velké projekty
- Generation kvalita závisí na multimodal model (Gemini 3.1 Pro)

**Mitigace negativ:**
- Figma MCP read/write již proven funkční (ověřeno 2026)
- Figma Professional je $15/měsíc — akceptovatelné
- Rate limits zatím nepředpokládáme problémem (typický web 15-20 stran)
- Fallback: Jirka může manuálně designovat a skip 2b sub-phase

### Self-improvement loop

`figma-patterns` skill má `learnings/pending/` a `learnings/approved/`.
Po každém projektu agent navrhne nové patterns, Jirka schvaluje.

### Reevaluation triggers

- Pokud Figma MCP write capability ztratí stabilitu
- Pokud quality of generated Figma files je systematicky low
- Pokud Jirka spending > 1 hodina per projekt na Figma editing
  (signal that AI generation needs improvement)

---

## ADR-0009: Sequential operation in V1, parallelism deferred

**Status:** Accepted (2026-04-25)

### Context

Factory by mohla běžet sekvenčně (1 projekt v čase) nebo paralelně
(více projektů současně).

### Decision

**Sequential operation v V1.** Parallelism odloženo na V2+ podle
reálné potřeby.

Architecture pattern (per-project isolation, systemd template service)
**umožňuje paralelismus later** bez fundamentálního refactoringu.

### Rationale

**Pro sequential V1:**
- Simpler debugging (1 process to monitor)
- Lower complexity (no queue manager, resource scheduling)
- Sufficient for target throughput (4-8 projects/month)
- Lower risk pro early phase
- Easier observability (1 dashboard view)

**Proti immediate parallelism:**
- Premature optimization (no data on real bottlenecks)
- Resource contention complex (RAM, API rate limits)
- Queue manager additional complexity
- Hard to debug parallel issues

### Consequences

**Pozitivní:**
- Faster V1 delivery
- Cleaner mental model
- Lower bug surface

**Negativní:**
- Throughput limited by sequential execution
- Idle resources během human gates (Jirka review)
- Blocked projects musí čekat na completion of previous

**Mitigace negativ:**
- Per-project isolation zachována (architecture-ready pro parallel)
- systemd template service (`factory@.service`) supportuje multiple
  instances — change is configuration only
- Wait time during human gates < 24h typically (acceptable for V1)

### When to enable parallelism

After 3 months of real V1 operation:
- If consistent backlog (>2 projects waiting)
- If API rate limits aren't bottleneck (data-driven check)
- If dashboard handles multi-project view

Implementation cost po V1: ~1-2 weeks (queue manager + dashboard updates).

### Reevaluation triggers

- Throughput shortage v real demand
- Multiple paying clients waiting > 48h
- Idle server time > 50% during business hours

---

## ADR-0010: Specialized dashboard, not generic monitoring tool

**Status:** Accepted (2026-04-25)

### Context

Pro observability factory potřebujeme UI. Volba: generický monitoring
tool (Grafana, Datadog), custom dashboard, nebo no UI (just logs)?

### Decision

**Specialized custom dashboard** v Astro + React + Tailwind.

Featured popsány v PRD.md sekce 3.

### Rationale

**Pro custom dashboard:**
- Domain-specific UI (agent graph, blocker resolution flow, plan progress)
- Action-oriented (start/stop, resolve blockers, edit spec)
- Eat your own dogfood (testuje stack, který factory produkuje)
- Polished UX (Jirka je designer, has high standards)
- Future product opportunity (pokud factory commercialized)

**Proti generic monitoring (Grafana, Datadog):**
- Cíleno na metrics, ne na actions
- Custom rendering pro typed blockers složité
- Misalignment mezi typical use cases a factory potřebami
- Cost (Datadog) nebo complexity (Grafana setup)

**Proti no UI:**
- Logs only = poor UX, slow debugging
- Mobile access impossible
- Klient handover (V2) impossible

### Consequences

**Pozitivní:**
- Optimal UX pro factory operations
- Designed pro Jirkův workflow
- Mobile-first pro rychlé akce
- Demonstrates factory's own capabilities

**Negativní:**
- Development cost (~3-4 weeks)
- Maintenance burden (factory + dashboard)
- Feature parity s factory progress

**Mitigace negativ:**
- Dashboard MVP úzce zaměřen (jen kritické features V1)
- Iterace podle real usage data
- Stack-aligned (same tech as client projects = transferable knowledge)

### Reevaluation triggers

- Pokud dashboard development blocks factory progress
- Pokud Jirka spend > 30% času na dashboard maintenance
- Pokud generic tool by reálně covered our needs

---

## ADR-0011: Self-learning known-patterns library s human approval

**Status:** Accepted (2026-04-25)

### Context

Factory bude opakovaně narážet na similar problems (npm errors,
Sanity config issues, build failures). Solutions by neměly být
re-discovered každý run.

### Decision

**Known-patterns library** s self-learning loop:

```
factory-core/known-patterns/
├── approved/    (used by healer)
└── pending/     (waiting for Jirka review)
```

Healer agent navrhuje new patterns po successful resolution. Jirka
review/approve/reject. Approved patterns immediately available.

### Rationale

**Pro self-learning s approval gate:**
- Knowledge accumulates over time (factory improves)
- Human approval prevents bad patterns (LLM might over-generalize)
- Lower escalation rate (more issues resolve at Level 1)
- Audit trail for institutional knowledge
- Inspirace from incident management best practices

**Proti pure auto-learning (no approval):**
- Risk of bad patterns (false positives, over-generalizations)
- Hard to debug if patterns conflict
- No quality control

**Proti no learning (rediscover every time):**
- Wasted tokens, time
- Inconsistent resolution
- No improvement over time

### Consequences

**Pozitivní:**
- Factory becomes smarter over time
- Reduced escalations
- Knowledge transfer (patterns documented)
- Quality controlled (human-in-the-loop)

**Negativní:**
- Jirka must review pending patterns periodically
- Pattern matching algorithm complexity
- Maintenance: patterns may become stale

**Mitigace negativ:**
- Dashboard surfaces pending patterns prominently (no missing them)
- Simple text matching V1, fuzzy matching V2
- Periodic review of approved patterns (every 3 months) for relevance

### Pattern lifecycle

1. Healer encounters unknown problem
2. Reasons through resolution
3. If successful + novel: writes pattern to `pending/`
4. Dashboard shows "1 new pattern proposed"
5. Jirka reviews:
   - Approve → moves to `approved/`
   - Edit + approve → modified version to `approved/`
   - Reject → deleted from `pending/`
6. Approved patterns used by healer in next runs

Same pattern applies to **archetype updates** (lessons from project
inform archetype refinements).

### Reevaluation triggers

- If patterns repeatedly approved without modifications (full auto might be safe)
- If patterns frequently rejected (signal healer needs better reasoning)
- If pattern conflicts arise (need conflict resolution)

---

## ADR-0012: 4-úrovňový escalation protocol

**Status:** Accepted (2026-04-25)

### Context

When agents fail or encounter situations beyond their competence,
something must be done. Spectrum:
- Auto-resolve everything (risky, errors compound)
- Notify Jirka about everything (notification fatigue)

Need balanced approach.

### Decision

**4-level escalation:**

- **Level 0: Auto-resolve** — agent decides, documents, continues
- **Level 1: Healer-resolve** — healer applies known-patterns
- **Level 2: Async digest** — log, continue, daily morning email
- **Level 3: Sync Telegram** — immediate alert, factory pauses

**Target:** 95 % situations resolved at Level 0-1.

**Constraint:** Max 1-2 Level 3 alerts per day.

### Rationale

**Pro 4 levels:**
- Granularity matches real situation severity
- Auto-resolve handles trivia
- Healer handles known unknowns
- Async digest for non-blocking issues
- Sync alert for true emergencies

**Pro 95 % target at Level 0-1:**
- Vyšší rate = factory unusable due to interruptions
- Lower rate = means too few escalations (might miss real issues)

**Proti 2-level (auto + alert):**
- Loss of nuance
- Either too many alerts or too lax automation

**Proti 5+ levels:**
- Diminishing returns
- Complexity without benefit

### Consequences

**Pozitivní:**
- Reasonable Jirkův mental load
- Issues handled at appropriate level
- Factory operates autonomously most time

**Negativní:**
- Calibration complexity (when is something Level 2 vs 3?)
- Risk of mis-categorization (Level 3 thing gets Level 2)

**Mitigace negativ:**
- Clear rules per agent for escalation triggers
- Healer has explicit decision tree
- Logged escalations reviewable, calibration tunable

### Escalation triggers per level

**Level 0 → Level 1:** Agent fails twice on same task
**Level 1 → Level 2:** Healer cannot match patterns AND can continue
**Level 2 → Level 3:** Issue blocks all progress OR quality risk
**Level 3:** Production deploy errors, security alerts, data loss risk

### Reevaluation triggers

- If Level 3 alerts > 5 per week consistently
- If Level 0-1 resolution rate < 80%
- If categorization mistakes pattern emerges

---

## ADR-0013: Cloudflare Tunnel + Access pro homelab dashboard

**Status:** Accepted (2026-04-25)

### Context

Dashboard musí být dostupný z internetu (mobil, na cestách, eventually
klienti). Server je v homelab (Jirkův obývák), ne datacenter.

Tradiční řešení (port forwarding + reverse proxy + Let's Encrypt)
exposuje domácí síť, vyžaduje statickou IP, ISP nesmí blokovat porty.

### Decision

**Cloudflare Tunnel + Cloudflare Access.**

- `cloudflared` daemon na serveru creates outbound encrypted tunnel
- `factory.digitaldesigner.cz` → Cloudflare → tunnel → localhost:3000
- Cloudflare Access: auth wall (Google login, free tier 50 users)
- **Zero open ports na serveru** (kromě SSH key-only)

### Rationale

**Pro Cloudflare Tunnel:**
- No port forwarding needed
- Works behind CGNAT, dynamic IPs, ISP restrictions
- TLS handled by Cloudflare (no Let's Encrypt management)
- DDoS protection included
- Free tier sufficient
- Industry-standard for homelab

**Pro Cloudflare Access:**
- Free tier 50 users
- Identity provider integrations (Google, GitHub, email codes)
- Auth wall before request reaches server
- No need for custom auth in dashboard V1
- Future-ready for client access

**Proti port forwarding + nginx + Let's Encrypt:**
- Exposes home network
- Cert renewal management
- DDoS exposure
- ISP/CGNAT issues

**Proti Tailscale-only:**
- Limited to Jirkův devices
- No future client access path
- Requires VPN client install

### Consequences

**Pozitivní:**
- Domácí síť zůstává privátní
- Zero infrastructure overhead pro auth/TLS
- Future-ready pro klientský access
- Cost: $0/měsíc

**Negativní:**
- Cloudflare dependency (vendor lock)
- If Cloudflare outage, dashboard unreachable
- Reliance on Cloudflare's auth implementation

**Mitigace negativ:**
- Tailscale jako emergency backup (SSH access odkudkoli)
- Cloudflare uptime > 99.9% historically
- Migration to alternative tunnel solution possible (Ngrok, Inlets)
  if Cloudflare fails as company

### Setup

1. cloudflared install + auth
2. cloudflared tunnel create factory-tunnel
3. Configure ~/.cloudflared/config.yml
4. cloudflared tunnel route dns factory-tunnel factory.digitaldesigner.cz
5. systemd service for cloudflared
6. Cloudflare Access policy: emails @digitaldesigner.cz allowed

### Reevaluation triggers

- If Cloudflare outages affect operations significantly
- If costs change unfavorably
- If alternatives (e.g., self-hosted tunnel) become compelling

---

## ADR-0014: Sanity jako default CMS, Payload jako alternative track

**Status:** Accepted (2026-04-25)

### Context

Pro klientské weby potřebujeme CMS. Volba mezi hosted (Sanity) a
self-hosted (Payload) jako default.

### Decision

**Sanity jako default.** Payload dostupný jako alternative track v
stack catalog pro specifické use cases.

### Rationale

**Pro Sanity default:**
- **Operational simplicity** — hosted, žádná DB management per klient
- **Free tier ekonomika** — pokrývá 95% typických marketing webů
- **Risk** — 8 let v produkci, rock-solid
- **AI agent friendliness** — stable API, well-documented, more LLM training data
- **Factory complexity** — cms-builder agent píše jen schemas, žádný DB provisioning

**Pro Payload jako alternative:**
- Klient striktně chce data on-premise (právník, banka)
- Custom workflow vyžadující deep customization
- Větší projekty kde Sanity tier ekonomika nesedí

**Proti Payload jako default:**
- Operational burden — factory by spravovala DB hosting per klient
- Dvojnásobná komplexita workflow
- Klient platí $20-40/měsíc hosting Payload backendu navíc
- Mladší projekt, méně AI training data

### Consequences

**Pozitivní:**
- Jednodušší factory implementace
- Klient platí $0 navíc za default CMS
- Predictable infrastructure
- Reliable AI agent generation

**Negativní:**
- Vendor dependency on Sanity
- Klient nevlastní data on-premise
- Sanity rate limits constraints pro velké weby

**Mitigace negativ:**
- Payload track existuje jako fallback
- Architect agent může vybrat Payload pokud spec wymaga
- Sanity Growth tier ($99/měsíc) dostupný pokud free tier exceed

### Stack catalog placement

```yaml
stacks:
  astro-sanity:        # default content track
  astro-payload:       # alternative pro specific cases
  ...
```

Detail v stack-catalog.yaml a ARCHITECTURE.md sekce 6.

### Reevaluation triggers

- If Sanity free tier neudostačuje pro typické projekty (signal of
  scaling success)
- If operational issues s Sanity convergí (rate limits, downtime)
- If klientská poptávka po Payload roste (>30% projektů)

---

## ADR-0015: Český jazyk pro user-facing, anglický pro technické artifacts

**Status:** Accepted (2026-04-25)

### Context

Jirka mluví češtinou. Klienti (převážně) mluví českou. Technický
ekosystem (LLMs, tools, dokumentace knihoven) je anglický.

### Decision

**Bilingual approach:**

- **Česky:** Intake konverzace, dashboard UI, Telegram notifications,
  klientský content (default)
- **Anglicky:** Code, system prompts, schemas, ADR, technical
  documentation, inline comments

### Rationale

**Pro bilingual:**
- Jirka komfort v češtině pro denní operations
- Klienti čtou content v češtině
- LLM agents perform better v angličtině (training data bias)
- Code conventions universally English (industry standard)
- Technical docs maintainable, transferable, AI-friendly

**Proti pure Czech:**
- LLM quality degraded
- Technical terms awkward translations
- Nepoužitelné pro non-Czech contributors (future)

**Proti pure English:**
- Friction pro klientskou komunikaci
- Awkward dashboard pro Czech-native user
- Content translation overhead

### Consequences

**Pozitivní:**
- Best of both worlds
- Jirkův komfort zachován
- Technical excellence maintained
- Klient experience native

**Negativní:**
- Mental switch při work (čeština ↔ angličtina)
- Some terms ambiguous (např. "agent" stejně oba)
- Documentation duplicate effort for Czech-relevant explanations

**Mitigace negativ:**
- Glossary mapuje key terms (already in GLOSSARY.md)
- Conventions document specifies which language for what
- Generated content (intake summaries, audit reports) language-aware

### Implementation rules

| Artifact | Language |
|----------|----------|
| Intake conversation | Česky |
| spec/brief.md | Česky (per klient) |
| spec/business.yaml values | Per klient locale |
| Dashboard UI | Česky |
| Dashboard error messages | Česky |
| Telegram notifications | Česky |
| Klientský web content | Per klient locale |
| Code comments | Anglicky |
| System prompts | Anglicky |
| JSON schemas | Anglicky |
| ADR | Anglicky (primary) + Czech notes acceptable |
| ARCHITECTURE.md | Anglicky |
| README.md | Anglicky |
| Conventions | Anglicky |
| Logs | Anglicky (structured) |

### Reevaluation triggers

- If team grows (potential native English speakers join)
- If business pivots to international clients
- If LLM quality v češtině dostatečně improves

---

## Future ADRs (anticipated)

Tyto ADR budou napsány až přijdou na řadu:

- **ADR-0016:** Dashboard auth strategy V2 (when expanding beyond Jirka)
- **ADR-0017:** Parallel projects implementation (when V2 enables it)
- **ADR-0018:** TypeScript orchestrator migration (if/when Opencode insufficient)
- **ADR-0019:** Multi-tenant architecture (if commercialization happens)
- **ADR-0020:** Long-term context storage (if conversation history grows large)

---

## ADR template

When adding new ADR, copy this template:

```markdown
## ADR-XXXX: Title

**Status:** Proposed | Accepted | Superseded by ADR-YYYY (date)

### Context

What forces are at play? What's the situation that requires a decision?

### Decision

What is the decision? Be specific.

### Rationale

Why this decision? What are the alternatives, and why not them?

### Consequences

**Pozitivní:** What benefits we get.
**Negativní:** What costs we accept.
**Mitigace negativ:** How we handle the costs.

### Reevaluation triggers

When should we reconsider this decision?
```

---

## Changelog

- **1.0** (2026-04-25): Initial verze. 15 ADR pokrývajících core
  architectural decisions z pre-implementation conversation. ADR
  template for future additions defined.
