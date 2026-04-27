# State management — referenční dokumentace

**Účel tohoto dokumentu:** popsat, **kde** žije runtime stav projektu, **jak se updatuje**, a **jak ho recovery z padu vrátí do funkčního stavu**. Toto je primární referenční dokument pro orchestrátora, builder agenty i dashboard.

Pro **co** factory dělá viz [`PRD.md`](../PRD.md). Pro **proč** stateless pattern viz [ADR-0002](../DECISIONS.md). Pro **strukturu spec/** viz [`docs/reference/spec-schema.md`](spec-schema.md).

---

## 1. Kde stav žije

```
clients/<project-id>/
└── .factory-state/
    ├── state.json                 # canonical project state (atomic write)
    ├── plan.md                    # living implementation plan
    ├── decisions.jsonl            # append-only decision log
    ├── .locks/                    # advisory file locks (flock targets)
    │
    ├── blockers/                  # one file per pending blocker
    │   ├── B-001.json
    │   └── B-002.json
    │
    ├── logs/                      # structured per-agent JSONL logs
    │   ├── orchestrator.jsonl
    │   ├── frontend-builder.jsonl
    │   └── ...
    │
    ├── artifacts/                 # agent outputs (architecture, design, audits, screenshots)
    └── workspace/                 # actual website code (separately git-tracked)
```

**Žádná databáze.** Vše je file-based. Důvody v [ADR-0004](../DECISIONS.md): git-versionable, human-readable, recovery-friendly, zero setup, LLM-friendly.

---

## 2. Schemas, které stav popisují

| Soubor | Schema | Validátor |
|---|---|---|
| `state.json` | [`schemas/state.schema.json`](../../schemas/state.schema.json) | `node tools/validate-json schemas/state.schema.json <file>` |
| `plan.md` (metadata blok) | [`schemas/plan-meta.schema.json`](../../schemas/plan-meta.schema.json) | `node tools/validate-plan <file>` |
| `plan.md` (struktura) | [`schemas/plan-format.md`](../../schemas/plan-format.md) | `node tools/validate-plan <file>` |
| `decisions.jsonl` (per řádek) | [`schemas/decisions-log.schema.json`](../../schemas/decisions-log.schema.json) | `node tools/validate-jsonl schemas/decisions-log.schema.json <file>` |
| `blockers/B-NNN.json` | [`schemas/agent-signals/blocker.schema.json`](../../schemas/agent-signals/blocker.schema.json) | `node tools/validate-json schemas/agent-signals/blocker.schema.json <file>` |

JSON Signal schemas (returned by agents, not persisted in `.factory-state/` directly except in logs):

- [`auditor-result.schema.json`](../../schemas/agent-signals/auditor-result.schema.json)
- [`builder-result.schema.json`](../../schemas/agent-signals/builder-result.schema.json)
- [`orchestrator-decision.schema.json`](../../schemas/agent-signals/orchestrator-decision.schema.json)

---

## 3. Atomic write pattern

`state.json` je nejcitlivější soubor — orchestrátor ho čte a zapisuje každou iteraci. Crash mid-write by ho mohl nechat v polovině zapsaný a porušit factory.

**Pattern:** write-to-tmp + rename. POSIX `rename(2)` na stejném filesystému je atomic.

```bash
# Pseudokód (skutečnou implementaci píše orchestrator-runner v Node)
echo "$NEW_JSON" > .factory-state/state.json.tmp
mv .factory-state/state.json.tmp .factory-state/state.json
```

V Node:

```js
import { writeFile, rename } from "node:fs/promises";

async function atomicWriteJSON(path, data) {
  const tmp = `${path}.tmp.${process.pid}`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, path);
}
```

Co tento pattern **negarantuje**:
- Atomicita napříč více souborů (státu + decisions.jsonl + plan.md). Pro to viz §5.
- Trvanlivost na disku po rename (potřeba `fsync`, který orchestrátor volá explicitně po každé iteraci).

Co garantuje:
- Žádný čtenář nikdy neuvidí half-written `state.json`.
- Po crashi mid-iteration je `state.json` v posledním známém valid stavu.

---

## 4. Append-only soubory

`decisions.jsonl` a per-agent `logs/*.jsonl` jsou **append-only**. Nikdy se nepřepisují celé.

```js
import { appendFile } from "node:fs/promises";

async function appendDecision(entry) {
  await appendFile(
    ".factory-state/decisions.jsonl",
    JSON.stringify(entry) + "\n",
    "utf8",
  );
}
```

Append do existujícího souboru je **téměř** atomic na POSIXu (jeden `write()` syscall pro řádek typicky < 4 KB), ale ne garantovaně. Pro absolutní jistotu by orchestrátor měl použít `O_APPEND` flag (Node `fs.open` s `'a'` flag to dělá automaticky).

**Důsledek pro recovery:** crash uprostřed `appendFile` může nechat poslední řádek truncated. Validátor `validate-jsonl` to detekuje a hlásí jako "invalid JSON on line N" — recovery procedura zahodí poslední řádek.

---

## 5. Multi-file iteration commit

Jedna orchestrator iterace typicky updatuje **více souborů**:

1. `state.json` (atomic write)
2. `decisions.jsonl` (append)
3. `plan.md` (atomic write, pokud agent task-checked)
4. `logs/<agent>.jsonl` (append)

Tyto operace **nejsou transakční napříč**. Pokud crashne mezi `state.json` write a `decisions.jsonl` append, dostaneš inkonzistenci.

**Mitigation:**

- **Pořadí operací:** decisions.jsonl append PRVNÍ, pak state.json. Pokud máš decision bez odpovídajícího state update, recovery to detekuje a state znovu zaplní z decision (re-derivable). Opačné pořadí by bylo horší — měl bys state, který nikdy nedostal záznam.
- **Git commit po iteraci:** orchestrátor po každé iteraci dělá `git -C clients/<id> add -A && git commit -m "iter-N: ..."`. Tím získáš point-in-time snapshot, do kterého jde vrátit. To je primární mechanismus konzistence.
- **Recovery procedura:** viz §6.

---

## 6. File locking

Když několik procesů zároveň píše do `.factory-state/` (orchestrator + builder agent + dashboard read), použij advisory `flock` lock.

```js
import { open } from "node:fs/promises";
import { flock } from "fs-ext";   // small native dep

async function withStateLock(fn) {
  const fd = await open(".factory-state/.locks/state.lock", "w+");
  await flock(fd.fd, "ex");
  try {
    return await fn();
  } finally {
    await flock(fd.fd, "un");
    await fd.close();
  }
}
```

Pro V1 (sequential operation per ADR-0009) to není nutné — orchestrátor je jediný písárce v daný moment. Lock přidáme s parallelismem ve V2.

Dashboard čte `state.json` bez locku — pokud načte right after rename, dostane consistent snapshot díky atomic write.

---

## 7. Recovery scenarios

### 7.1 Crash mid-iteration

**Detekce:** factory restart, orchestrator čte `state.json` a zjistí, že `last_iteration` < skutečně poslední iterace v `decisions.jsonl`.

**Procedura:**

1. Read `decisions.jsonl`, najdi poslední entry s `iter > state.last_iteration`.
2. Pokud poslední entry je `agent_complete`: agent dokončil, ale state ještě nezaktualizoval → re-apply jeho effekty na state.json.
3. Pokud poslední entry je `spawn`: agent byl spawnut, ale buď nedokončil nebo crashnul. Bezpečné je ho znovu spawnout (idempotent task) nebo escalovat na healer.
4. Pokud `decisions.jsonl` má truncated last line (validátor failne), drop ji.

### 7.2 Agent process killed (timeout, OOM, hard kill)

**Detekce:** agent proces neukončil v rámci `max_duration_minutes` z agent definice.

**Procedura:**

1. Orchestrátor zaloguje `decision: agent_complete, result_status: failed, reason: timeout`.
2. State.json `health.consecutive_failures += 1`.
3. Spawn healer s context o failed agentovi.

### 7.3 Manual intervention (Jirka edituje state.json přímo)

**Detekce:** state.json `last_updated` je novější než `last_iteration` timestamp v `decisions.jsonl`.

**Procedura:**

1. Orchestrátor zaloguje `decision: manual_intervention, operator: <name>`.
2. Pokračuje od edited state. Není potřeba re-deriving.

Manual edits jsou **first-class workflow**, ne edge case. Per ADR-0002 a [ARCHITECTURE §3.5](../ARCHITECTURE.md), Jirka může cokoli editovat, factory se s tím vyrovná.

### 7.4 Total server outage

**Procedura:**

1. Pokud server je dead-dead, `git pull` na novém serveru (factory-core + klientské repo).
2. State je v git history — recovery to last commited state.
3. `factory resume <project>` → orchestrátor čte state, pokračuje.

Mezi git commity může dojít ke ztrátě **jedné iterace** (té poslední necommitnuté). Acceptable trade-off pro V1.

### 7.5 Decisions.jsonl corrupt (truncated last line)

**Detekce:** `node tools/validate-jsonl schemas/decisions-log.schema.json .factory-state/decisions.jsonl` failne na last line.

**Procedura:**

1. Použij `head -n -1` k odstranění last line.
2. Re-append from state.json + last known iteration.

---

## 8. Plan.md updates

Plan je markdown — **nelze atomically write part of file** (rename pattern přepisuje celý soubor). Postup:

1. Read current `plan.md`.
2. Parse markdown structure (headers, checkboxes).
3. Modify in-memory representation (např. `- [ ]` → `- [x]`).
4. Serialize back to markdown.
5. Atomic write (`.tmp` + rename).

Builder agenty editují **jen task checkboxes**, ne strukturu. Strukturu (přidávání/odebírání tasků, sub-phases) může měnit jen orchestrator, a jen pokud `lock_status != "locked"`.

Po Phase 2c se `lock_status` přepne na `"locked"`. Po tomto bodu žádný agent nepřidává tasky bez explicit unlock — viz [`plan-format.md` §4](../../schemas/plan-format.md).

---

## 9. State.json a context window

Orchestrátor je **stateless** — nepamatuje si nic mezi iteracemi. Každá iterace musí poskládat kontext z disku za < 15 k tokenů (per ADR-0002).

Co se čte (typický iteration kontext):

| Soubor | Kolik | Token cost |
|---|---|---|
| `state.json` | celý | ~1 k |
| `plan.md` | celý | 2–5 k |
| `decisions.jsonl` | **jen poslední 5** | ~0.5 k |
| `blockers/*.json` | jen pending | ~0.5 k pro typicky 0–2 blockerů |

Když log nebo plan rostou, neroste iteration kontext — orchestrátor čte jen relevantní rolling window. Tím se vyhneme context bloat (ARCHITECTURE.md §3.4).

---

## 10. Validace

```bash
# Per-file
node tools/validate-json schemas/state.schema.json .factory-state/state.json
node tools/validate-jsonl schemas/decisions-log.schema.json .factory-state/decisions.jsonl
node tools/validate-plan .factory-state/plan.md

# Plus všech blockers
for f in .factory-state/blockers/*.json; do
  node tools/validate-json schemas/agent-signals/blocker.schema.json "$f"
done

# Reference examples regression
pnpm validate:examples
```

`pnpm validate:examples` validuje všechny `examples/specs/`, `examples/state/`, `examples/agent-signals/`, `examples/decisions-log/` a `examples/plan/` proti odpovídajícím schemas. Slouží jako CI-style sanity check, že schemas + tooling spolu pořád sedí.

---

## 11. Versioning

Aktuální verze schemas: **1.0** (uložená v `schema_version` field každého souboru).

Při breaking změně:

1. Bump major (`1.0` → `2.0`).
2. Nový schema soubor vedle starého (např. `state.schema.json` zůstane, přibude `state.schema.v2.json` s novým `$id`).
3. Migration tool `tools/state-migrate` (V1 ho zatím nemáme — viz BACKLOG).
4. Validátor detekuje verzi z `schema_version` a routuje na správné schemas.
5. Po 30 dnech deprecation period staré schemas archivujeme do `schemas/archive/v1/`.

Drobné non-breaking změny (přidání optional pole, rozšíření enum) — bump minor (`1.0` → `1.1`) bez nového schema souboru.
