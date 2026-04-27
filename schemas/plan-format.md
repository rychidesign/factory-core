# `plan.md` format specification

**Účel tohoto dokumentu:** definuje strukturu `plan.md` souboru (`.factory-state/plan.md`) tak, aby byl současně **lidsky čitelný markdown** a **strojově parseable** kontrakt mezi orchestrátorem, builder agenty a dashboardem.

JSON Schema pro embedded metadata blok je v [`plan-meta.schema.json`](plan-meta.schema.json). Pravidla v tomto dokumentu řídí vše ostatní (markdown strukturu, ikony, formát task řádek).

---

## 1. Soubor jako celek

Plan žije v `.factory-state/plan.md` v každém klientském projektu. Je to **living document**: orchestrátor a builder agenty ho updatují průběžně. Atomic write (`.tmp` + `rename`) jako pro `state.json`.

Jeden plan.md per projekt. Žádné multi-plan, žádné per-phase plans.

---

## 2. Povinná struktura

```markdown
# Implementation Plan: <Display Name>

<!-- factory-meta:
{
  "schema_version": "1.0",
  "project_id": "acme-precision-2026",
  "generated_at": "2026-04-25T10:00:00Z",
  "last_updated": "2026-04-27T14:32:00Z",
  "lock_status": "active",
  "current_phase": "build"
}
-->

**Generated:** 2026-04-25
**Last updated:** 2026-04-27
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
- [x] Pages: Homepage, About, Services, …
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
- [ ] **Build /services/consulting** ← current
- [ ] Build /faq

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

---

## 3. Pravidla

### 3.1 H1 (`# Implementation Plan: <name>`)

Přesně jeden, na prvním řádku. Suffix po dvojtečce je human-readable display name (typically `business.display_name` ze spec).

### 3.2 Metadata blok

První HTML comment v dokumentu, na samostatných řádcích:

```markdown
<!-- factory-meta:
{
  ...
}
-->
```

Obsah je validní JSON, validuje se proti [`plan-meta.schema.json`](plan-meta.schema.json). Parser musí podporovat víceřádkový JSON (parse vše mezi `<!-- factory-meta:` a uzavírajícím `-->`).

### 3.3 Phase headers

```
## Phase <N>: <Title> <icon> <Status text>
```

- `<N>` je 0–8.
- `<Title>` matchuje phaseName enum z `state.schema.json` (kapitalizovaný): Bootstrap, Architecture, Design, Foundation, Content, Build, QA, Polish, Deploy.
- `<icon>` a `<Status text>` se vážou:

  | Phase status | Icon | Status text |
  |---|:---:|---|
  | `pending`     | ⏸  | `Pending` |
  | `in_progress` | 🚧 | `In Progress` |
  | `blocked`     | ⛔ | `Blocked` |
  | `complete`    | ✅ | `Complete` |
  | `failed`      | ❌ | `Failed` |
  | `skipped`     | ⏭️ | `Skipped` |

**Všech 9 phases musí být v pořadí Phase 0 → Phase 8.** Žádné přeskakování headers, i kdyby phase byla `skipped`.

### 3.4 Sub-phase headers (jen Phase 2 / Design)

```
### 2a: Direction
### 2b: Figma Generation
### 2c: Lock & Extract
```

Sub-phase headers nemají vlastní status icon — status se odvozuje z task checkboxes uvnitř.

### 3.5 Task řádky

```
- [ ] <text>             pending
- [x] <text>             complete
- [-] <text>             skipped (markdown nepodporuje natively, ale parser ho ctí)
- [!] <text>             blocked / failed (parser rozezná dle kontextu blockers/)
```

Doplňky:

- **Current task** je task, na kterém právě pracuje agent. Označuje se na vlastním řádku `**` boldem **a** suffixem ` ← current`:
  ```
  - [ ] **Build /services/consulting** ← current
  ```
  Když phase status je `in_progress`, právě jeden task musí mít tento marker.
- **HUMAN GATE** tasky jsou explicitně volané jako `HUMAN GATE: <co se schvaluje>`. Parser je pozná podle prefixu `HUMAN GATE:` po `[ ]`/`[x]`.
- Volitelně může task mít inline metadata komentář:
  ```
  - [ ] Build /faq <!-- task-meta: {"id": "T-021", "agent": "frontend-builder", "estimated_tokens": 5000} -->
  ```
  Pole jsou volitelná. Parser, který metadata nezpracovává, je ignoruje.

### 3.6 Volný markdown

Mezi sekcemi a v rámci sekcí je **dovolen volný text** (paragraf, bullet listy, code bloky, tabulky), pokud nezačíná `## Phase ` nebo `- [`. Slouží pro lidská anotování (notes z post-mortemu, links na artifacts, …).

Builder agenty volný text nepřepisují — pouze updatují vlastní task checkboxy.

---

## 4. Lock

`lock_status` v metadata bloku:

| Hodnota | Význam |
|---|---|
| `draft` | Plan byl právě vygenerován bootstrap-agent, čeká na schválení po Phase 2c. |
| `active` | Factory plan freely edituje (přidává/checkuje tasky). Default mezi Phase 0 a Phase 2c lock. |
| `locked` | Po Phase 2c (design lock & extract). Žádný agent nesmí přidávat/odebírat tasky bez explicit unlock. Pouze checkbox flips. |

Unlock se děje manuálním zásahem (Jirka edituje plan.md přímo nebo přes dashboard) a je zalogován v `decisions.jsonl` jako `manual_intervention`.

---

## 5. Validace

Pro 1.3 platí:

- JSON v metadata bloku se validuje proti [`plan-meta.schema.json`](plan-meta.schema.json).
- Markdown strukturu validuje `tools/validate-plan` (kontrola H1, metadata bloku, 9 phase headers, ikona/status alignment).

Plný markdown parser, který produkuje typed plan model (phases → sub_phases → tasks s id/state), žije v orchestrátoru a přijde v Krok 3.1. Tento dokument je zdrojem pravidel pro něj.

---

## 6. Příklady

- [`examples/plan/active-build.md`](../examples/plan/active-build.md) — typický plan ve fázi Build, několik phases complete, jeden task in progress.

---

## 7. Co tento dokument není

- Není to JSON Schema (markdown nelze plně popsat JSON Schemou; metadata blok ano).
- Není to specifikace plan **parseru** (ten je v orchestrátoru a může být striktnější).
- Není to specifikace UI renderování v dashboardu (dashboard si plan parsuje sám podle vlastních potřeb).
