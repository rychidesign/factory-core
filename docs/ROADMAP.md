# Rychi Design Factory — Implementation Roadmap

**Version:** 1.0  
**Last updated:** 2026-04-25  
**Owner:** Jirka (Rychi Design)  
**Status:** Pre-implementation, ready to start

---

## Účel tohoto dokumentu

ROADMAP.md popisuje **co a v jakém pořadí stavíme**. Když se ráno
posadíš k práci a nevíš, kde pokračovat, podíváš se sem.

Pro **co produkt dělá** viz PRD.md. Pro **jak je to postavené** viz
ARCHITECTURE.md. Pro **proč jsme zvolili konkrétní řešení** viz
DECISIONS.md.

Tento dokument je **living document** — průběžně updatuj progress,
posouvej milníky podle reálu, zaznamenávej learnings.

---

## Filosofie výstavby

Než se vrhneme na konkrétní kroky, tři principy, které jsou závazné:

### Walking skeleton, pak rozvoj

Nejdřív stavíme **nejtenčí možnou verzi end-to-end**: minimální intake
→ minimální factory → minimální dashboard. Spustíme to, ověříme funkční
flow. Pak postupně přidáváme svalstvo na kostru, která už chodí.

To je opak "nejdřív dokončíme intake, pak factory, pak dashboard" —
takový postup obvykle skončí s nepoužitelnými komponentami, které spolu
nekomunikují.

### Real project validation early

Po každé Wave spustíme **skutečný projekt** (může být testovací — třeba
update Jirkova portfolia, fiktivní firma, případně reálný malý klient).
Teorie je mrtvá bez provozního ohně.

### Každý artefakt má jasný exit criterion

Nic není "hotové", dokud nemáme **konkrétní test**, který dokazuje, že
to funguje. Dokument, který nikdo nepoužil, je jen literatura.

---

## Vysoký pohled — 6 wave

Wave 1: Foundation              (2 týdny)   ┐
→ Schemas, conventions, infra  ┘
│
Wave 2: Intake MVP               (2 týdny)   ┐
→ Claude Desktop intake fungující         │
│
Wave 3: Factory Skeleton         (3 týdny)   ┐
→ Walking skeleton: spec → web na staging │
│
Wave 4: Design Integration       (3 týdny)   ┐
→ Figma MCP, AI design, kvalitní výstup  │
│
Wave 5: Dashboard + Autonomy     (3 týdny)   ┐
→ Observability, control, self-healing    │
│
Wave 6: First real project       (2-3 týdny) ┐
→ Reálný klient, lessons learned          │
│
↓
Maturity (V1.x), iterations, growth

**Realistický total: 15-17 týdnů ≈ 4 měsíce.**

Tohle je při konzistentní práci ~10-20 hodin týdně. Pokud máš méně
času, počítej proporcionálně déle.

---

# Wave 1: Foundation

**Goal:** Mít pevné kontrakty a infrastrukturu, na které se dá stavět.

**Duration:** 2 týdny

**Exit criteria:**
- Factory-core repo na GitHubu
- Všechny spec schemas validují příklady
- Stack catalog s alespoň 1 funkčním tracky (astro-sanity)
- Permission matrix definovaná
- Server připravený (cloudflared, systemd, factory user)

---

## Krok 1.1 — Git repo a struktura

**Doba:** 1 den

**Deliverables:**
- Factory-core git repo (privátní GitHub)
- Adresářová struktura podle ARCHITECTURE.md sekce 2.1
- README.md, LICENSE, .gitignore
- Commit message conventions document
- Server-side mirror approach (clone na server)

**Test:** `git clone` na serveru → `tree` ukazuje očekávanou strukturu.

**Co potřebuješ od sebe:**
- GitHub account/org pro repo
- SSH klíč pro server access

**Notes:**
- Tento krok je čistá administrativa, ale je to **fyzický základ**
- Všechny další kroky předpokládají existenci tohoto repa

---

## Krok 1.2 — Spec schemas

**Doba:** 3 dny

**Deliverables:**
- 8 JSON Schemas v `factory-core/schemas/spec/`:
  - `meta.schema.json`
  - `business.schema.json`
  - `audience.schema.json`
  - `goals.schema.json`
  - `scope.schema.json`
  - `stack.schema.json`
  - `design-direction.schema.json`
  - `constraints.schema.json`
- Validační CLI tool: `tools/spec-validate`
- 2-3 referenční příklady v `examples/specs/`
- Dokumentace každého pole v `docs/reference/spec-schema.md`

**Test:** Ručně napsaný spec projde validátorem, chybějící required
pole dává čitelné chyby.

**Co potřebuješ od sebe:**
- Tvoji aktuální klientela jako reference (anonymizováno) — jaké
  informace běžně sbíráš
