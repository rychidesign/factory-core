#!/usr/bin/env node
// Permission matrix smoke test.
//
// Spawns permission-gate.mjs across a curated set of scenarios — every
// agent class (orchestrator, builder, auditor, deployer, healer) gets at
// least one positive (allowed) and one negative (denied) probe. Run as:
//
//   pnpm test:permissions
//   FACTORY_PERMISSIONS=path/to/alt.yaml node tools/test-permissions.mjs
//
// Exit codes: 0 all pass / 1 at least one mismatch / 2 invocation error.

import { spawnSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { existsSync, rmSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FACTORY_CORE = resolve(__dirname, "..");
const HOOK = join(FACTORY_CORE, ".opencode", "hooks", "permission-gate.mjs");

if (!existsSync(HOOK)) {
  process.stderr.write(`hook not found: ${HOOK}\n`);
  process.exit(2);
}

// Each scenario specifies: a label, the env vars to set, and the expected
// exit code (0 = allowed, 1 = denied). Audit log is redirected to a tmp
// file per run so it doesn't pollute factory-logs/.
const tmpAudit = join(tmpdir(), `factory-permission-audit-${process.pid}.jsonl`);

const SCENARIOS = [
  // ---- orchestrator ----
  { label: "orchestrator may write state.json",
    agent: "orchestrator", tool: "write", resource: ".factory-state/state.json",
    expect: 0 },
  { label: "orchestrator may write nested blockers/B-001.json",
    agent: "orchestrator", tool: "write", resource: ".factory-state/blockers/B-001.json",
    expect: 0 },
  { label: "orchestrator may NOT write workspace files",
    agent: "orchestrator", tool: "write", resource: ".factory-state/workspace/src/index.astro",
    expect: 1 },
  { label: "orchestrator may NOT write spec files",
    agent: "orchestrator", tool: "write", resource: "spec/business.yaml",
    expect: 1 },
  { label: "orchestrator may run `git status`",
    agent: "orchestrator", tool: "bash", resource: "git status",
    expect: 0 },
  { label: "orchestrator may NOT run `pnpm install`",
    agent: "orchestrator", tool: "bash", resource: "pnpm install",
    expect: 1 },

  // ---- frontend-builder ----
  { label: "frontend-builder may write workspace pages",
    agent: "frontend-builder", tool: "write", resource: ".factory-state/workspace/src/pages/index.astro",
    expect: 0 },
  { label: "frontend-builder may write deeply nested workspace files",
    agent: "frontend-builder", tool: "write", resource: ".factory-state/workspace/src/components/ui/Card.tsx",
    expect: 0 },
  { label: "frontend-builder may NOT write spec",
    agent: "frontend-builder", tool: "write", resource: "spec/scope.yaml",
    expect: 1 },
  { label: "frontend-builder may NOT write design tokens",
    agent: "frontend-builder", tool: "write", resource: ".factory-state/artifacts/design/design-tokens.json",
    expect: 1 },
  { label: "frontend-builder may run `pnpm build`",
    agent: "frontend-builder", tool: "bash", resource: "pnpm build",
    expect: 0 },
  { label: "frontend-builder may run `git commit -m \"...\"`",
    agent: "frontend-builder", tool: "bash", resource: "git commit -m \"build /about\"",
    expect: 0 },
  { label: "frontend-builder may NOT run `git push`",
    agent: "frontend-builder", tool: "bash", resource: "git push origin main",
    expect: 1 },
  { label: "frontend-builder may NOT run `rm -rf node_modules`",
    agent: "frontend-builder", tool: "bash", resource: "rm -rf node_modules",
    expect: 1 },
  { label: "frontend-builder may NOT run `sudo systemctl restart nginx`",
    agent: "frontend-builder", tool: "bash", resource: "sudo systemctl restart nginx",
    expect: 1 },
  { label: "frontend-builder may NOT run `curl https://evil.example`",
    agent: "frontend-builder", tool: "bash", resource: "curl https://evil.example",
    expect: 1 },

  // ---- design-auditor ----
  { label: "design-auditor may write audit json",
    agent: "design-auditor", tool: "write", resource: ".factory-state/artifacts/audits/design-2026-04-28.json",
    expect: 0 },
  { label: "design-auditor may NOT write to workspace",
    agent: "design-auditor", tool: "write", resource: ".factory-state/workspace/src/pages/index.astro",
    expect: 1 },
  { label: "design-auditor may run `npx playwright test`",
    agent: "design-auditor", tool: "bash", resource: "npx playwright test --grep design",
    expect: 0 },
  { label: "design-auditor may NOT run `npm install`",
    agent: "design-auditor", tool: "bash", resource: "npm install something",
    expect: 1 },

  // ---- deployer ----
  { label: "deployer may write deploy-info.json",
    agent: "deployer", tool: "write", resource: "deploy-info.json",
    expect: 0 },
  { label: "deployer may run `git push`",
    agent: "deployer", tool: "bash", resource: "git push origin main",
    expect: 0 },
  { label: "deployer may run `npx wrangler pages deploy`",
    agent: "deployer", tool: "bash", resource: "npx wrangler pages deploy dist",
    expect: 0 },
  { label: "deployer may NOT write spec/",
    agent: "deployer", tool: "write", resource: "spec/stack.yaml",
    expect: 1 },
  { label: "deployer may NOT run `rm -rf dist`",
    agent: "deployer", tool: "bash", resource: "rm -rf dist",
    expect: 1 },

  // ---- healer ----
  { label: "healer may write workspace files (recovery)",
    agent: "healer", tool: "write", resource: ".factory-state/workspace/package.json",
    expect: 0 },
  { label: "healer may propose pending pattern",
    agent: "healer", tool: "write", resource: "factory-core/known-patterns/pending/sanity-cors-fix.md",
    expect: 0 },
  { label: "healer may NOT auto-approve patterns",
    agent: "healer", tool: "write", resource: "factory-core/known-patterns/approved/sanity-cors-fix.md",
    expect: 1 },
  { label: "healer may NOT modify permissions.yaml",
    agent: "healer", tool: "write", resource: "factory-core/.opencode/permissions.yaml",
    expect: 1 },
  { label: "healer may NOT git push",
    agent: "healer", tool: "bash", resource: "git push origin main",
    expect: 1 },
  { label: "healer may run `git stash`",
    agent: "healer", tool: "bash", resource: "git stash push -m diagnostic",
    expect: 0 },

  // ---- default fallback ----
  { label: "unknown agent (no entry, no default match) is denied write",
    agent: "totally-unknown-agent-xyz", tool: "write", resource: ".factory-state/state.json",
    expect: 1 },
  { label: "unknown agent is denied bash",
    agent: "totally-unknown-agent-xyz", tool: "bash", resource: "ls",
    expect: 1 },
];

function runScenario(s) {
  const env = {
    ...process.env,
    FACTORY_AGENT: s.agent,
    OPENCODE_TOOL_NAME: s.tool,
    OPENCODE_TOOL_RESOURCE: s.resource,
    FACTORY_AUDIT_LOG: tmpAudit,
  };
  const result = spawnSync("node", [HOOK], { env, stdio: ["ignore", "pipe", "pipe"] });
  return { code: result.status, stderr: result.stderr.toString().trim() };
}

function colour(s, code) {
  if (!process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}
const green = (s) => colour(s, "32");
const red = (s) => colour(s, "31");
const dim = (s) => colour(s, "2");

let pass = 0;
let fail = 0;
const t0 = Date.now();

for (const s of SCENARIOS) {
  const { code, stderr } = runScenario(s);
  if (code === s.expect) {
    pass++;
    process.stdout.write(`${green("✓")} ${s.label}\n`);
  } else {
    fail++;
    process.stdout.write(`${red("✗")} ${s.label}\n`);
    process.stdout.write(`    expected exit ${s.expect}, got ${code}\n`);
    if (stderr) process.stdout.write(`    stderr: ${dim(stderr)}\n`);
  }
}

const ms = Date.now() - t0;
process.stdout.write(dim("---") + "\n");
process.stdout.write(`${pass} pass, ${fail} fail (${SCENARIOS.length} total) in ${ms} ms\n`);

if (existsSync(tmpAudit)) {
  rmSync(tmpAudit, { force: true });
}

process.exit(fail === 0 ? 0 : 1);
