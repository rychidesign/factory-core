# Rychi Design Factory — Product Requirements Document

**Version:** 1.0  
**Last updated:** 2026-04-25  
**Owner:** Jirka (Rychi Design)  
**Status:** Pre-implementation

---

## Účel tohoto dokumentu

PRD popisuje **co produkt dělá** a **pro koho**. Není to technická 
dokumentace (to je ARCHITECTURE.md), ani implementační plán (to je 
ROADMAP.md), ani vysvětlení proč jsme zvolili konkrétní řešení 
(to je DECISIONS.md).

Když si nejsi jistý, jestli má feature X být ve V1, podívej se sem.
Když potřebuješ user story pro implementační task, najdeš ji zde.

---

## Tři systémy

Rychi Design Factory se skládá ze tří oddělených, ale propojených 
systémů. Každý má vlastní user, vlastní purpose, vlastní deliverables.

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Intake     │ ───> │   Factory    │ ───> │  Dashboard   │
│              │      │              │      │              │
│ Claude       │      │ Linux        │      │ Web app      │
│ Desktop      │      │ server       │      │ (homelab)    │
│              │      │ (homelab)    │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
produkuje            produkuje            vizualizuje
spec/               .factory-state/      a ovládá
workspace/           factory
deploy URL

Každý systém má vlastní sekci níže.

---

# 1. Intake System

## 1.1 Účel

Intake System asistuje Jirkovi během briefu klienta. Vede strukturovanou
konverzaci, navrhuje otázky, zachytává odpovědi, generuje validovaný
spec pro factory.

**Není to klientský samoobslužný nástroj.** Klient se nepřihlašuje, 
neformuluje brief sám. Jirka je v procesu — Intake je jeho asistent.

## 1.2 Users

**Primary:** Jirka — během video callu / osobního setkání s klientem
nebo po něm při zpracování poznámek.

## 1.3 Implementace

**Claude Desktop Project** s:
- System prompt definujícím roli a workflow
- Project files (archetypy, schemas, příklady)
- Custom instructions pro tone, jazyk
- Artifacts pro generaci výstupů

Žádný custom development, žádný hosting — používáme existující 
Claude Desktop infrastrukturu.

## 1.4 User Stories

### US-IN-001: Vedení briefu s klientem

**As a** Jirka  
**I want to** mít AI asistenta během video callu s klientem  
**So that** kladu správné otázky a nezapomínám na nic důležitého

**Acceptance criteria:**
- AI asistent zná typické archetypy projektů
- Navrhuje další otázky podle dosavadních odpovědí
- Detekuje chybějící informace
- Reaguje real-time během konverzace
- Pracuje v češtině

### US-IN-002: Detekce archetypu

**As a** Jirka  
**I want to** aby AI rozpoznal typ projektu z prvních pár vět  
**So that** ihned cílí otázky relevantním směrem

**Acceptance criteria:**
- AI rozpozná 5 base archetypes (small-b2b, ecommerce-small, 
  portfolio-creative, restaurant, saas-landing)
- Při nejednoznačnosti se zeptá pro upřesnění
- Po určení archetypu adaptuje otázky

### US-IN-003: Progresivní zachytávání

**As a** Jirka  
**I want to** zachytávat informace postupně, ne najednou  
**So that** intake nebyl pro klienta vyčerpávající

**Acceptance criteria:**
- AI nedumpuje všechny otázky najednou
- Strukturuje konverzaci do logických bloků (business → audience → goals → scope → ...)
- Sumarizuje co dosud víme po každém bloku
- Klient může brief rozdělit do více sezení

### US-IN-004: Detekce red flags

**As a** Jirka  
**I want to** aby AI varoval před problematickými briefy  
**So that** nepodepíšu projekt s nerealistickými očekáváními

**Acceptance criteria:**
- AI identifikuje rozporuplná zadání (např. enterprise feature za $1000)
- Upozorní na chybějící klíčové informace
- Navrhuje doplnění nebo decline
- Konkrétní příklady red flags v knowledge base

### US-IN-005: Generace multi-file spec

**As a** Jirka  
**I want to** dostat strukturovaný spec po skončení intake  
**So that** factory ho může okamžitě zpracovat