- Review schemas: chybí pole X? Tohle pole nepotřebuji?

**Notes:**
- Tohle je **kritický kontrakt** — všechno další (intake, factory)
  na něm staví
- Schemas musí být dostatečně flexibilní (cover edge cases) ale
  dostatečně rigidní (catch errors)
- Použij `ajv` pro validation (industry standard, fast)

---

## Krok 1.3 — State a plan schemas

**Doba:** 2 dny

**Deliverables:**
- `state.schema.json` — JSON Schema pro state.json
- `plan-format.md` — specifikace plan.md formátu (markdown s checkboxes)
- Schemas pro JSON Signals v `schemas/agent-signals/`:
  - `auditor-result.schema.json`
  - `builder-result.schema.json`
  - `blocker.schema.json`
  - `orchestrator-decision.schema.json`
- `decisions-log.schema.json` pro decisions.jsonl entries
- 1-2 příklady každého formátu

**Test:** Ručně napsaný state.json, plan.md, ukázkové signály —
vše projde validací.

**Notes:**
- Plan.md format má strukturu, ale je markdown (human-readable +
  parseable). Používáme `<!-- factory-meta: {...} -->` pro embedded
  metadata
- Atomic write pattern documented v `docs/reference/state-management.md`

---

## Krok 1.4 — Stack catalog & first template

**Doba:** 2 dny

**Deliverables:**
- `factory-core/stack-catalog.yaml` se 4 entries:
  - astro-sanity (full)
  - astro-payload (full)
  - nextjs-sanity (full)
  - webflow (placeholder)
- `templates/astro-sanity/` — funkční Astro 5 + Sanity skeleton
  - Astro config, Tailwind 4, shadcn/ui setup
  - Sanity client setup
  - Base layout component
  - Working `npm run dev`
- Dokumentace v `docs/how-to/use-astro-sanity-template.md`

**Test:** `git clone` template → `npm install` → `npm run dev` →
funkční localhost:4321 s Astro welcome page.

**Co potřebuješ od sebe:**
- Tvoje existing Astro projekty jako reference (jak chceš template
  vypadat)
- Sanity account (free tier) pro testing

**Notes:**
- Template je **starting point** pro every nový projekt
- Musí být minimální (no scope creep) ale battery-included
- Conventions v template odráží tvoje preference (eat your own dogfood)

---

## Krok 1.5 — Archetypes catalog

**Doba:** 2 dny

**Deliverables:**
- 5 archetype YAML v `factory-core/archetypes/`:
  - `small-b2b-services.yaml`
  - `ecommerce-small.yaml`
  - `portfolio-creative.yaml`
  - `restaurant-hospitality.yaml`
  - `saas-landing.yaml`
- Každý obsahuje:
  - Keywords pro detection
  - Typical scope
  - Common gotchas
  - Priority questions for intake
  - Suggested stack track

**Test:** Procházíme spolu 3 tvoje předchozí projekty. Sedí archetype
definice na ně? Když ne, upravujeme.

**Co potřebuješ od sebe:**
- Tvoje zkušenost: jaké typy klientů nejčastěji?
- Red flags z minulosti

**Notes:**
- Archetypy jsou **living artifacts** — během reálného provozu se
  budou refinovat
- Better mít 5 dobrých než 15 generických

---

## Krok 1.6 — Permissions matrix a hooks

**Doba:** 2 dny

**Deliverables:**
- `factory-core/.opencode/permissions.yaml` s entries pro plánované
  agenty (orchestrator, frontend-builder, design-auditor, healer, ...)
- `factory-core/.opencode/hooks/permission-gate.sh`
- `factory-core/.opencode/hooks/post-tool-use.sh` (audit + token counter)
- Test scenario: simulace agent s deny → hook blokuje

**Test:** Manuální simulace — spawn agent test process, attempt
disallowed action, hook returns exit 1 + logs.

**Notes:**
- Permission matrix bude evolve s každým novým agentem
- Hook scripts musí být fast (< 50ms overhead per call)
- Audit log v `factory-logs/permission-audit.jsonl`

---

## Krok 1.7 — Server preparation

**Doba:** 1 den

**Deliverables:**
- Linux user `factory` na serveru
- Directory structure: `~/factory-projects/factory-core/`, `clients/`
- `~/.config/factory/secrets.env` s placeholders
- `cloudflared` installed + tunnel created
- `factory.digitaldesigner.cz` DNS routed
- Cloudflare Access policy: jen tvůj email
- Tailscale installed jako backup
- systemd service templates pre-defined (zatím empty)
- Git pulled factory-core na server

