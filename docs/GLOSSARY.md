# Rychi Design Factory — Glossary

**Version:** 1.0  
**Last updated:** 2026-04-25

Tento dokument definuje všechny pojmy specifické pro Rychi Design Factory.
Když narazíš na termín v jiné dokumentaci nebo v kódu a nejsi si jistý
významem, hledej zde.

Termíny jsou seřazeny abecedně. Související termíny mají křížové odkazy.

---

## Agent

Specializovaný AI worker s definovanou rolí, system promptem, povolenými
nástroji a skill setem. Žije jako markdown soubor v 
`factory-core/.opencode/agents/`.

Agent vykonává jednu doménu úkolů (např. `frontend-builder` staví UI
komponenty, `design-auditor` kontroluje vizuální konzistenci). Spawn-uje
ho [Orchestrátor](#orchestrátor) podle aktuální fáze projektu.

Každý agent má:
- System prompt definující roli
- Allow/deny list nástrojů
- Model assignment (např. GLM-5.1, Kimi K2.5)
- Token budget per invocation
- JSON output schema pro komunikaci

Příklad: `frontend-builder.md`, `healer.md`, `design-auditor.md`.

Související: [Skill](#skill), [Orchestrátor](#orchestrátor), 
[JSON Signal](#json-signal).

---

## Archetype

Šablona typu klientského projektu. Obsahuje typické otázky pro intake,
očekávaný scope, common gotchas, typický stack track.

Žije v `factory-core/archetypes/` jako YAML soubor.

Archetypy ve V1: small-b2b-services, ecommerce-small, portfolio-creative,
restaurant-hospitality, saas-landing.

[Intake](#intake) automaticky detekuje pravděpodobný archetype z briefu
a používá ho k cílení otázek.

Související: [Intake](#intake), [Spec](#spec).

---

## Artifact

Výstup [agenta](#agent) — soubor (kód, JSON, screenshot, audit report),
který agent vytvořil během iterace. Žije v `.factory-state/artifacts/`
konkrétního projektu.

Artefakty jsou trvalé (uložené, version-controlled) na rozdíl od 
ephemeral context nebo logů. Slouží jako vstup pro další agenty.

Příklad: `design-tokens.json`, `audit-a11y-2026-04-25.json`,
`screenshot-homepage.png`.

Související: [Agent](#agent), [State](#state).

---

## Audit

Systematická kontrola výstupu továrny v dimenzi (accessibility,
performance, design konzistence, route validity, content quality).

Provádí ji specializovaný [agent](#agent) (např. `accessibility-auditor`,
`performance-auditor`).

Audit má strukturovaný JSON output podle [JSON Signal](#json-signal)
schema: pass/fail/warning + findings + suggestions.

Audity běží ve **QA fázi** projektu před deploy.

Související: [Agent](#agent), [QA Phase](#qa-phase),
[JSON Signal](#json-signal).

---

## BACKLOG.md

Dokument v každém projektu (a v factory-core), kam se zapisují nápady
na pozdější realizaci. Slouží jako "parking lot" pro myšlenky, které
nepatří do aktuální iterace.

Pravidlo: když uprostřed práce přijde nová myšlenka, **patří do BACKLOG**,
ne do aktuálního kroku. Tím se zabraňuje scope creep.

---

## Blocker

Situace, kterou [agent](#agent) nemůže vyřešit sám a vyžaduje rozhodnutí
[Jirky](#jirka) nebo dalšího lidského zásahu.

Žije v `.factory-state/blockers/` jako JSON soubor podle blocker schema.

Typy blockerů:
- `design-approval-needed` — čeká na schválení designu
- `copy-variants` — více variant copy, vyber jednu
- `missing-info` — chybí data od klienta
- `scope-change` — agent identifikoval potřebu změny scope
- `missing-component` — chybí Figma komponenta

Blockery se zobrazují v [Dashboard](#dashboard) s typed UI per blocker
type.

Související: [Healer](#healer), [Escalation](#escalation),
[Dashboard](#dashboard).

---

## Bootstrap

Inicializační fáze projektu, kdy se z přijatého [Spec](#spec) vytvoří
struktura `.factory-state/`, inicializuje state.json, plan.md.

Provádí ji `bootstrap-agent`. Je to jednorázová akce na začátku každého
projektu.

Související: [Spec](#spec), [State](#state).

---

## Build Phase

Fáze projektu, kdy frontend-builder agenti staví jednotlivé stránky
podle [Spec](#spec) a schváleného designu. Předchází ji 
[Foundation Phase](#foundation-phase), následuje [QA Phase](#qa-phase).

Související: [Phase](#phase), [QA Phase](#qa-phase).

---

## CMS Builder

[Agent](#agent), který generuje schémata pro CMS (defaultně Sanity)
podle scope projektu. Vytváří document types, fields, validation rules.

Související: [Agent](#agent), [Sanity](#sanity), [Stack Track](#stack-track).

---

## Cloudflare Tunnel

Outbound encrypted spojení mezi serverem v homelab a Cloudflare edge.
Umožňuje vystavit služby ze serveru na veřejnou doménu **bez otevírání
portů**.

Použito pro [Dashboard](#dashboard) na `factory.digitaldesigner.cz`.

Daemon `cloudflared` běží jako systemd service na serveru.

Související: [Cloudflare Access](#cloudflare-access), [Dashboard](#dashboard).

---

## Cloudflare Access

Auth wall před [Cloudflare Tunnel](#cloudflare-tunnel). Vyžaduje login
(Google, jednorázový email kód, atd.) před tím, než request projde
na server.

Free tier: až 50 uživatelů. Použito pro [Dashboard](#dashboard) auth.

Související: [Cloudflare Tunnel](#cloudflare-tunnel).

---

## Component Library

Sada UI komponent (Button, Card, Hero, Navigation, atd.) generovaná
v [Figma](#figma-mcp) Design Phase a používaná všemi
[frontend-buildery](#frontend-builder) v projektu.

Komponenty mají striktní [naming convention](#naming-convention) mezi
Figma a kódem.

Související: [Design Phase](#design-phase), [Figma MCP](#figma-mcp),
[Naming Convention](#naming-convention).

---

## Content Track

Kategorie [Stack Track](#stack-track) zaměřená na content-driven weby
(marketing, portfolio, blog). Default track továrny.

Příklady: astro-sanity, astro-payload.

Související: [Stack Track](#stack-track), [App Track](#app-track).

---

## Content Writer

[Agent](#agent), který generuje copy pro stránky podle tone of voice
ze [Spec](#spec). Multimodal model (Kimi K2.5) pro consistency.

Související: [Agent](#agent), [Spec](#spec).

---

## Dashboard

Webová aplikace na `factory.digitaldesigner.cz`, která vizualizuje
a ovládá [Factory](#factory). Postavená v Astro + React islands +
Tailwind + shadcn/ui.

Klíčové features V1:
- Project list s status
- Live event feed (Server-Sent Events)
- Agent graph vizualizace
- Server metrics (CPU, RAM)
- Token/cost tracking per agent
- Start/stop/pause controls (task-level granular)
- Blocker resolution UI

Běží jako systemd service vedle factory.

Související: [Factory](#factory), [Cloudflare Tunnel](#cloudflare-tunnel).

---

## Decide-then-document

Pattern v agent system promptech: agent rozhodne autonomně, pak zapíše
co rozhodl a proč do logu. **Neptá se** orchestrátora ani člověka na
mikro-rozhodnutí.

Důvod: kontextové přepínání drahé. Pokud rozhodnutí není kritické,
agent rozhoduje sám a documentuje. Reverse je přes [Healer](#healer)
nebo [Escalation](#escalation), pokud výsledek nesedí.

Související: [Agent](#agent), [Escalation](#escalation).

---

## Decisions Log

`.factory-state/decisions.jsonl` — append-only soubor s rozhodnutími
[Orchestrátora](#orchestrátor) napříč iteracemi. Slouží jako audit
trail a context pro stateless orchestrátor.

Související: [Stateless Orchestrator](#stateless-orchestrator).

---

## Deploy Phase

Finální fáze projektu, kdy se postavený web nasazuje na production
(Cloudflare Pages, Vercel). Provádí `deployer-agent`.

Související: [Phase](#phase).

---

## Design Director

[Agent](#agent), který generuje 3 design directions na začátku
[Design Phase](#design-phase). Každá direction má distinct aesthetic,
typografii, color palette.

[Jirka](#jirka) volí jednu direction (nebo požaduje iteraci) v 
[Dashboard](#dashboard).

Související: [Design Phase](#design-phase), [Figma Designer](#figma-designer).

---

## Design Phase

Fáze projektu mezi Architecture a Foundation. Tři sub-fáze:

- **2a Direction** — design-director generuje 3 directions
- **2b Figma Generation** — figma-designer staví kompletní Figma file
  (foundation, components, pages)
- **2c Lock & Extract** — extract design-tokens.json, components manifest

Mezi 2a a 2b je [Human Gate](#human-gate) (volba direction).
Mezi 2b a 2c je Human Gate (review v Figmě).

Související: [Design Director](#design-director), [Figma Designer](#figma-designer),
[Human Gate](#human-gate).

---

## Design Tokens

Strojově čitelné pravidla designu (colors, spacing, typography,
shadows, motion) v JSON formátu. Generuje je [figma-extractor](#figma-extractor)
ze schválené Figma.

Žije jako `.factory-state/artifacts/design-tokens.json`. Tailwind
config se z nich generuje, frontend-builders je čtou.

Související: [Figma MCP](#figma-mcp), [Figma Extractor](#figma-extractor).

---

## Diátaxis

Dokumentační framework dělící obsah do 4 kategorií:

- **Concepts** — vysvětlují principy
- **Reference** — popisují fakta
- **How-to** — vedou postupem
- **Tutorials** — učí krok-po-kroku (V1 nepoužíváme)

Plus **Decisions** (ADR) jako 5. kategorie pro architectural rationale.

Naše `docs/` strukturu sleduje tento framework.

---

## Escalation

Mechanismus, kdy agent eskaluje situaci na vyšší úroveň, když ji
nemůže vyřešit. Má 4 úrovně:

- **Level 0: Auto-resolve** — agent vyřeší sám
- **Level 1: Healer-resolve** — [Healer](#healer) zkusí known patterns
- **Level 2: Async digest** — zaloguje, čeká na ráno (digest email)
- **Level 3: Sync Telegram** — okamžitý alert Jirkovi

Cíl: 95 % situací na Level 0-1. Max 1-2 Level 3 alerty denně.

Související: [Healer](#healer), [Known Patterns](#known-patterns),
[Blocker](#blocker).

---

## Factory

Centrální systém na serveru, který přijímá [Spec](#spec) a autonomně
staví web. Skládá se z:

- [Orchestrátor](#orchestrátor)
- [Agenty](#agent) (frontend-builder, content-writer, auditors, healer, ...)
- [Stack Catalog](#stack-catalog)
- [Skills](#skill) library
- [Known Patterns](#known-patterns) library

Běží jako systemd service na homelab serveru. Komunikuje s 
[Dashboard](#dashboard) přes file system + SSE.

Související: [Dashboard](#dashboard), [Intake](#intake).

---

## Factory-core

Git repozitář s sdíleným kódem, konfigurací a knowledge base továrny:

factory-core/
├── .opencode/
│   ├── agents/
│   ├── hooks/
│   └── skills/
├── schemas/
├── archetypes/
├── stack-catalog.yaml
├── templates/
├── known-patterns/
├── conventions/
└── docs/

Cloned na server jako `~/factory-projects/factory-core/`. Updatuje se
přes git.

Související: [Factory](#factory), [Skill](#skill).

---

## Figma Designer

[Agent](#agent), který generuje kompletní Figma file přes 
[Figma MCP](#figma-mcp) write capability. Vytváří foundation (variables),
components library, pages podle sitemap.

Multimodal model (Gemini 3.1 Pro) pro creative kvalitu.

Použité skills: frontend-design (Anthropic), impeccable, figma-patterns
(custom).

Související: [Figma MCP](#figma-mcp), [Design Phase](#design-phase).

---

## Figma Extractor

[Agent](#agent), který čte schválenou Figma a extrahuje design tokens,
components manifest, page references. Output je strojově čitelný a slouží
jako kontrakt pro frontend-builders.

Související: [Figma MCP](#figma-mcp), [Design Tokens](#design-tokens).

---

## Figma MCP

Model Context Protocol server pro Figma API. Umožňuje agentům:

- **Read** — extract design context, components, variables
- **Write** — vytvářet/upravovat Figma frames, components, variables

Používán v [Design Phase](#design-phase) pro generaci a extraction.

Vyžaduje Figma Professional plan (Dev Mode).

Související: [Figma Designer](#figma-designer), [Design Phase](#design-phase).

---

## Foundation Phase

Fáze projektu po [Design Phase](#design-phase). Inicializuje workspace
ze stack template, generuje base layout a komponenty.

Související: [Phase](#phase), [Build Phase](#build-phase).

---

## Frontend Builder

[Agent](#agent), který staví jednotlivé stránky webu jako Astro/React
komponenty. Univerzální agent se [skill injection](#skill-injection)
podle stack track.

Model: MiniMax M2.7 (best SWE-bench na budgetu).

Související: [Agent](#agent), [Skill](#skill), [Build Phase](#build-phase).

---

## Healer

Specializovaný [agent](#agent) pro řešení neznámých problémů. Volaný,
když jiný agent failne nebo narazí na situaci mimo svou kompetenci.

Healer má dvě role:
1. **Recovery** — zkusí known patterns nebo navrhne řešení
2. **Self-improvement** — po úspěšném vyřešení neznámého patternu
   navrhne přidání do [Known Patterns](#known-patterns) library

Model: GLM-5.1 (reasoning-heavy).

Související: [Known Patterns](#known-patterns), [Escalation](#escalation).

---

## Homelab

Server v Jirkově obýváku. Linux box s Opencode, factory services, 
dashboard. Připojený k internetu přes domácí router (žádný port forwarding,
jen [Cloudflare Tunnel](#cloudflare-tunnel)).

Související: [Cloudflare Tunnel](#cloudflare-tunnel), [Tailscale](#tailscale).

---

## Hook

Pre-tool-use shell skript, který validuje agentovy akce před exekucí.
Centrální security layer (ne v promptech).

Příklad: agent zkusí `Write` do `/etc/passwd` → hook blokuje → log →
escalate.

Žijí v `factory-core/.opencode/hooks/`. Klíčový je `permission-gate.sh`,
který čte `permissions.yaml` a enforce-uje per-agent allow/deny lists.

Související: [Permissions](#permissions), [Agent](#agent).

---

## Human Gate

Bod ve workflow, kdy factory čeká na rozhodnutí Jirky před pokračováním.

Klasické gates:
- Spec approval (po intake)
- Design direction volba (Phase 2a → 2b)
- Figma review (Phase 2b → 2c)
- Animations approval (Phase 7)
- Production deploy approval

Gates se zobrazují v [Dashboard](#dashboard) jako pending decisions.

Související: [Dashboard](#dashboard), [Phase](#phase).

---

## Intake

První ze tří systémů Rychi Design Factory. Běží v Claude Desktop Project,
asistuje Jirkovi během briefu klienta, generuje validovaný [Spec](#spec).

Není to klientský samoobslužný nástroj — Jirka je v procesu.

Související: [Spec](#spec), [Factory](#factory).

---

## Iteration

Jeden run [Orchestrátora](#orchestrátor). Stateless: čte state, rozhodne,
zapíše state, končí.

Související: [Stateless Orchestrator](#stateless-orchestrator).

---

## Jirka

Primary user Rychi Design Factory. Designér, account manager, technický
správce v jedné osobě. Owner Rychi Design.

V dokumentech "Jirka" referuje na uživatele (tebe).

---

## JSON Signal

Strukturovaný JSON output, kterým agenti komunikují s 
[Orchestrátorem](#orchestrátor) a mezi sebou. **Žádný volný text.**

Schemas pro signaly v `factory-core/schemas/agent-signals.schema.json`.

Příklady:
- Auditor result: `{ "status": "passed" | "failed" | "warning", "findings": [...] }`
- Builder result: `{ "status": "complete" | "partial" | "failed", "artifacts_created": [...] }`
- Blocker: `{ "blocker_id": "...", "type": "...", "options": [...] }`

Inspirace: [Dev Squad](https://github.com/johnkf5-ops/the-dev-squad)
pattern.

Související: [Agent](#agent), [Orchestrátor](#orchestrátor).

---

## Known Patterns

Knowledge base v `factory-core/known-patterns/` obsahující řešení
opakujících se problémů (npm errors, Sanity config, deployment issues).

Roste organicky:
1. [Healer](#healer) řeší neznámý problém
2. Po úspěchu navrhne nový pattern do `pending/`
3. [Jirka](#jirka) review → schválené jdou do `approved/`
4. Příští projekty patterns automaticky používají

Self-learning loop, ale s human approval gate.

Související: [Healer](#healer).

---

## Living Document

Dokument, který se mění s projektem. Klíčový je `plan.md` v
`.factory-state/` — checkboxes per phase, agent ho updatuje, orchestrator
čte aktuální stav.

Související: [State](#state).

---

## MCP

Model Context Protocol — standard pro propojení AI agentů s externími
službami. V naší továrně:

- **Figma MCP** — generuje a čte Figma soubory
- **Context7 MCP** — live dokumentace knihoven (Astro, Sanity, atd.)

Související: [Figma MCP](#figma-mcp).

---

## Naming Convention

Striktní pravidla pojmenování mezi Figma komponenty a kódem:

Figma component         →  Code component
Button/Primary/Large    →  <Button variant="primary" size="lg" />
Hero/Centered/Image     →  <HeroCentered withImage />
Card/Service            →  <ServiceCard />

Validátor v factory ověřuje correspondence. Mismatch = blocker.

Související: [Figma MCP](#figma-mcp), [Component Library](#component-library).

---

## Opencode

Agent runtime, na kterém Rychi Design Factory běží. CLI tool s markdown-based
agent definicemi, MCP support, Opencode Go subscription ($10/měsíc =
$60 hodnoty modelů).

Volba mezi alternativami (LangGraph, CrewAI, Pi). Detail v ADR-0001.

Související: [Agent](#agent), [Opencode Go](#opencode-go).

---

## Opencode Go

Subscription tier Opencode, který obsahuje access k modelům GLM-5.1,
Kimi K2.5, MiniMax M2.5/M2.7, Qwen3.5 Plus za $10/měsíc.

Primary model pool pro většinu agentů. Doplněn o Gemini API pro 
specifické use cases (design generation, long context).

Související: [Opencode](#opencode), [Modelová strategie](#modelová-strategie).

---

## Orchestrátor

Centrální [agent](#agent) řídící workflow projektu. Stateless pattern:
každá iterace čte state.json + plan.md, rozhodne next action, spawnuje
specialist agenta, končí.

Model: GLM-5.1.

Klíčové vlastnosti:
- Nikdy nečte surové výstupy agentů — jen [JSON Signals](#json-signal)
- Hard budget checks před každým spawnem
- Atomic writes do state.json
- Decision logging do decisions.jsonl

Související: [Stateless Orchestrator](#stateless-orchestrator),
[Agent](#agent), [JSON Signal](#json-signal).

---

## Permissions

Allow/deny matrix per agent definující, k jakým souborům/příkazům
má přístup. Žije v `factory-core/.opencode/permissions.yaml`.

Enforced through [Hooks](#hook), ne přes prompt instructions.

Příklad:
```yaml
frontend-builder:
  write:
    allow: ["workspace/**", "artifacts/**"]
    deny: ["spec/**", "state.json"]
  bash:
    allow: ["npm *", "git add"]
    deny: ["rm -rf", "sudo *"]
```

Související: [Hook](#hook), [Agent](#agent).

---

## Phase

Logická etapa projektu. Factory má 8 fází:

- **Phase 0:** Bootstrap
- **Phase 1:** Architecture
- **Phase 2:** Design (sub-fáze 2a, 2b, 2c)
- **Phase 3:** Foundation
- **Phase 4:** Content
- **Phase 5:** Build
- **Phase 6:** QA
- **Phase 7:** Polish
- **Phase 8:** Deploy

Každá fáze má entry/exit criteria. Některé mají [Human Gates](#human-gate).

Související: [Plan](#plan), [Human Gate](#human-gate).

---

## Plan

`.factory-state/plan.md` — markdown soubor s checkboxes per [Phase](#phase)
a per task. [Living Document](#living-document) — agenti ho updatují,
orchestrátor čte aktuální stav.

Lock pattern: po schválení design plánu (Phase 2c) je plan.md "locked"
— jakákoli změna vyžaduje explicit unlock.

Související: [Phase](#phase), [Living Document](#living-document).

---

## Polish Phase

Finální fáze před deploy. animation-polish-agent navrhuje subtle 
animations, transitions. [Jirka](#jirka) schvaluje.

Související: [Phase](#phase).

---

## QA Phase

Fáze validace před deploy. Zahrnuje:

- route-auditor (broken links, 404)
- accessibility-auditor (axe-core)
- performance-auditor (Lighthouse)
- ui-consistency-auditor (cross-page checks)
- content-auditor (tone, grammar)
- e2e-test-runner (Playwright)
- code-reviewer

Pokud audit failne, [Healer](#healer) loop.

Související: [Audit](#audit), [Healer](#healer).

---

## Rychi Design

Web design agency Jirky. Cílová firma, pro kterou je továrna stavěna.
URL: `digitaldesigner.cz`.

---

## Sanity

Default CMS pro klientské weby Rychi Design. Hosted service, free tier
pokrývá většinu projektů. ADR-0014 vysvětluje, proč Sanity místo Payload.

Související: [Stack Track](#stack-track), [CMS Builder](#cms-builder).

---

## Skill

Capability package s instrukcemi a tooly, načítaný [agentem](#agent)
on-demand. Žije v `factory-core/.opencode/skills/`.

Skills jsou:
- **Stack-specific:** astro/, nextjs/, sveltekit/, sanity/, payload/
- **Domain-specific:** frontend-design/ (Anthropic), impeccable/, 
  figma-patterns/

Agent dostává relevantní skills jako kontext při spawnu.

Související: [Skill Injection](#skill-injection), [Agent](#agent).

---

## Skill Injection

Pattern, kdy [universal agent](#agent) (např. frontend-builder) dostává
stack-specific [skills](#skill) dynamicky podle [Stack Track](#stack-track)
projektu.

Místo `astro-builder.md`, `nextjs-builder.md`, `sveltekit-builder.md`
máme jeden `frontend-builder.md` + skill injection.

Důvod: udržitelnost. Přidat nový stack = napsat skill, ne napsat agent.

Související: [Skill](#skill), [Stack Track](#stack-track).

---

## Spec

Multi-file structured input z [Intake](#intake), který popisuje 
klientský projekt. Žije v `clients/{project-id}/spec/` jako 8 YAML
souborů + supporting assets:

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

Validovaný proti JSON Schemas. Po validaci je read-only pro factory.

Související: [Intake](#intake), [Spec Validator](#spec-validator).

---

## Spec Validator

CLI tool a [agent](#agent), který validuje [Spec](#spec) proti JSON
Schemas. Run automaticky při bootstrap fázi a manuálně přes 
`spec-validate` command.

Související: [Spec](#spec).

---

## SSE — Server-Sent Events

Jednosměrný real-time stream z serveru do prohlížeče. Použito pro
[Dashboard](#dashboard) live updates (agent activity, logs, metrics).

Lighter weight než WebSockets, dostatečné pro náš use case.

Související: [Dashboard](#dashboard).

---

## Stack Catalog

`factory-core/stack-catalog.yaml` — definice supported [Stack Tracks](#stack-track)
s metadaty (typ, best_for, required_skills, deployment options).

Architect agent vybírá track podle Spec. Default: astro-sanity.

V1 tracks: astro-sanity, astro-payload, nextjs-sanity, webflow.

Související: [Stack Track](#stack-track).

---

## Stack Track

Konkrétní kombinace technologií pro klientský web (frontend framework
+ CMS + deployment). 

Každý track má:
- Type (content-static, content-dynamic, ecommerce, no-code)
- Best-for use cases
- Required skills (jaké [skills](#skill) builder potřebuje)
- Deployment options

Default: astro-sanity. Alternative: astro-payload, nextjs-sanity, atd.

Související: [Stack Catalog](#stack-catalog), [Content Track](#content-track).

---

## State

`.factory-state/state.json` — strukturovaný JSON s aktuálním stavem
projektu. Čten/zapisován [Orchestrátorem](#orchestrátor) každou iterací.

Schema definuje pole: schema_version, project_id, phase, plan_progress,
active_work, recent_decisions, blockers, health, last_iteration.

Atomic writes (write to .tmp, rename) pro crash safety.

Související: [Stateless Orchestrator](#stateless-orchestrator),
[Living Document](#living-document).

---

## Stateless Orchestrator

Pattern, kdy [Orchestrátor](#orchestrátor) si nepamatuje nic mezi
iteracemi. Každý run:

1. Read state.json
2. Read plan.md
3. Read last 5 decisions z decisions.jsonl
4. Rozhodne next action
5. Zapíše state, decision, končí

Důvody: context window management, recovery, debug, restart idempotence.

Související: [Orchestrátor](#orchestrátor), [State](#state).

---

## systemd

Service manager na Linuxu. Použit pro řízení factory services:

- `factory@.service` — template service per projekt
- `factory-api.service` — dashboard backend
- `factory-dashboard.service` — dashboard frontend
- `cloudflared.service` — Cloudflare Tunnel daemon

Auto-restart, logging, environment management.

---

## Tailscale

Privátní mesh VPN mezi Jirkou laptop, telefon, server. Použito pro
emergency SSH access (pokud Cloudflare selže) a pokročilé debugging.

Backup k [Cloudflare Tunnel](#cloudflare-tunnel), ne primární access path.

---

## Token Budget

Hard limit na množství tokenů, které [agent](#agent) může spotřebovat
v jedné invokaci nebo projekt v celku.

Definováno v:
- Per-agent v agent definici (max_tokens_per_invocation)
- Per-projekt v `spec/constraints.yaml` (max_tokens_total, max_dollar_cost)

Překročení = auto-stop nebo escalation.

Související: [Agent](#agent), [Escalation](#escalation).

---

## Universal Agent

[Agent](#agent), který pracuje přes různé [Stack Tracks](#stack-track)
pomocí [Skill Injection](#skill-injection). Místo agent per stack
máme jeden agent + skill per stack.

Příklady: `frontend-builder` (Astro / Next.js / SvelteKit přes skills),
`cms-builder` (Sanity / Payload přes skills).

Související: [Agent](#agent), [Skill Injection](#skill-injection).

---

## Wave

Implementační fáze projektu Rychi Design Factory (ne fáze klientského
projektu, ta se nazývá [Phase](#phase)).

V1 plán má 6 wave:
- Wave 1: Foundation
- Wave 2: Intake MVP
- Wave 3: Factory Skeleton
- Wave 4: Design Integration
- Wave 5: Dashboard + Autonomy
- Wave 6: First real project

Detail v ROADMAP.md.

Související: [Phase](#phase).

---

## Workspace

`.factory-state/workspace/` — adresář s aktuálním kódem klientského
webu. Tady frontend-builders pracují, tady běží `npm run dev`,
tady se commituje do git.

Související: [Build Phase](#build-phase).

---

## YAGNI

You Aren't Gonna Need It — princip software developmentu odmítající
předčasné features. Klíčový pro factory development: stavíme jen co
reálně potřebujeme, rozšiřujeme podle dat z provozu.

Souvisí s [principem](#principy) "Minimum viable, iterate later".

---

## Změny tohoto dokumentu

Termíny přibývají organicky během vývoje. Pravidla:
- Nové termíny přidat při zavedení do kódu/dokumentace
- Updatovat existující při změně významu
- Křížové odkazy udržovat aktuální

### Changelog

- **1.0** (2026-04-25): Initial verze, ~70 termínů z architektonické
  konverzace.