**Acceptance criteria:**
- Output je 8 YAML souborů + brief.md + intake-journal.md
- Každý soubor odpovídá JSON Schema
- Validace projde bez chyb
- Soubory jsou human-readable
- Spec obsahuje audit trail z konverzace

### US-IN-006: Iterace nad spec

**As a** Jirka  
**I want to** upravovat spec po skončení konverzace  
**So that** mohu doladit detaily nebo opravit nepřesnosti

**Acceptance criteria:**
- AI mě umí navést na konkrétní pole spec
- Dokáže přepracovat sekci po feedbacku
- Verzuje změny v intake-journal.md
- Final approval označí spec jako "ready"

### US-IN-007: Transfer na server

**As a** Jirka  
**I want to** snadno přenést spec z Claude Desktop na server  
**So that** factory může začít

**Acceptance criteria:**
- Existuje workflow guide v repository
- Transfer trvá < 2 minuty
- Auto-validace při příjmu na serveru
- Notifikace při úspěchu/chybě

## 1.5 Out of scope (V1)

- Klientský samoobslužný intake interface
- Multi-language support (jen čeština + angličtina)
- Voice-to-text integration
- Integrace s CRM nebo accounting systémem
- Automatic price quotes
- Integration s kalendářem pro intake scheduling

---

# 2. Factory System

## 2.1 Účel

Factory autonomně staví web podle validovaného spec. Skládá se z 
orchestrátora, specializovaných agentů, knowledge base, hooks layer.

**Cíl:** od validovaného spec po deployed staging URL bez intervence.
Lidská kontrola jen na designovaných human gates.

## 2.2 Users

**Primary:** Jirka — supervize, schvalování gates, řešení blockerů.

**Secondary (future V2+):** Asistent, který pomáhá Jirkovi se škálováním.

## 2.3 Implementace

- Linux server (homelab)
- Opencode jako agent runtime
- Node.js 22+, pnpm
- systemd pro services
- Git per projekt + factory-core repo
- File-based state, žádná databáze

## 2.4 User Stories

### US-FA-001: Bootstrap projektu

**As a** Jirka  
**I want to** spustit factory pro nový projekt jedním příkazem  
**So that** nemusím manuálně setupovat každý projekt

**Acceptance criteria:**
- Příkaz `factory new <project-id>` inicializuje strukturu
- Validuje spec, hlásí chyby
- Vytvoří git repo, .factory-state/, plan.md
- Připraví na první iteraci

### US-FA-002: Autonomní orchestrace

**As a** Jirka  
**I want to** factory běžela sama bez mé intervence  
**So that** mohu zavřít laptop a věnovat se jiným věcem

**Acceptance criteria:**
- Orchestrátor spawnuje agenty podle plánu
- State.json reflektuje aktuální progress
- Logy jsou strukturované a searchable
- Recovery z padu trivial (stateless pattern)

### US-FA-003: Multi-stack support

**As a** Jirka  
**I want to** factory zvládala různé tech stacks  
**So that** se přizpůsobí typu projektu

**Acceptance criteria V1:**
- astro-sanity (default content track)
- astro-payload (alternative content track)
- nextjs-sanity (app track s auth)
- webflow (no-code track, MVP placeholder)

**Acceptance criteria post-V1:**
- Přidání dalšího stacku trvá < 1 den (1 YAML + 1 skill)

### US-FA-004: Architecture phase

**As a** Jirka  
**I want to** factory navrhla informační architekturu projektu  
**So that** mám solidní základ před design phase

**Acceptance criteria:**
- Architect agent vytvoří sitemap.json
- Vytvoří content-model.json (struktury per page type)
- Vytvoří technical-plan.md (stack rationale, dependencies)
- Identifikuje potenciální technické problémy

### US-FA-005: Design phase s Figma

**As a** Jirka  
**I want to** factory generovala design v Figmě  
**So that** mohu reviewovat a upravovat v nativním nástroji

**Acceptance criteria:**
- Sub-fáze 2a: 3 design directions jako prose + moodboard
- Volba direction přes Dashboard
- Sub-fáze 2b: Figma file s foundation + components + pages
- Notifikace, když je design ready
- Sub-fáze 2c: extraction tokens + components manifest po schválení

