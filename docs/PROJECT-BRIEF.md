# Rychi Design Factory — Project Brief

**Version:** 1.0  
**Last updated:** 2026-04-25  
**Owner:** Jirka (Rychi Design)  
**Status:** Pre-implementation

---

## Co je tento projekt

Autonomní výrobní systém pro tvorbu webů pro klienty Rychi Design. Skládá 
se ze tří propojených systémů:

1. **Intake System** — běží v Claude Desktop, vede konverzaci s Jirkou 
   během briefingu klienta, generuje validovaný spec.
2. **Factory System** — běží na homelab Linux serveru v Opencode, 
   autonomně staví web podle spec.
3. **Dashboard** — specializovaná webová aplikace na 
   `factory.digitaldesigner.cz`, vizualizuje a ovládá Factory.

Cílem je **dramaticky zkrátit čas od briefu k nasazenému webu** při 
zachování kvality srovnatelné s manuální designovou prací.

---

## Proč tento projekt existuje

Manuální výroba webů má dvě fundamentální omezení:

**Časové:** typický klientský web (15-20 stránek) zabere 30-50 hodin 
manuální práce. Většina je opakující se exekuce — kódování komponent, 
psaní obsahu, audit accessibility, deploy. Designér pracuje pod kapacitu.

**Konzistentní:** kvalita kolísá podle únavy, časového tlaku, momentální 
dispozice. Každý projekt znovuobjevuje stejné patterny.

Současné AI nástroje (ChatGPT, Cursor, Claude Code) automatizují **kódování**, 
ale ne **proces výroby webu**. Stále musí designér ručně řídit každý krok.

Rychi Design Factory cílí na **tu vrstvu výše**: orchestraci celého procesu 
výroby webu jako autonomního workflow s lidskou kontrolou v klíčových 
rozhodovacích bodech.

---

## Pro koho je to

**Primary user:** Jirka — designér, account manager, technický správce 
v jedné osobě.

**Secondary user (future):** klient Rychi Design — read-only přístup ke 
svému projektu přes dashboard, schvalování klíčových milestones.

**Tertiary user (long-term, optional):** parťák/asistent v Rychi Design 
— v případě růstu agentury.

**Co projekt explicitně NEŘEŠÍ:**
- Multi-tenant SaaS pro jiné agentury
- Enterprise features (SSO, RBAC, compliance)
- Mobile aplikace
- Replacement designerů obecně

---

## Klíčová architektonická rozhodnutí

Tato rozhodnutí jsou závazná. Detaily v `DECISIONS.md`.

| Oblast | Volba | Alternativy zvažovány |
|---|---|---|
| Agent runtime | Opencode | LangGraph, CrewAI, Pi (custom fork) |
| Intake | Claude Desktop Project | Vlastní web UI |
| State management | File-based (JSON, Markdown) | Database |
| Orchestration pattern | Stateless orchestrator | Continuous session |
| Spec format | Multi-file YAML | Single monolith |
| Stack approach | Dynamic (catalog) | Fixed (jen Astro) |
| Agent architecture | Universal + skill injection | Stack-specific clones |
| Design phase | AI-generated do Figma → human review | AI-only nebo human-only |
| Hosting | Homelab + Cloudflare Tunnel | VPS + traditional hosting |
| Auth | Cloudflare Access | Clerk, custom auth |

---

## Tech stack

**Pro factory infrastrukturu:**
- Linux server (homelab)
- Opencode jako agent runtime
- Node.js 22+, pnpm
- systemd pro services
- Git per projekt + factory-core repo
- Cloudflare Tunnel + Access pro dashboard
- Tailscale pro emergency SSH access

**Pro klientské weby (default content track):**
- Astro 5 (hybrid rendering)
- Sanity CMS
- Tailwind 4 + shadcn/ui
- Cloudflare Pages nebo Vercel
- Clerk pro auth (volitelně)

