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
- **`plan.schema.md` vs. `plan-format.md` naming** — ARCHITECTURE.md §2.1 nazývá soubor `plan.schema.md`, ROADMAP §1.3 (a teď i realita) `plan-format.md`. Sjednotit při příští round-of-fixes na ARCHITECTURE.md (volíme `plan-format.md`, protože je sémanticky jasnější — `.schema.md` byl matoucí, není to JSON Schema soubor).
- **`tools/state-migrate`** — schema migration tool pro state.json/plan.md/decisions.jsonl (až dojde k major version bump v1 → v2). Zatím YAGNI, jen poznámka — paralelní k `tools/spec-migrate` v BACKLOGu výše.
- **Refactor `tools/spec-validate` na `tools/lib.mjs`** — `spec-validate` (z 1.2) má duplikátní helpers (`buildAjv`, `formatErr`, color helpers) které teď žijí v `tools/lib.mjs`. Drobný refactor, ale nemá smysl ho dělat, dokud spec-validate nepotřebuje další úpravy.
- **Plan parser pro orchestrator** — `tools/validate-plan` ověřuje strukturu, ale nedělá full parse plan.md do typed model (tasks → states → ids). Plný parser je úloha orchestrátora v Krok 3.1.
- **PRD/ARCHITECTURE zmínka o `output: 'hybrid'`** — Astro 5 odstranilo `hybrid` output (sloučeno do default `static` s per-route `prerender = false`). PRD i ARCHITECTURE.md ho zmiňují, není kritický blocker (template fix už proběhl), ale stojí za to upravit při příští round-of-fixes na docs.
- **Sanity Studio embed varianta** — astro-sanity template aktuálně předpokládá standalone Studio. Pokud klient bude chtít embed (`/studio` route na Astro siteu), doplnit to jako optional flag v `factory new <project-id> --embedded-studio`. Composability v BACKLOGu.
- **Per-track templates pro astro-payload, nextjs-sanity, webflow** — stack-catalog má 4 entries, ale jen astro-sanity má funkční `templates/`. Ostatní vytvořit, až bude reálný klient s tím trackem (ROADMAP §1.4 deliberately scope-limit).
- **Cloudflare Pages adapter v template** — pro per-route SSR forms / API routes je potřeba přidat `pnpm astro add cloudflare`. Není v template default (žádný adapter = static), aby `pnpm install` nestahoval Cloudflare deps zbytečně. Doplnit jako optional krok ve `factory new`.
- **Archetypes self-improvement loop** — paralelní k `known-patterns/` (ADR-0011). Po každém reálném intake by intake-agent navrhl updates do `archetypes/learnings/pending/`, operátor schvaluje. Post-V1, až bude víc reálných dat.
- **JSON Schema pro archetype YAML** — V1 archetypy nemají formální schema (manual review postačí). Když struktura naroste nebo začnou přibývat 5+ archetypů, doplnit `archetypes.schema.json`.
- **Refine archetypes z reálu** — current confidence levels: medium (small-b2b, portfolio-creative), low (rest). Po Wave 2.4 (první reálný intake) musíme review a zúžit. Wave 6 (první real klient) potvrdí small-b2b.
- **`docs/intake-learnings.md`** — zatím neexistuje (přijde s Wave 2). Bude to log lessons learned z každého reálného intake, surovinou pro archetype refinement.
- **ARCHITECTURE.md §5.4 hooks language divergence** — ARCHITECTURE.md popisuje hooks jako bash + yq, my je implementovali jako Node + js-yaml (žádný extra system tool, reuse `tools/lib.mjs`, konzistentní s ostatním tooling). Aktualizovat ARCHITECTURE.md při příští round-of-fixes na docs.
- **Hook performance optimization** — current cold start ~65 ms per call. Pokud Wave 5 dashboard real-time monitoring odhalí bottleneck, zvážit (a) daemon mode hook (long-lived process listening on socket), (b) bash + yq fallback variant, (c) regex cache.
- **Network egress restrictions v permissions.yaml** — current matrix dovolí `curl *` u některých agentů (deployer, route-auditor). Není restrict na hosts (žádný `curl https://exfil.evil` block). Post-V1 doplnit `deny: ["curl http://*", "curl https://*evil*"]` per security review.
- **`permissions.schema.json`** — V1 nemá formal JSON Schema pro matrix (manual review). Když začnou přibývat agents nebo matrix bude error-prone, doplnit.
- **Daemon mode pro hooks** — v V1 každé volání = fresh Node process. Při scale (Wave 5+, parallel projects ve V2) zvážit long-lived daemon listening on Unix socket — eliminates cold start.
- **`scripts/`, `systemd/`, `config/` v ARCHITECTURE.md §2.1** — tyto adresáře přibyly v 1.7, ARCHITECTURE.md je nezmiňuje. Doplnit při příští round-of-fixes.
- **Cross-distro support pro server-setup.sh** — current scripts assume Ubuntu/Debian (apt). Pokud budeš někdy migrovat na Fedora / Arch / NixOS, doplnit detection + alternatives. Pro V1 (jeden homelab server) YAGNI.
- **Cloudflared cert renewal automation** — cert.pem expiruje cca po roce. Wave 5 monitor by mohl detekovat blížící se expiraci a poslat Telegram alert s instrukcemi.
- **Backup secrets.env do password manageru** — současný workflow je manuální. Možná stojí za úvahu integrace s 1Password CLI / Bitwarden CLI pro fetch secrets at boot, ale to je víc complexity než benefit pro single operator V1.
- **`factory new <project-id>` skript** — referencovaný v server-setup doc, ale neexistuje. Ships v Krok 3.4 (Wave 3).
- **`tools/factory-runner` binary** — referencovaný v `factory@.service` `ExecStart`. Neexistuje. Ships v Krok 3.1 (Wave 3, orchestrator V1).
- **`tools/factory-monitor`** — referencovaný v `factory-monitor.service`. Neexistuje. Ships v Krok 5.4 (Wave 5).
