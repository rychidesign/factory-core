# Spec — referenční dokumentace

**Účel tohoto dokumentu:** referenční přehled struktury a obsahu klientského spec adresáře. Když píšeš nebo čteš spec, hledej tady.

Pro **proč** je spec multi-file viz [ADR-0003](../DECISIONS.md). Pro **jak** factory spec konzumuje viz [`ARCHITECTURE.md` §2.2](../ARCHITECTURE.md). Pro **co dělá Intake** viz [`PRD.md` §1](../PRD.md).

---

## 1. Co je spec

Spec je strukturovaný popis klientského projektu, který:

- Produkuje [Intake System](../GLOSSARY.md#intake) (Claude Desktop Project) z konverzace s klientem.
- Konzumuje [Factory](../GLOSSARY.md#factory) jako vstup pro autonomní stavbu.
- Žije v `clients/<project-id>/spec/` v rámci klientského repa.

Tvoří ho 9 souborů: 8 YAML s strukturovanými daty (každý validovaný proti JSON Schema) + `brief.md` jako volný text.

---

## 2. Souborový přehled

| Soubor | Účel | Required | Schema |
|---|---|:---:|---|
| `meta.yaml` | Administrativní metadata projektu | ✓ | [`schemas/spec/meta.schema.json`](../../schemas/spec/meta.schema.json) |
| `business.yaml` | Business kontext klienta (USP, tone, brand) | ✓ | [`business.schema.json`](../../schemas/spec/business.schema.json) |
| `audience.yaml` | Personas a jazyky | ✓ | [`audience.schema.json`](../../schemas/spec/audience.schema.json) |
| `goals.yaml` | Business cíle a anti-cíle | ✓ | [`goals.schema.json`](../../schemas/spec/goals.schema.json) |
| `scope.yaml` | Stránky, features, integrace, formuláře | ✓ | [`scope.schema.json`](../../schemas/spec/scope.schema.json) |
| `stack.yaml` | Tech stack volba (track, CMS, deployment) | ✓ | [`stack.schema.json`](../../schemas/spec/stack.schema.json) |
| `design-direction.yaml` | Designové preference a referenční sites | ✓ | [`design-direction.schema.json`](../../schemas/spec/design-direction.schema.json) |
| `constraints.yaml` | Budget, deadlines, a11y, performance, compliance | ✓ | [`constraints.schema.json`](../../schemas/spec/constraints.schema.json) |
| `brief.md` | Free-form prózový brief od klienta | ✓ | (žádné — jen presence check) |

Detailní popisy polí jsou v `description` atributech přímo v každém JSON Schema — schemas jsou primary source of truth.

---

## 3. Per-soubor přehled

### 3.1 `meta.yaml`

Administrativní metadata: `project_id`, `client_name`, časy, [archetype](../GLOSSARY.md#archetype), jazyk, `lock_status`.

**Klíčové:**
- `project_id` musí být kebab-case (`acme-precision-2026`), používá se jako directory name a systemd instance.
- `archetype` musí matchovat jeden z 5 V1 archetypů, nebo `"other"`. Hodnota driveuje intake question prioritization a stack defaults.
- `lock_status`: `draft` → `complete` → `validated` → `approved` → `locked`. Factory startuje až od `approved`.
- `language`: BCP-47 (`cs`, `cs-CZ`, `en-GB`, …).

### 3.2 `business.yaml`

Business kontext: `legal_name`, `display_name`, `industry`, `usp`, `tone_of_voice`, volitelně `existing_brand`, `competitors`.

**Klíčové:**
- `industry` je zatím free string. Po prvních ~12 reálných intakeších se zúží na enum.
- `tone_of_voice.keywords` musí mít aspoň 2 položky — jedno slovo nestačí pro content-writer agenta.
- `existing_brand.primary_colors` jsou hex stringy s leading `#` (`"#0B2545"`).
- `competitors[].relation`: `direct` | `adjacent` | `aspirational` | `anti-reference`.

### 3.3 `audience.yaml`

Personas (1–5) a jazyky.

**Klíčové:**
- `personas[].id` musí matchovat pattern `P-\d{3}` (`P-001`, `P-002`, …).
- `primary_persona_id` musí odkazovat na existující personu (cross-file integrity check #1).
- `languages` je BCP-47 array. Pokud má víc než 1 položku, `scope.multilang` musí být `true`.

### 3.4 `goals.yaml`

Business cíle, KPI, anti-cíle.

**Klíčové:**
- `business_goals[].id` matchuje `G-\d{3}`.
- `priority`: `must` / `should` / `could` / `wont` (MoSCoW). `wont` je validní — slouží k zachycení diskutovaných-a-zamítnutých cílů.
- `business_goals[].personas[]` musí matchovat existující persona id.

### 3.5 `scope.yaml`

Stránky, features, integrace, formuláře, multilang flag.

**Klíčové:**
- `pages[].id` matchuje `PG-\d{3}`, `features[].id` matchuje `F-\d{3}`, `forms[].id` matchuje `FRM-\d{3}`.
- `pages[].path` začíná `/`. Dynamické routes jsou `/services/[slug]`.
- `pages[].template`: `homepage` / `static` / `listing` / `detail` / `form` / `404` / `legal` / `landing`. **Pozor:** `"404"` musí být v YAML v uvozovkách, jinak ho YAML parsuje jako number a validace selže.
- `features[].depends_on_features[]` musí být platné feature id (samo-reference nebo neexistující dep selže).
- `auth_required: true` vyžaduje `stack.auth != "none"`.
- `multilang: true` vyžaduje `audience.languages.length >= 2`.

### 3.6 `stack.yaml`

Tech stack: track, CMS, deployment, lock_status.

**Klíčové:**
- `track`: `astro-sanity` / `astro-payload` / `nextjs-sanity` / `webflow`. Přidat nový track = upravit jak schema enum, tak `stack-catalog.yaml`.
- `cms` musí být konzistentní s `track`:
  - `astro-sanity` → `cms: sanity`
  - `astro-payload` → `cms: payload`
  - `nextjs-sanity` → `cms: sanity`
  - `webflow` → `cms: webflow`
- `track` `webflow` vyžaduje `deployment: webflow-hosting`.
- `lock_status`: `proposed` (intake) → `confirmed` (architect) → `locked` (po Phase 1). Factory přechází do Phase 3 jen při `locked`.
- `track_chosen_by`: `intake` / `architect` / `operator`.

### 3.7 `design-direction.yaml`

Estetické constrainty pro Phase 2a (design-director).

**Klíčové:**
- `aesthetic_keywords` má 3–12 položek. Min 3 vynucuje artikulaci, max 12 brání rozředění.
- `references[].weight`: `primary` / `supporting` / `moodboard`.
- `color_preferences.must_include` / `must_avoid` jsou hex stringy s `#`.
- `imagery_style: minimal-no-imagery` je explicitní volba, ne absence rozhodnutí.
- `motion_preference`: `none` / `minimal` / `subtle` / `expressive`. Honoruje to animation-polish-agent v Phase 7.

### 3.8 `constraints.yaml`

Hard limity: budget, deadlines, a11y, performance, compliance, IP.

**Klíčové:**
- `budget` je required, všech 5 polí (`max_tokens_total`, `max_dollar_cost`, `max_iterations`, `max_duration_hours`, `max_consecutive_failures`) je required.
- V1 defaultní budget: 5 M tokens, $10, 300 iterací, 48 h, 5 consecutive failures (viz [`ARCHITECTURE.md` §9.1](../ARCHITECTURE.md)).
- `data_residency: on-premise` je inkonzistentní s `stack.cms: sanity` (Sanity je hosted) — validator to označí.
- `compliance` enum zahrnuje `GDPR` / `CCPA` / `WCAG-AA` / `WCAG-AAA` / `EAA-2025` / `PCI-DSS` / `HIPAA`.

### 3.9 `brief.md`

Volný markdown text. Žádné schema, jen presence check. Slouží pro:
- Klientovu vlastní řeč (citace z calls).
- Nuance, která se nevejde do strukturovaných polí.
- Audit trail z briefu.

---

## 4. Cross-file integrity pravidla

Validátor (`tools/spec-validate`) ověřuje 10 cross-file invariantů kromě per-file schema validace:

1. `audience.primary_persona_id` musí matchovat `audience.personas[].id`.
2. `goals.business_goals[].personas[]` jsou platné persona id.
3. `scope.pages[].personas[]` jsou platné persona id.
4. `scope.features[].depends_on_features[]` jsou platné feature id.
5. `stack.track` ↔ `stack.cms` konzistence (mapping výše).
6. `scope.auth_required: true` ⇒ `stack.auth != "none"`.
7. `scope.multilang: true` ⇒ `audience.languages.length >= 2`.
8. `audience.languages.length > 1` ⇒ `scope.multilang: true`.
9. `meta.language` musí být v `audience.languages`.
10. `stack.track: webflow` ⇒ `stack.deployment: webflow-hosting`.
11. `constraints.data_residency: on-premise` ⇒ `stack.cms != "sanity"`.

Pravidla žijí v `tools/spec-validate` ve funkci `integrityCheck()`. Když přidáváš nové, doplň i tohle pravidlo do tabulky.

---

## 5. Validace

### 5.1 Spuštění

```bash
# Z rootu factory-core repa
node tools/spec-validate clients/acme-precision-2026/spec
# nebo
pnpm spec:validate clients/acme-precision-2026/spec

# Validace všech reference examples
pnpm spec:validate:examples
```

### 5.2 Exit kódy

- `0` — spec valid (warnings ok).
- `1` — spec invalid (alespoň jedna schema chyba, missing required file nebo integrity issue).
- `2` — invocation error (špatné argumenty, neexistující adresář, chybějící schema soubor).

### 5.3 Output

ANSI-coloured (`✓` zeleně, `✗` červeně) když TTY, plain text při piping.

```
✓ meta.yaml
✓ business.yaml
✗ stack.yaml
    /track must be equal to one of the allowed values …

cross-file integrity:
  ✗ scope.multilang is true but audience.languages has 1 entry (need at least 2)
---
✗ Spec invalid: 1 schema error, 0 missing, 1 integrity issue
```

---

## 6. Lifecycle (`meta.lock_status`)

```
draft       — intake probíhá, neúplný spec
complete    — všechna required pole vyplněna
validated   — schema validation passed
approved    — Jirka označil za final
locked      — factory startuje, edits vyžadují explicit unlock
```

Factory čte spec jen při `lock_status: approved` nebo `locked`. Předchozí stavy znamenají "intake ještě neskončil".

---

## 7. Versioning

Aktuální verze: **1.0**. Hodnota žije v `meta.schema_version` (semver).

Při breaking změně v některém schema:

1. Nová major verze (`1.0` → `2.0`).
2. Nový schema file vedle starého (`meta.schema.v2.json`) s `$id` obsahujícím `/v2/`.
3. Migration guide v `docs/how-to/migrate-spec-v1-to-v2.md`.
4. Validátor detekuje verzi z `meta.schema_version` a routuje na správné schemas.
5. Po 30 dnech deprecation period staré schemas archivujeme.

Drobné non-breaking změny (přidání optional pole, rozšíření enum) — bump na minor (`1.0` → `1.1`) bez nového schema file.

---

## 8. Reference examples

V repu jsou 3 referenční specs k dispozici jako test fixtures a šablony pro intake:

- [`examples/specs/acme-precision-2026/`](../../examples/specs/acme-precision-2026/) — `small-b2b-services`, plně vyplněný spec, exhaustivně používá většinu polí.
- [`examples/specs/eva-portfolio-2026/`](../../examples/specs/eva-portfolio-2026/) — `portfolio-creative`, lightweight spec, ukazuje minimální variantu.
- [`examples/specs/bistro-narozi-2026/`](../../examples/specs/bistro-narozi-2026/) — `restaurant-hospitality`, multilang (cs + en), testuje multilang integrity check.

Všechny tři projdou `pnpm spec:validate:examples`.