**Test:** SSH na server jako user factory, `cd factory-projects`, vidíš
strukturu. Cloudflare Tunnel UP, ale zatím nic na localhost:3000 (404).

**Co potřebuješ od sebe:**
- Server access (SSH key)
- Cloudflare API token nebo dashboard access
- Decision o domain (potvrdili jsme factory.digitaldesigner.cz)

**Notes:**
- Tohle je infrastruktura — nudné, ale fundamentální
- Každý další wave předpokládá tento setup

---

## Wave 1 checkpoint

**Po Wave 1 máš:**
- Git repo s jasnou strukturou na GitHubu i serveru
- Validátor ověřené spec schemas (vše validuje)
- Astro+Sanity template, který funguje out of the box
- 5 archetypes s priority questions
- Permission matrix + hooks ready to use
- Server připravený (cloudflared, systemd, user)

**Co ještě nefunguje:**
- Žádný agent ještě neexistuje
- Intake není napsaný
- Žádný real workflow neproběhl

**Tvůj real-world check:**
Vezmi ručně napsaný spec example a spusť:
```bash
./tools/spec-validate examples/specs/acme-corp/
```
Mělo by skončit "✓ Valid spec".

---

# Wave 2: Intake MVP

**Goal:** Claude Desktop Project, který z konverzace s klientem vytvoří
validovaný spec.

**Duration:** 2 týdny

**Exit criteria:**
- Claude Desktop Project konfigurován s system promptem
- Project files uploaded (archetypes, schemas, examples)
- Generuje validní spec ze test scénářů
- Workflow guide existuje a funguje

---

## Krok 2.1 — Intake system prompt

**Doba:** 3 dny

**Deliverables:**
- `factory-core/intake/system-prompt.md` — master instructions:
  - Role definition (asistent pro Jirku, ne pro klienta)
  - Mental model (mluví s klientem, generuje spec)
  - Conversation phases (warm-up → archetype detection → progressive
    questions → spec generation → review)
  - Archetype detection logic
  - Progressive question asking pattern
  - Red flag detection rules
  - Spec generation instructions
  - Output format requirements
- `factory-core/intake/conventions.md` — tone of voice, language
  preferences, pricing guidelines (Czech)
- `factory-core/intake/red-flags.md` — typické problematické signály

**Test:** Ty fiktivní klient, AI vede konverzaci. Po skončení vznikne
spec, který projde validátorem.

**Co potřebuješ od sebe:**
- 2-3 sessions zkoušení na fiktivních klientech
- Feedback: ptá se blbě? Přeskočil tohle? Měl by víc?

**Notes:**
- Tohle je **emergentní práce** — system prompt se ladí iterativně
- Dobrý intake není o questions list, je o intelligence pattern detection
- Klient by neměl cítit, že je "vyslýchán"

---

## Krok 2.2 — Claude Desktop Project setup

**Doba:** 1 den

**Deliverables:**
- Vytvořený Claude Desktop Project "Rychi Factory Intake"
- Uploaded project files:
  - system-prompt.md
  - 5 archetypes (kopie z factory-core)
  - 8 spec schemas (kopie z factory-core)
  - stack-catalog.yaml
  - 3 příklady spec (z examples/specs/)
  - conventions.md
- Custom instructions nastavené
- Test conversation s archetype detection works

**Test:** Spustíš novou konverzaci, AI tě pozdraví v češtině,
ihned rozumí roli ("asistent během intake klienta").

**Notes:**
- Claude Desktop Projects mají limit na project files — ověř že
  vše vejde
- Custom instructions: jazyk (Czech), role, persona

---

## Krok 2.3 — Workflow & transfer

**Doba:** 2 dny

**Deliverables:**
- `docs/how-to/conduct-intake.md` — guide pro Jirku jak vést intake
- `docs/how-to/transfer-spec-to-server.md` — workflow z Claude Desktop
  na server
- `tools/factory-new-project` skript:
```bash
  factory-new-project <project-id>
  # Creates: clients/<project-id>/spec/, client-assets/, etc.
  # Validates spec
  # Initializes git repo
```
- Auto-validace při příjmu

**Test:** Kompletní flow: Claude Desktop intake → export souborů →
transfer na server (scp nebo git) → `factory-new-project` → vše
validní, repo initialized.

**Notes:**
- Transfer mechanism: zatím manual (scp). Auto sync optional later.
- Project ID convention: `<klient-name>-<year>` (např. `acme-corp-2026`)

---

## Krok 2.4 — První reálný intake

**Doba:** 2-3 dny (záleží na klientovi)

**Goal:** Otestovat intake na **skutečném projektu**.

**Možnosti:**
- Tvůj vlastní chystaný projekt (update portfolia)
- Reálný malý klient s ochotou být "guinea pig"
- Fiktivní ale velmi realistický brief