**Pro modely (Opencode Go subscription + Gemini API):**
- Orchestrátor: GLM-5.1
- Architect: GLM-5.1
- Multimodal (design auditor): Kimi K2.5
- Frontend builder: MiniMax M2.7
- Healer: GLM-5.1
- Specifická multimodal/long-context: Gemini 3 Flash / 3.1 Pro

**Pro dashboard (eat your own dog food):**
- Astro hybrid + React islands
- Tailwind + shadcn/ui
- Server-Sent Events pro live updates
- Běží jako systemd service vedle factory

---

## Klíčové principy

Tyto principy jsou závazné pro všechna implementační rozhodnutí.

### 1. File-based state, ne database
Veškerý stav projektu žije v souborech. Žádná DB. Důvody: git-versionable, 
human-readable, recovery-friendly, zero setup.

### 2. Stateless orchestrator
Orchestrátor si nepamatuje nic mezi iteracemi. Každý run čte aktuální 
stav ze souborů. Umožňuje recovery, debug, restart.

### 3. Deterministic where possible
LLM volání drahá a nedeterministická. Vše, co lze udělat čistým kódem 
(validace, routing, budget checks), je v kódu/skriptech. LLM jen pro 
genuine judgment calls.

### 4. Security through infrastructure
Bezpečnostní restrikce enforced on hook level (PreToolUse hooks), ne jen 
v promptech. LLM pod tlakem ignorují prompt instrukce — infrastruktura ne.

### 5. Strukturovaná komunikace
Agenti spolu komunikují JEN přes JSON signály s definovaným schématem. 
Žádný volný text. Orchestrátor parser a validator.

### 6. Human-in-the-loop at decision gates
Automatizace pro exekuci, člověk pro rozhodování. Explicit gates před: 
spec approval, design approval, scope changes, production deploy.

### 7. Per-projekt izolace
Každý klientský projekt má vlastní adresář, git repo, environment. 
Žádný shared state mezi projekty (kromě factory-core).

### 8. Minimum viable, iterate later
Každá komponenta startuje minimálně. Rozšíření přicházejí, když reálná 
data ukazují potřebu. Nad-engineering je hlavní nepřítel.

### 9. Eat your own dogfood
Dashboard staví stejnými nástroji (Astro + Tailwind + shadcn) jako 
klientské weby. První reálný projekt pro factory = postavit dashboard.

### 10. Frameworkově agnostic core
Spec schemas, conventions, agent definice jsou markdown/JSON — přenosné. 
Pokud někdy migrujeme z Opencode jinam, 80 % práce zůstane.

---

## Co budujeme — high-level rozsah

### Wave 1: Foundation (týdny 1-2)
Schemas, struktury, infrastruktura. Nic neběží samo, ale stojí to pevně.

### Wave 2: Intake MVP (týdny 3-4)
Claude Desktop Project produkuje validované spec.

### Wave 3: Factory Skeleton (týdny 5-7)
Minimální end-to-end běh. Spec → simple web na staging.

### Wave 4: Design Integration (týdny 8-10)
Figma MCP, design agent, kvalita výstupu na produkční úroveň.

### Wave 5: Dashboard + Autonomy (týdny 11-13)
Plná observability, control, self-healing, escalation.

### Wave 6: First real project (týdny 14-16)
Reálný klient, lessons learned, knowledge base growth.

**Total: 4 měsíce** k plně funkční továrně.

Detail v `ROADMAP.md`.

---

## Success criteria

Projekt je úspěšný, když:

**Wave 3 milestone:** Factory autonomně postaví funkční (i když esteticky 
surový) 5-stránkový web ze spec, nasadí na staging URL.

**Wave 4 milestone:** Factory produkuje weby s AI-generovaným designem 
v Figmě, kvalita srovnatelná s ručně designovaným výstupem za 2 dny.

**Wave 6 milestone:** Reálný klient přijal a deployoval projekt postavený 
factory. Jirkův čas: < 8 hodin (intake + design review + final approval). 
Klasický manuální čas by byl 30-50 hodin.

