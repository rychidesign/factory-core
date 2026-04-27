# BACKLOG

Parking lot pro nápady, které vznikly během práce, ale nepatří do aktuálního kroku ROADMAPu. Cílem je zabránit scope creepu a neztratit dobré myšlenky.

## Pravidla

- Když uprostřed úkolu přijde nová myšlenka → **patří sem**, ne do aktuálního commitu.
- Záznamy stručné: jeden řádek pro nápad, případně 2–3 řádky kontextu.
- Periodicky (cca 1× týdně, na konci Wave) projdi a buď posuň do ROADMAPu, nebo vyhoď.
- Klientské projekty mají vlastní `BACKLOG.md` ve své `clients/<id>/` složce — sem patří jen věci o **factory-core** samotné.

## Otevřené nápady

- **ADR-0015 implementation table vs. realita docs** — tabulka říká, že `ARCHITECTURE.md` a další interní docs mají být anglicky, ale celý balíček je česky. Zvážit doplnění poznámky do ADR-0015 (interní docs zůstávají česky; anglicky je jen veřejný `README.md` a strojově čitelné artefakty: schemas, system prompts, hooks, skills, ADR titles).
- **`.claude/settings.json`** — obsahuje permissions z předchozí docs cleanup session (specifické sed/awk patterns). Posoudit, jestli to celé patří do repa, nebo to ignorovat a držet jen jako per-machine konfiguraci.
- **`business.industry` enum** — schéma má `industry` jako free string. Po prvních ~12 reálných intakeších zúžit na enum (např. `manufacturing`, `services-b2b`, `gastronomy`, `creative-portfolio`, …). Pomůže to archetype detection a content-writer agent.
- **YAML "404" gotcha** — `template: 404` v YAML se parsuje jako number a selže na string-enum validaci. V intake system promptu (Wave 2) explicitně instruovat, aby psal `template: "404"`. Případně zvažovat alias `not-found` jako alternativní enum value.
- **Spec schema migration tool** — až dojde k major bump (`v1` → `v2`), potřebujeme `tools/spec-migrate` skript (in-place upgrade existujících `clients/<id>/spec/`). Zatím YAGNI, jen poznámka.
- **Server Node 22 vs. dev Node 20** — `package.json` má `engines.node: ">=20.10.0"`, ale ARCHITECTURE i ROADMAP počítají s Node 22+ na produkci. Při server prep (krok 1.7) zúžit `engines` na `>=22.0.0` jakmile máme nainstalovaný 22 i lokálně.
- **Webflow track validator** — `track: webflow` validuje, ale celá pipeline je V1 placeholder per stack-catalog. Než přijde reálný Webflow client, nezapomenout doplnit `tools/validate-naming` pro Webflow specifika.