**Deliverables:**
- Validovaný, kompletní spec
- Lessons learned dokumentované v `docs/intake-learnings.md`
- Refinements do system promptu (pokud potřeba)

**Test:** Spec je realistický, mohl by reálně sloužit jako vstup pro
factory build (i kdybychom ho zatím nestavili).

**Notes:**
- Tohle je první **reality check** projektu
- Buď ochotný iterovat system prompt po této zkušenosti

---

## Wave 2 checkpoint

**Po Wave 2 máš:**
- Funkční Claude Desktop Project pro intake
- Workflow pro transfer na server
- 1 reálný spec jako test data pro Wave 3
- System prompt vyladěný na Czech context

**Důležitý milník:**
Intake je **plně funkční nezávisle na zbytku factory**. Už ti šetří
čas na briefingu, i když factory ještě nestaví. Můžeš ho používat
denně.

---

# Wave 3: Factory Skeleton

**Goal:** Walking skeleton — minimální end-to-end Factory, která ze
spec postaví jednoduchý web. Ne krásný, ne inteligentní, ale **funkční
end-to-end**.

**Duration:** 3 týdny

**Exit criteria:**
- Factory dokončí test projekt od bootstrap po deploy
- Web je dostupný na staging URL
- Bez Figma integrace zatím (generic styling)
- Recovery z padu funguje

---

## Krok 3.1 — Orchestrator V1

**Doba:** 4 dny

**Deliverables:**
- `factory-core/.opencode/agents/orchestrator.md` — system prompt
  - Stateless pattern enforced
  - JSON Signal output strict
  - Decision logging
  - Phase awareness
- `factory-core/.opencode/agents/bootstrap-agent.md` — initial setup
  - Validate spec
  - Create .factory-state/ structure
  - Generate skeleton plan.md
- Minimální orchestrator iteration loop:
  1. Read state.json + plan.md
  2. Read recent decisions
  3. Decide next action
  4. Spawn appropriate agent OR advance phase
  5. Update state, commit
- `tools/factory-runner` — entry point pro systemd service

**Test:** Ručně spustíš factory s test specem, orchestrátor:
- Validuje spec
- Vytvoří .factory-state/
- Vygeneruje plan.md
- Identifikuje next action (např. spawn architect)
- Zaloguje decision

**Notes:**
- V1 je deliberately tenký — žádné fancy features
- Cíl: **prokázat že stateless pattern funguje**
- Iterace overhead < 5 sekund

---

## Krok 3.2 — Architect agents

**Doba:** 3 dny

**Deliverables:**
- `architect-structure.md` — generuje sitemap, content model
- `architect-technical.md` — confirmuje stack, identifikuje deps
- Output artifacts:
  - `.factory-state/artifacts/architecture/sitemap.json`
  - `.factory-state/artifacts/architecture/content-model.json`
  - `.factory-state/artifacts/architecture/technical-plan.md`

**Test:** Po orchestrator spawn → architect běží → výstupy existují
a jsou strukturované.

**Notes:**
- Architect ve V1 "rozhoduje sám" (decide-then-document)
- Pokročilejší human gate v Phase 2 designu — tady nepotřeba

---

## Krok 3.3 — Minimal builders

**Doba:** 5 dnů

**Deliverables:**
- `frontend-builder.md` (univerzální, s astro skill v 3.3)
- `cms-builder.md` (univerzální, se sanity skill)
- `deployer.md` (Cloudflare Pages první)
- Skill files:
  - `factory-core/.opencode/skills/astro/SKILL.md`
  - `factory-core/.opencode/skills/sanity/SKILL.md`
- Builders staví bez Figma reference (Wave 4 přidá)
  - Generic Tailwind styling
  - Komponenty z shadcn/ui
  - Žádné design tokens

**Test:** Factory postaví 5-stránkový test web:
- Homepage
- About
- Services
- Contact
- 404

Web funguje (`npm run dev`), žádné errors.

**Notes:**
- Estetická kvalita V3 = "ošklivý ale funkční"
- Cíl je **prokázat workflow**, ne vyrobit krásu
- Wave 4 přidá Figma → kvalitní design

---

## Krok 3.4 — Deploy & first real run

**Doba:** 3 dny

**Deliverables:**
- Cloudflare Pages integration v deployer agentu
- Staging URL automatically generated
- `tools/factory` CLI s commands:
  - `factory new <project-id>`
  - `factory start <project-id>`
  - `factory pause <project-id>`
  - `factory resume <project-id>`
  - `factory status <project-id>`
- systemd factory@.service template installed
- První real end-to-end run na test projektu

**Test:** `factory start test-project` → factory autonomously runs →
po ~30 minutách je web na `https://test-project.pages.dev`.