### US-FA-006: Foundation phase

**As a** Jirka  
**I want to** factory inicializovala kód projektu ze stack template  
**So that** build phase má kde začít

**Acceptance criteria:**
- Scaffolding ze stack-specific template
- Layout komponenty z designu
- Base configuration (TypeScript, Tailwind, atd.)
- `npm run dev` funguje

### US-FA-007: Content phase

**As a** Jirka  
**I want to** factory generovala copy pro stránky  
**So that** klient vidí placeholder content, který odpovídá tone

**Acceptance criteria:**
- Content-writer agent generuje copy podle business.yaml tone
- Copy respektuje audience.yaml personas
- Copy je v jazyce specifikovaném ve scope.yaml
- Output je v CMS schema (Sanity/Payload)
- Klient může upravit přes CMS Studio

### US-FA-008: Build phase

**As a** Jirka  
**I want to** factory postavila všechny stránky podle designu  
**So that** mám funkční web

**Acceptance criteria:**
- Frontend-builder agent staví stránku po stránce
- Každá stránka používá schválené komponenty z Figmy
- Naming convention dodržena
- Průběžný design audit každých 5 stránek
- Workspace je deployable

### US-FA-009: QA phase

**As a** Jirka  
**I want to** factory prošla audity před deploy  
**So that** vím, že web je production-ready

**Acceptance criteria:**
- Route auditor: žádné broken links, 404s correct
- Accessibility auditor: axe-core pass na všech stránkách
- Performance auditor: Lighthouse score > 90 (mobile)
- UI consistency auditor: design tokens dodrženy
- Content auditor: tone, grammar, no placeholders
- E2E test runner: critical flows pass
- Code reviewer: bez kritických issues

### US-FA-010: Polish phase

**As a** Jirka  
**I want to** factory navrhla animace pro polish  
**So that** web má profesionální feeling

**Acceptance criteria:**
- Animation-polish agent navrhuje konkrétní animations
- Respektuje prefers-reduced-motion
- Subtle, ne distracting
- Schválení přes Dashboard před implementací

### US-FA-011: Deploy phase

**As a** Jirka  
**I want to** factory nasadila web na staging  
**So that** mohu dělat final review

**Acceptance criteria:**
- Deployer agent push na Cloudflare Pages (default)
- Staging URL aktivní < 5 minut po triggeru
- Schválení přes Dashboard před production deploy
- Production deploy s rollback možností

### US-FA-012: Self-healing

**As a** Jirka  
**I want to** factory řešila běžné problémy sama  
**So that** mě budí jen kritické situace

**Acceptance criteria:**
- 4-úrovňová escalation (Auto / Healer / Async / Sync)
- 95 %+ situací se vyřeší na Level 0-1
- Healer používá known-patterns library
- Po úspěchu navrhne nový pattern do pending/

### US-FA-013: Budget controls

**As a** Jirka  
**I want to** mít hard limits na náklady projektu  
**So that** factory nepřežere budget

**Acceptance criteria:**
- Per-projekt limits v constraints.yaml
- Per-agent limits v agent definici
- Auto-escalate na 75 % budgetu (Level 2)
- Auto-stop na 100 % budgetu
- Cost tracking per agent invocation

### US-FA-014: Pause and resume

**As a** Jirka  
**I want to** zastavit a později obnovit factory  
**So that** mohu monitorovat Opencode Go rate limits

**Acceptance criteria:**
- Graceful pause po dokončení aktuální task
- State.json zachycuje pause point
- Resume pokračuje od posledního state
- Žádná ztráta práce

### US-FA-015: Per-project isolation

**As a** Jirka  
**I want to** každý projekt měl vlastní git repo a environment  
**So that** projekty se navzájem neovlivňují

**Acceptance criteria:**
- Každý klient má adresář v `clients/`
- Vlastní .git/, vlastní node_modules
- Žádné shared state kromě factory-core
- Git push na privátní GitHub repo automaticky

## 2.5 Out of scope (V1)

