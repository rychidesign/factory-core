#!/usr/bin/env bash
# Master regression: run every validator across every committed example.
# Used as `pnpm validate:examples`.
#
# Linux/macOS/WSL only — the factory dev environment is always one of those.

set -uo pipefail
cd "$(dirname "$0")/.."

failures=0

run() {
  if "$@"; then
    return 0
  else
    failures=$((failures + 1))
    return 0
  fi
}

echo "=== spec/ examples ==="
for d in examples/specs/*/; do
  echo "--- $d ---"
  run node tools/spec-validate "$d"
done

echo ""
echo "=== state ==="
run node tools/validate-json schemas/state.schema.json examples/state/active-build.json

echo ""
echo "=== agent-signals ==="
for f in examples/agent-signals/*.json; do
  base=$(basename "$f" .json)
  # Strip the example variant suffix to get the schema name:
  #   auditor-result-passed       -> auditor-result
  #   builder-result-complete     -> builder-result
  #   blocker-design-approval     -> blocker
  #   orchestrator-decision-spawn -> orchestrator-decision
  schema_name=$(echo "$base" | sed -E 's/-(passed|failed|complete|design-approval|spawn|advance-phase|escalate)$//')
  schema="schemas/agent-signals/${schema_name}.schema.json"
  echo "--- $f ---"
  run node tools/validate-json "$schema" "$f"
done

echo ""
echo "=== decisions-log ==="
run node tools/validate-jsonl schemas/decisions-log.schema.json examples/decisions-log/sample.jsonl

echo ""
echo "=== plan ==="
run node tools/validate-plan examples/plan/active-build.md

echo ""
if [[ $failures -eq 0 ]]; then
  echo "✓ all examples valid"
  exit 0
else
  echo "✗ $failures validation(s) failed"
  exit 1
fi