**Co potřebuješ od sebe:**
- 2-4 hodiny supervize prvního běhu
- Patience — pravděpodobně 2-3 retries kvůli edge cases

**Notes:**
- Tohle je **walking skeleton moment**
- Po tomto kroku factory reálně funguje, i když ošklivě
- Lessons learned do BACKLOG.md a known-patterns/

---

## Krok 3.5 — Healer V1 a known patterns seed

**Doba:** 3 dny

**Deliverables:**
- `healer.md` system prompt s basic recovery logic
- Initial `known-patterns/approved/` s 5-10 patterns:
  - npm-install-failures.md
  - sanity-config-issues.md
  - astro-build-errors.md
  - cloudflare-pages-deploy.md
  - tailwind-class-issues.md
- Pattern matching algoritmus (text-based V1)
- Self-improvement loop (healer → pending → approve)

**Test:** Uměle vyvolám failure (smaz node_modules mid-build), healer
detekuje, aplikuje pattern, recovers.

**Notes:**
- Patterns seed přijde z reálných failures během Krok 3.4
- Self-improvement = stretch goal v V1, basic recovery primary

---

## Wave 3 checkpoint

**Po Wave 3 máš:**
- Funkční factory: spec → web na staging
- Walking skeleton, kostra chodí
- 1 reálný test web nasazen
- Healer řeší běžné problémy
- Architecture validated

**Co ještě nefunguje:**
- Web je esteticky surový (no design)
- Žádný dashboard
- Limitované audity
- Manuální monitoring

**Důležitý milník:**
Factory **fyzicky existuje a produkuje weby**. Od teď přidáváme
kvalitu, ne fundamentální features.

---

# Wave 4: Design Integration

**Goal:** Factory produkuje **krásné** weby s AI-generovaným Figma designem.

**Duration:** 3 týdny

**Exit criteria:**
- Figma MCP integrace funkční (read + write)
- Design phase 2a/2b/2c běží
- Frontend builders používají design tokens z Figma
- Web kvalita srovnatelná s ručně designovaným za 2 dny

---

## Krok 4.1 — Figma MCP setup

**Doba:** 2 dny

**Deliverables:**
- Figma MCP server installed na serveru
- Authentication setup (Figma personal access token)
- Test skript: agent přes MCP vytvoří test Figma file s 1 komponentou
- Starter Figma template (prázdný file s pre-configured pages)
- Dokumentace v `docs/how-to/figma-mcp-setup.md`

**Test:** Agent process volá MCP tool, vytvoří Figma file, file
viditelný v Figma účtu.

**Co potřebuješ od sebe:**
- Figma Professional plan (nezbytné pro Dev Mode + MCP)
- Figma personal access token

**Notes:**
- Toto je risk point — Figma MCP write capability musí fungovat
- Pokud ne, fallback: manuální Figma + skip 2b sub-phase

---

## Krok 4.2 — Design director agent

**Doba:** 3 dny

**Deliverables:**
- `design-director.md` system prompt
- Skills loaded:
  - `frontend-design/` (Anthropic, vendored)
  - `impeccable/` (third-party)
- Workflow: input spec → output 3 directions
- Direction format:
  - Description (prose)
  - Typography choice (specific fonts, ne Inter/Roboto)
  - Color principle s hex
  - Aesthetic direction
  - Mood keywords
  - 1 ukázková komponenta jako preview (v Figmě)
- Reference scraping (Puppeteer) pro mood boards

**Test:** Pro test spec generuje 3 directions, každá má distinct
aesthetic. Mood boards vygenerované.

**Notes:**
- Output kvalita závisí na multimodal model (Kimi K2.5)
- Refinement během reálných projektů

---

## Krok 4.3 — Figma designer agent

**Doba:** 5 dnů

**Deliverables:**
- `figma-designer.md` system prompt
- Custom skill: `factory-core/.opencode/skills/figma-patterns/`
  - SKILL.md with Figma conventions
  - Auto Layout patterns
  - Variables usage
  - Naming convention rules
  - learnings/ subdirectory pro self-improvement
- Workflow: chosen direction → kompletní Figma file
  - Foundation page (variables)
  - Components page (atoms, molecules, organisms)
  - Pages page (every page from sitemap)
- Error recovery pro Figma API issues

**Test:** Pro test spec vygeneruje kompletní Figma file s 10+ stránkami,
vlastní variables, 18+ komponent.

**Co potřebuješ od sebe:**
- Iterace — prvních několik výstupů budou mít chyby
- Tvůj designérský vkus pro ladění skill patterns
- Gemini API klíč (model: Gemini 3.1 Pro pro nejvyšší kvalitu)