- Paralelní běh více projektů současně
- Production deploy bez human approval
- Custom CMS development (jen Sanity, Payload templates)
- Mobile app generation
- Backend API development beyond CMS
- E2E test generation pro všechny edge cases
- Continuous deployment z git push
- A/B testing setup
- Analytics integration (Plausible, GA, atd. — manual setup)

---

# 3. Dashboard

## 3.1 Účel

Dashboard je tvůj kontrolní panel. Vizualizuje aktuální stav továrny,
umožňuje ovládat běh, řešit blockery, sledovat náklady.

**Cíl:** veškerá supervize bez SSH na server. Z mobilu i z desktopu.

## 3.2 Users

**Primary V1:** Jirka — denní použití, ovládání, monitoring.

**Secondary (V2+):** Klient — read-only přístup ke svému projektu.

## 3.3 Implementace

- Astro 5 hybrid mode + React islands
- Tailwind 4 + shadcn/ui
- Server-Sent Events pro live updates
- Astro API routes pro backend
- systemd service na homelab serveru
- Cloudflare Tunnel + Access pro veřejný přístup
- factory.digitaldesigner.cz

## 3.4 User Stories — V1 MVP

### US-DA-001: Project list

**As a** Jirka  
**I want to** vidět seznam všech projektů s status  
**So that** vím přehled portfolia v jednom pohledu

**Acceptance criteria:**
- Filtry: running / queued / completed / failed
- Per project: name, current phase, progress %, last activity, status
- Click → detail view
- Real-time update (SSE)

### US-DA-002: Project detail

**As a** Jirka  
**I want to** vidět detail aktivního projektu  
**So that** rozumím, co factory právě dělá

**Acceptance criteria:**
- Plan progress (checkboxes per phase a per task)
- Current active agent + task
- Live event feed (last 50 events, auto-scroll)
- Recent decisions z decisions.jsonl
- Pending blockers s CTA

### US-DA-003: Agent graph visualization

**As a** Jirka  
**I want to** vidět vizuální diagram běžících agentů  
**So that** vizuálně rozumím, co se děje

**Acceptance criteria:**
- Node graph s aktivními agenty
- Aktuální task per agent
- Time running, tokens used so far
- Agent → orchestrator relationship
- Click na agent → detail jeho práce

### US-DA-004: Server metrics

**As a** Jirka  
**I want to** vidět CPU/RAM/disk usage serveru  
**So that** vím, jestli homelab zvládá

**Acceptance criteria:**
- CPU usage (last 5 min, last hour)
- RAM usage
- Disk space remaining
- Network I/O
- Updated every 10 sekund

### US-DA-005: Token & cost tracking

**As a** Jirka  
**I want to** vidět token consumption a cost  
**So that** kontroluji budget per projekt

**Acceptance criteria:**
- Per project: tokens used / budget, cost USD / budget
- Per agent breakdown
- Daily/weekly/monthly aggregations
- Color coding: green < 50 %, yellow 50-90 %, red > 90 %
- Alerts při 75 % a 95 % thresholds

### US-DA-006: Start/stop/pause control

**As a** Jirka  
**I want to** ovládat factory přes dashboard  
**So that** nemusím SSH na server

**Acceptance criteria:**
- Start project (queued → running)
- Pause project (graceful, po dokončení aktuálního tasku)
- Resume paused project
- Stop project (s confirmation, neztratí state)
- Restart project (po fixu issues)

### US-DA-007: Task-level granular control

**As a** Jirka  
**I want to** zastavit po konkrétní task  
**So that** monitoruji Opencode Go limit po hodinách

**Acceptance criteria:**
- "Pause after current task" option
- Vizualizace, který task se právě dokončuje
- Resume po pauze pokračuje na další task v plánu

### US-DA-008: Blocker resolution

**As a** Jirka  
**I want to** řešit blockery přes intuitivní UI  
**So that** rychle odbavuji rozhodnutí

**Acceptance criteria:**
- Typed UI per blocker type:
  - Copy variants: side-by-side comparison s preview
  - Design variants: visual mockup
  - Missing info: form s required fields
  - Scope change: diff view
- One-click resolve
- Notes/feedback při resolve

### US-DA-009: Live event feed

