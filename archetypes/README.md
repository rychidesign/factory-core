# Archetypes

Šablony typů klientských projektů. Každý archetype popisuje **kdo**, **co**, **jak typicky vypadá** a **co se v intake musí ujasnit**.

Intake System (Claude Desktop Project, Wave 2) je čte v conversation a:

1. Detektuje pravděpodobný archetype z prvních pár vět klienta — viz `detection.client_phrases` a `detection.scope_signals`.
2. Cílí intake otázky podle `priority_questions` daného archetypu.
3. Defaultuje `spec/stack.yaml.track` podle `suggested_stack.track`.
4. Včas varuje na `red_flags` a `common_gotchas` před tím, než se projekt rozjede.

## V1 archetypy

| Archetype | Confidence | Zdroj |
|---|---|---|
| [`small-b2b-services`](small-b2b-services.yaml) | medium | public defaults + autentická Rychi fráze |
| [`portfolio-creative`](portfolio-creative.yaml) | medium-high | analýza operátorova vlastního portfolia |
| [`restaurant-hospitality`](restaurant-hospitality.yaml) | low | public defaults |
| [`ecommerce-small`](ecommerce-small.yaml) | low | public defaults; V1 placeholder, dedicated commerce track přijde post-V1 |
| [`saas-landing`](saas-landing.yaml) | low | public defaults; typicky doménou interních marketing týmů |

## Formát souboru

Každý archetype YAML má 7 sekcí:

```yaml
schema_version: "1.0"
id: <kebab-case>
name: "<Display name>"
description: <jeden odstavec>

detection:
  client_phrases: [...]      # fráze, které klient typicky řekne
  typical_industries: [...]
  scope_signals: [...]       # signály ze scope (počet stránek, features, ...)

suggested_stack:
  track: <track id z stack-catalog.yaml>
  rationale: <proč tento>
  alternatives: [...]

typical_scope:
  page_count_range: [<min>, <max>]
  must_have_pages: [...]
  common_features: [...]

priority_questions:
  - id: q1
    question: "..."
    why: "..."
    surfaces_to: [<spec.section>, ...]

common_gotchas:
  - title: "..."
    description: "..."
    mitigation: "..."

red_flags:
  - description: "..."
    response: "..."

confidence:
  level: high | medium-high | medium | low
  notes: <kontext k interpretaci>
```

`surfaces_to` v `priority_questions` referuje pole spec souborů ([`docs/reference/spec-schema.md`](../docs/reference/spec-schema.md)). Drží to provázanost mezi archetype guidance a finálním spec.

## Detekce archetypu

Intake systém čte `detection.client_phrases` z všech archetypů a hledá fuzzy match v conversation. Když match je ambiguous (víc archetypů s podobnou frází), intake explicitně se ptá: "Jde víc o B2B služby s case studies, nebo o portfolio jednotlivce?".

Pokud žádný archetype neodpovídá, `meta.archetype` v spec dostává hodnotu `"other"` a intake jede ve "general mode" — bez priority_questions, bez gotchas, bez stack default.

## Living artifacts

Archetypy jsou **living** — během reálného provozu se budou refinovat. Pravidla:

- **Po každém reálném intake** (Wave 2.4 a dál) zaznamenat lessons do `docs/intake-learnings.md`. Pokud se ukáže, že některá `priority_question` je zastaralá nebo některý `gotcha` chybí, updatovat ten archetype.
- **Confidence level** posouvat nahoru, jak roste experience: low → medium → medium-high → high.
- **Major refactor** (přidání / odebrání archetypu, změna structure) vyžaduje ADR — viz [`DECISIONS.md`](../docs/DECISIONS.md).
- **Self-improvement loop** podobný `known-patterns/` (ADR-0011) může být přidán post-V1, kdy intake-agent navrhuje pattern updates do `archetypes/learnings/pending/`.

## Validace

Archetypy nemají JSON Schema (intentionally — Wave 1 cíleno na pragmatic). Sanity check:

```bash
# Validní YAML
for f in archetypes/*.yaml; do
  python3 -c "import yaml; yaml.safe_load(open('$f'))" && echo "✓ $f"
done

# Konzistence se stack-catalog.yaml — každý suggested_stack.track musí existovat
grep "^  track: " archetypes/*.yaml | awk '{print $3}' | sort -u
# All values should be in: stack-catalog.yaml stacks: keys
```

Pokud archetype začne být složitý a chyby v něm by drahě stály, doplnit JSON Schema. Pro V1 je manual review postačující.