**Notes:**
- Toto je **největší kvalitativní pivot projektu**
- Po tomto kroku Factory produkuje produkčně použitelné výstupy
- Self-learning loop kritický pro postupné zlepšování

---

## Krok 4.4 — Figma extractor a build integration

**Doba:** 3 dny

**Deliverables:**
- `figma-extractor.md` agent
- Po schváleném designu extrahuje:
  - design-tokens.json (z Figma variables)
  - components-manifest.json (z Components page)
  - page-references/ (screenshots + node IDs)
- Updated frontend-builder s reading těchto artifacts
- Tailwind config auto-generated z tokens
- Naming convention validator: `tools/validate-naming`

**Test:** Build phase po designu produkuje kód, který reálně odpovídá
Figma designu (visual diff < 5%).

**Notes:**
- Naming convention = kritický kontrakt
- Mismatch = blocker, ne silent fallback

---

## Krok 4.5 — První design-driven projekt

**Doba:** 3 dny

**Goal:** Projet full flow s Figma designem na test projektu.

**Workflow:**
1. Intake (Claude Desktop) → spec
2. Transfer → server
3. `factory start test-project-2`
4. Phase 2a: 3 directions → ty volíš v test mode
5. Phase 2b: Figma generation → ty review v Figmě, drobné úpravy
6. Phase 2c: Lock & extract
7. Phase 3-8: full build, audits, deploy

**Test:** Web na staging má kvalitu srovnatelnou s tím, co bys
udělal manuálně za 2 dny intensivní práce.

**Co potřebuješ od sebe:**
- Aktivní review v každé fázi
- Honest assessment kvality
- Lessons learned do figma-patterns/learnings/

**Notes:**
- Tohle je **production-readiness checkpoint**
- Pokud kvalita neodpovídá, iterujeme design-director a figma-designer
  prompts než pokračujeme

---

## Wave 4 checkpoint

**Po Wave 4 máš:**
- Factory produkuje weby s AI-generovaným designem
- Figma je tvůj review/edit nástroj
- Production-grade output quality
- Self-improving figma-patterns library začíná

**Důležitý milník:**
Factory přestává být prototyp a stává se **použitelným production toolem**.

---

# Wave 5: Dashboard + Autonomy

**Goal:** Plná observability + control + self-healing pro skutečnou
autonomii.

**Duration:** 3 týdny

**Exit criteria:**
- Dashboard MVP na factory.digitaldesigner.cz
- Live event feed funguje
- Start/stop/pause z UI
- QA fáze kompletní
- Telegram bot funkční
- Factory běží přes noc bez supervize

---

## Krok 5.1 — Dashboard backend

**Doba:** 3 dny

**Deliverables:**
- `factory-dashboard/` git repo (separate)
- Astro hybrid mode setup
- API endpoints:
  - `GET /api/projects` — list
  - `GET /api/projects/[id]/state` — current state
  - `GET /api/projects/[id]/stream` — SSE
  - `POST /api/projects/[id]/start|pause|resume|stop`
  - `POST /api/projects/[id]/blockers/[bid]/resolve`
  - `GET /api/system/metrics` — CPU/RAM/disk
- File watching pro state.json changes
- systemctl wrapper pro safe operations
- Cloudflare Tunnel routing setup

**Test:** API responses obsahují real data z běžící factory. SSE
stream functional.

**Co potřebuješ od sebe:**
- Cloudflare Access policy potvrzení (jen tvůj email)

**Notes:**
- API design má být minimal V1, expandovat dle potřeby
- SSE preferred over WebSocket pro simplicity

---

## Krok 5.2 — Dashboard frontend MVP

**Doba:** 5 dnů

**Deliverables:**
- Project list view
- Project detail view s plan progress
- Live event feed (SSE)
- Agent graph (simple visualization)
- Server metrics widget
- Token/cost tracking widget
- Start/stop/pause buttons s confirmation
- Blocker resolution UI s typed components:
  - CopyVariants resolver
  - DesignVariants resolver
  - MissingInfo form
  - ScopeChange diff view
- Mobile responsive (375px+)
- Dark mode (default)

**Test:** Celý projekt sleduješ a ovládáš z dashboardu, žádný SSH
nutný.

**Co potřebuješ od sebe:**
- Feedback na UI (toto je tvůj nástroj)
- Iterace pro UX polish

**Notes:**
- Eat your own dogfood: dashboard staví stejnými nástroji jako
  klientské weby
- Agent graph: D3.js nebo react-flow

---

## Krok 5.3 — QA fáze agents

**Doba:** 4 dny

