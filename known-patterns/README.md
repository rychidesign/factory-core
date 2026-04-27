# Known patterns

Knowledge base healer agentu pro opakující se problémy (npm install errors, Sanity config issues, build failures, …).

## Struktura

- `approved/` — patterns používané healerem v každém runu. Schválené Jirkou.
- `pending/` — patterns navržené healerem po úspěšném vyřešení neznámého problému. Čekají na review.

Self-improvement loop popsán v [`docs/ARCHITECTURE.md` §8.3](../docs/ARCHITECTURE.md) a v ADR-0011 ([`docs/DECISIONS.md`](../docs/DECISIONS.md)).

## Formát patternu

Pattern je samostatný markdown soubor s frontmatter:

```yaml
---
id: pattern-XXX
name: "Krátký název"
discovered_at: YYYY-MM-DD
discovered_by: healer
confidence: low | medium | high
applies_to: [stack-track-1, stack-track-2]
---

# Název

## Symptom
…

## Root cause
…

## Resolution
…

## Validation
…

## Confidence
…
```

První reálné patterns přijdou s prvními failures během Wave 3 (krok 3.5).