**As a** Jirka  
**I want to** sledovat real-time co factory dělá  
**So that** chytám problémy včas

**Acceptance criteria:**
- SSE stream events
- Filter: agent, severity, phase
- Search functionality
- Auto-scroll s pause-on-hover
- Color coding per event type

### US-DA-010: Logs & timeline

**As a** Jirka  
**I want to** procházet historii projektu  
**So that** debuguji problémy nebo reportuji klientovi

**Acceptance criteria:**
- Timeline view per project
- Searchable logs
- Filter per agent, per phase, per severity
- Export do JSON nebo Markdown
- Permalink na konkrétní event

### US-DA-011: Spec viewer/editor

**As a** Jirka  
**I want to** prohlížet a upravit spec přes dashboard  
**So that** nemusím editovat YAML soubory na serveru

**Acceptance criteria:**
- View per spec file (meta, business, audience, ...)
- Edit s validací proti schema
- Preview changes před save
- Re-trigger validation po edit
- Version history

### US-DA-012: Telegram notifications

**As a** Jirka  
**I want to** dostávat alerty na Telegram  
**So that** vím o kritických situacích okamžitě

**Acceptance criteria:**
- Bot integration s mojí Telegram konverzací
- Level 3 escalations vždy
- Daily digest ráno (Level 2)
- Customizable per project
- Pause notifications option

### US-DA-013: Authentication

**As a** Jirka  
**I want to** dashboard chráněný auth wallu  
**So that** nikdo cizí nemá přístup

**Acceptance criteria:**
- Cloudflare Access integrace
- Login přes Google nebo email code
- Session management
- Logout option
- Future-ready pro klienty

### US-DA-014: Mobile responsive

**As a** Jirka  
**I want to** ovládat factory z telefonu  
**So that** mohu reagovat na blockery odkudkoli

**Acceptance criteria:**
- Responsive layout od 375px width
- Touch-friendly UI (button targets > 44px)
- Klíčové akce dostupné na mobilu (resolve blocker, pause, view status)
- Komplexní views (spec edit) optionally desktop-only

## 3.5 User Stories — V2+ (out of V1)

### US-DA-101: Client read-only view

Read-only přístup pro klienta k jeho projektu.
Selektivní informace (žádné technické detaily, tokens, costs).

### US-DA-102: Known patterns review UI

UI pro review pending patterns a archetypes navržených healerem.
Approve/reject/edit flow.

### US-DA-103: Multi-project aggregate views

Cross-project metrics, monthly cost summary, capacity planning.

### US-DA-104: Figma embedded preview

Embedded Figma frame v project detail pro rychlý design check.

### US-DA-105: Native mobile app

iOS/Android wrapper kolem dashboard pro push notifications.

## 3.6 Out of scope (V1)

- Multi-tenant (per-uživatel oddělené factory instance)
- Klientské self-service onboarding
- Integration s externími tools (Asana, Notion, atd.)
- Custom dashboards per uživatel
- AI assistant pro dashboard navigation
- Advanced analytics a reports
- Customizable themes (kromě dark mode)

---

# 4. Cross-system requirements

Některé požadavky překrývají všechny tři systémy.

## 4.1 Dokumentace

**Princip:** Dokumentace je first-class artifact, ne afterthought.

**Acceptance criteria:**
- Diátaxis structure v factory-core/docs/
- ADR pro každé větší rozhodnutí
- Inline komentáře v kódu pro non-obvious logiku
- README.md v každém repo
- Automatická aktualizace generated docs (schemas → markdown)

## 4.2 Pracovní jazyk

**Princip:** Český jazyk pro user-facing texty, anglický pro technické artifacts.

**Acceptance criteria:**
- Intake konverzace: česky
- Dashboard UI: česky
- Telegram notifikace: česky
- Code, system prompts, schemas: anglicky
- Dokumentace: anglicky (s případnými českými poznámkami)
- Inline komentáře v kódu: anglicky

## 4.3 Versioning

**Princip:** Semantic versioning pro factory-core, project-specific 
version tracking pro klientské weby.