**Deliverables:**
- 7 audit agents:
  - `route-auditor` (broken links, 404s)
  - `accessibility-auditor` (axe-core integration)
  - `performance-auditor` (Lighthouse CI)
  - `ui-consistency-auditor` (cross-page checks)
  - `content-auditor` (tone, grammar)
  - `e2e-test-runner` (Playwright smoke tests)
  - `code-reviewer` (code quality)
- Audit phase orchestration
- Auto-healing loop pro failed audits
- `animation-polish-agent` pro Phase 7

**Test:** Test projekt prochází všemi audity před deploy. Failed
audits trigger healing nebo blocker.

**Notes:**
- Audity jsou **kritické pro kvalitu** — neskip
- Each audit má clear pass/fail criteria

---

## Krok 5.4 — Telegram bot a escalation

**Doba:** 3 dny

**Deliverables:**
- Telegram bot setup (BotFather)
- Bot integrace s factory:
  - Receive notifications (Level 3 alerts)
  - Send acknowledgments
  - Trigger pause/resume přes message
- Escalation engine:
  - Level 0/1: auto, no notification
  - Level 2: queued for digest
  - Level 3: immediate Telegram
- Daily digest email/Telegram (Level 2 aggregated)
- Configurable thresholds v constraints.yaml

**Test:** Factory uměle triggeruje escalation, Telegram bot pošle
zprávu, klikneš "Pause", factory pauzuje.

**Co potřebuješ od sebe:**
- Telegram bot token
- Tvoje Telegram chat ID
- Pravidla pro alerty

**Notes:**
- Telegram fatigue prevention: max 1-2 Level 3 per day
- Daily digest přijde ráno (configurable)

---

## Krok 5.5 — Overnight autonomy test

**Doba:** 2 dny

**Goal:** Factory běží přes noc bez supervize na test projektu.

**Workflow:**
1. Spustíš nový test projekt večer
2. Zavřeš laptop
3. Ráno otevřeš dashboard
4. Vidíš: aktuální stav, decisions log, případné blockery

**Test criteria:**
- Žádný hard crash
- Maximum 1 Level 3 alert během noci (idealně 0)
- Daily digest emailem ráno
- Factory pokročila významně v plánu
- Recovery scenarios: simulace internet outage, healer functioning

**Notes:**
- Pokud factory padne hardly, refinement je nutný před Wave 6
- Klíčový "real autonomy" milník

---

## Wave 5 checkpoint

**Po Wave 5 máš:**
- Plně funkční dashboard
- Factory běží autonomně
- QA zajišťuje kvalitu
- Telegram alerts funkční
- Můžeš zavřít laptop a věřit

**Důležitý milník:**
**Factory je production-ready pro reálný klientský projekt.**

---

# Wave 6: First real project

**Goal:** Reálný klient. Reálná zkušenost. Reálné lessons learned.

**Duration:** 2-3 týdny

**Exit criteria:**
- Klientský web na produkci
- Klient akceptoval výstup
- Tvůj čas: < 8 hodin total
- Factory zachytila lessons learned

---

## Krok 6.1 — Real client intake

**Doba:** 1-2 dny

**Workflow:**
- Zvolíš klienta (existing nebo new) ochotného být součástí pilot programu
- Briefing s Claude Desktop intake
- Spec generated, validated
- Klient transparentně informován o AI-assisted process

**Test:** Spec compl, klient se cítí, že byl vyslechnut.

**Notes:**
- Klient pricing: standard nebo discounted (jak chceš pozicovat pilot)
- Transparency: říct, že je to první projekt s novým procesem

---

## Krok 6.2 — Real factory run

**Doba:** 3-7 dnů (záleží na size projektu a iterations)

**Workflow:**
- Spustíš factory
- Supervize během human gates:
  - Direction choice
  - Figma review/edit
  - Animation approval
  - Staging review
  - Production approval
- Sleduješ dashboard
- Řešíš blockery včas

**Test:** Web kompletní, deployed na staging.

**Co potřebuješ od sebe:**
- Active engagement (max 8 hodin spread across týdne)
- Honest assessment kvality v každém human gate

**Notes:**
- Notes do journálu: co fungovalo, co ne
- Pattern proposals review

---

## Krok 6.3 — Client review & iteration

**Doba:** 3-5 dnů

**Workflow:**
- Klient review staging
- Feedback, change requests
- Iterace přes factory (re-run dotčených stránek)
- Final approval

**Test:** Klient vyjadřuje spokojenost.

**Notes:**
- První projekt často potřebuje víc iterací — buď trpělivý
- Lessons learned důležitější než časový rekord

---

## Krok 6.4 — Production deploy & post-mortem

**Doba:** 1-2 dny

