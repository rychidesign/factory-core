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