**Acceptance criteria:**
- factory-core git tags (v1.0.0, v1.1.0, ...)
- Per-project version v meta.yaml
- Schema migrations dokumentované
- Breaking changes v changelog s migration guide

## 4.4 Backups

**Princip:** Žádný single point of failure pro data.

**Acceptance criteria:**
- factory-core: git remote (GitHub privátní)
- Klientské projekty: git remote per projekt (GitHub privátní)
- State.json snapshots: stačí git history
- Server image: weekly Time Machine nebo equivalent
- API klíče: password manager + sealed envelope offline

## 4.5 Security

**Princip:** Defense in depth, žádné secrets v repu.

**Acceptance criteria:**
- Žádné secrets v git history
- API klíče v ~/.config/factory/secrets.env (chmod 600)
- systemd EnvironmentFile pro injection
- Cloudflare Access auth wall pro dashboard
- SSH key-only auth na server
- Hooks enforce per-agent permissions
- Per-project isolation (nikdy cross-projekt access)

## 4.6 Observability

**Princip:** Pokud něco selže, musím vědět co a proč.

**Acceptance criteria:**
- Structured JSON logs
- Logs aggregated v factory-logs/
- Log retention 90 dní
- Searchable přes dashboard
- Export functionality
- Alert thresholds configurable

## 4.7 Performance

**Princip:** Factory je tool, ne load-bearing infrastruktura. Performance 
musí být OK, ne perfekt.

**Acceptance criteria:**
- Dashboard initial load < 2 sekundy
- SSE update lag < 500 ms
- API response < 1 sekunda (typical)
- Factory iteration overhead < 5 sekund (orchestrator decision time)

## 4.8 Accessibility

**Princip:** Dashboard musí být použitelný i s nestandardním inputem.

**Acceptance criteria:**
- Keyboard navigation pro všechny akce
- Screen reader friendly (ARIA labels)
- Color contrast WCAG AA
- Focus indicators visible
- No flashing content > 3 Hz

---

# 5. Acceptance criteria summary

Pro rychlý reference, success criteria celého projektu (z PROJECT-BRIEF.md):

**Wave 3 milestone:**  
Factory autonomně postaví funkční 5-stránkový web ze spec, deploy na 
staging URL.

**Wave 4 milestone:**  
Factory produkuje weby s AI-generovaným designem v Figmě, kvalita 
srovnatelná s ručně designovaným výstupem za 2 dny.

**Wave 6 milestone:**  
Reálný klient přijal projekt postavený factory. Jirkův čas: < 8 hodin 
(intake + design review + final approval).

**Operational milestone:**  
Factory běží přes noc bez intervence. Telegram alerty < 2/den.

**Long-term cíl:**  
4-8 projektů měsíčně se 60-80 % časovou úsporou.

---

# 6. Dependencies & assumptions

## 6.1 Externí závislosti

- **Opencode** musí zůstat ve vývoji a podporovat MCP
- **Figma MCP** musí podporovat write capabilities
- **Cloudflare** musí mít stabilní free tier
- **Sanity** free tier musí pokrývat typické projekty
- **Opencode Go subscription** musí poskytovat plánovaný value
- **Anthropic** musí udržovat frontend-design skill

## 6.2 Předpoklady

- Jirkův homelab server běží 24/7
- Domácí internet má rozumnou stabilitu
- Jirka má kapacitu věnovat ~10-20 hodin/týden vývoji factory
- Klienti Rychi Design budou ochotni přijmout AI-assisted workflow

## 6.3 Rizika z dependencies

- Figma MCP write API nestabilní → fallback ruční export tokens
- Opencode Go rate limity → fallback Gemini API
- Sanity tier exceed → upgrade nebo přechod na Payload track
- Server outage → Tailscale fallback, recovery z git

---

# 7. Změny tohoto dokumentu

PRD se mění při:
- Změně scope V1 (přidání/odebrání feature)
- Změně user requirements
- Přidání nových user stories
- Změně acceptance criteria

Drobné implementační detaily patří do ARCHITECTURE.md, ne sem.

### Changelog

- **1.0** (2026-04-25): Initial verze. Tři systémy s detailními user 
  stories pro V1 MVP. Out-of-scope explicitně vymezeno.