**Workflow:**
- Production deploy přes dashboard
- DNS handoff klientovi
- Final delivery
- **Post-mortem session** (sám se sebou nebo s mentorem):
  - Co fungovalo skvěle?
  - Co bylo bottleneck?
  - Které agenty potřebují refinement?
  - Které patterns přidat?

**Deliverables:**
- Live klientský web
- `docs/post-mortems/<project-id>.md`
- Updated `factory-core/known-patterns/approved/`
- Updated archetypes pokud potřeba
- BACKLOG.md updated s lessons

**Test:** Klient happy, tvůj čas < 8 hodin total, lessons captured.

**Notes:**
- Tohle je **transformační moment** — factory provedla reálný projekt
- Confidence boost pro další klienty

---

## Wave 6 checkpoint

**Po Wave 6 máš:**
- 1 real client project shipped
- Validated process end-to-end
- Knowledge base growing
- Confidence v factory

**Důležitý milník:**
Factory je **proven business asset**, ne experiment.

---

# Beyond V1: Maturity & Growth

Po Wave 6 přichází fáze otevřená podle reálu:

## Maturity period (months 5-7)

- 3-5 dalších real projektů
- Iterace na pain points
- Patterns growing
- Process refinements
- Pricing model validation

## Growth options (month 8+)

Některé možnosti v ROADMAP, ne závazné:

- **Parallelism enable** — pokud demand požaduje
- **More stack tracks** — Webflow real (ne placeholder), e-commerce
- **Client-facing dashboard view** — read-only access pro klienty
- **Onboarding asistent** — pokud najímáš pomocníka
- **Marketing case studies** — využij projekty jako portfolio
- **SaaS exploration** — pokud pattern prokáže reusable value

---

## Reálné očekávání — co půjde špatně

Aby ROADMAP nebyl jen pink picture, pojmenuju typické problémy:

**Wave 1:** Spec schemas budou potřebovat 2-3 iterace — initial design
nezachytí all real cases.

**Wave 2:** Intake system prompt bude potřebovat 5-10 sessions ladění
— first prompts vždy mají blind spots.

**Wave 3:** První real factory run bude full of edge cases. Plán 3
týdnů je optimistický — možná 4.

**Wave 4:** Figma MCP write capability může mít quirks. Initial
output kvalita bude průměrná, lepší přes 5+ projektů.

**Wave 5:** Dashboard scope creep risk — drž MVP, expand later.

**Wave 6:** Klient bude mít unexpected requirements. Buď připraven
na "nedělá to to, co jsem si představoval".

**Total realistic:** 18-22 týdnů místo 15-17. **Pokud máš < 10 hodin
týdně, počítej 6-8 měsíců.**

---

## Pracovní disciplína

Tyto principy z naší konverzace zůstávají závazné:

1. **Žádné architektonické pivoty během implementace.** Nové nápady
   do BACKLOG.md.
2. **Wave musí mít exit criteria splněné** před přechodem na další.
3. **Real project test po každé Wave** — nepřeskakuj validaci.
4. **Dokumentace s každým artefaktem**, ne jako afterthought.
5. **ADR pro každé větší rozhodnutí.**
6. **Eat your own dogfood** — dashboard staví stejně jako klientské
   weby.

---

## Tracking progress

Doporučuji udržovat aktuální `docs/progress.md` s:

```markdown
# Implementation Progress

## Current state: Wave X, Krok Y
**Started:** date  
**Expected completion:** date  
**Blocker:** none / description

## Completed waves

### Wave 1: Foundation ✅
**Started:** 2026-04-25  
**Completed:** 2026-05-10  
**Real duration:** 16 days (planned 14)  
**Lessons learned:**
- Schema validation took longer than expected
- Server setup smooth
- Permissions matrix needed 2 iterations

## Active wave

### Wave 2: Intake MVP 🚧
**Started:** 2026-05-11  
**Expected:** 2026-05-25  
- [x] Krok 2.1 — System prompt
- [ ] Krok 2.2 — Claude Desktop setup
- [ ] Krok 2.3 — Workflow & transfer
- [ ] Krok 2.4 — First real intake

## Pending waves

- Wave 3: Factory Skeleton (planned start 2026-05-26)
- Wave 4: Design Integration
- Wave 5: Dashboard + Autonomy
- Wave 6: First real project
```

Update tento dokument **týdně**.

---

## Změny tohoto dokumentu

ROADMAP se updatuje:
- Při dokončení každé wave (move to "completed")
- Při významných slip (revise dates, document why)
- Při scope changes (add/remove kroků)
- **Ne při minor course corrections** — ty jsou normální součást
  exekuce

### Changelog

- **1.0** (2026-04-25): Initial verze. 6-wave plan with detailed
  steps, exit criteria, deliverables, tests. Realistic 4-month
  timeline (15-17 weeks). Working discipline rules established.