**Operational milestone:** Factory běží přes noc bez intervence. Telegram 
alerty < 2/den. Daily digest sumarizuje progress.

**Long-term cíl:** 4-8 projektů měsíčně se 60-80% časovou úsporou 
na operativní práci.

---

## Rozpočet a kapacita

**Měsíční náklady:**
- Opencode Go: $10
- Gemini API (pay-as-you-go): $10-30
- Figma Professional (pokud ještě nemáš): $15
- Server: $0 (homelab)
- Cloudflare: $0 (free tier)
- Vercel Pro (existing): $20
- Sanity: free tier zpočátku

**Celkem nových nákladů: $35-55/měsíc**

**Náklad na projekt (marginální):**
- API volání: $5-15
- Hosting: $0 (Cloudflare Pages free)
- Sanity: free tier

**Cílová kapacita:** 4-8 projektů měsíčně sériově. Paralelismus odložen 
na pozdější fázi.

---

## Co explicitně neděláme

Aby bylo jasné, co je mimo scope V1:

- Paralelní běh více projektů současně (odloženo)
- Klientský samoobslužný intake (zůstává Jirka v cycle)
- TypeScript orchestrator (LLM orchestrator stačí pro V1)
- LangGraph / CrewAI / custom framework (Opencode finální volba)
- WorkOS / enterprise auth (Cloudflare Access stačí)
- Mobile app (dashboard responsive stačí)
- Multi-developer collaboration (jeden user na začátku)
- Otevřený SaaS produkt pro jiné agentury (long-term možnost)
- E-commerce specifický track (přidá se podle reálné poptávky)

---

## Rizika a mitigace

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|---|---|---|---|
| Opencode Go rate limity | Střední | Střední | Fallback na Gemini API, budget controls |
| LLM halucinace | Vysoká | Vysoký | Hooks, JSON contracts, human gates, healer |
| Figma MCP nestabilita | Střední | Střední | Fallback manuální export tokens |
| Context overflow | Střední | Vysoký | Stateless orch, manifesty, agent budgets |
| Server outage (homelab) | Nízká | Střední | UPS, Tailscale fallback, recovery patterns |
| Klient nepřijme AI design | Střední | Vysoký | Human gates, transparency, iteration |
| Run-away costs | Nízká | Vysoký | Hard budget limits, auto-stop |

---

## Klíčové dokumenty

Tento brief je vrchol pyramidy. Detail v:

- **GLOSSARY.md** — definice pojmů (agent, factory, intake, spec, ...)
- **PRD.md** — co produkt dělá, user stories, acceptance criteria
- **ARCHITECTURE.md** — jak je to postavené technicky
- **DECISIONS.md** — proč jsme zvolili to, co jsme zvolili (ADR)
- **ROADMAP.md** — implementační plán po fázích

Pro hluboký technický kontext začni s ARCHITECTURE.md.

---

## Workflow s tímto dokumentem

**Když začínáš novou Claude Code session:**
> "Pracujeme na projektu Rychi Design Factory. Přečti si všechny soubory 
> v `docs/` adresáři, začni s PROJECT-BRIEF.md, pak GLOSSARY.md, pak 
> ostatní. Po prostudování shrň, čemu rozumíš a kde máš otázky."

**Když přemýšlíš o změně směru:**
Podívej se do "Co explicitně neděláme" a "Klíčová architektonická 
rozhodnutí". Pokud chceš změnit, zapiš ADR v `DECISIONS.md` a aktualizuj 
tento brief.

**Když vysvětluješ projekt někomu novému:**
Tento dokument je dostatečný pro 30minutový onboarding.

---

## Změny tohoto dokumentu

Tento dokument se mění **jen při významných pivotech**. Drobné implementační 
detaily patří do PRD/ARCHITECTURE, ne sem.

Každá verze má:
- Nové version number (semver)
- Updated "Last updated" datum
- Záznam v "Changelog" sekci na konci

### Changelog

- **1.0** (2026-04-25): Initial version, post-architectonické konverzace.

---
