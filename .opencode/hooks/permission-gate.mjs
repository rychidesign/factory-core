#!/usr/bin/env node
// Pre-tool-use hook. Runs before every tool call an agent attempts.
//
// Reads three env vars provided by the runtime:
//   FACTORY_AGENT          — current agent name (e.g. "frontend-builder")
//   OPENCODE_TOOL_NAME     — "write" or "bash"
//   OPENCODE_TOOL_RESOURCE — file path (for write) or full command (for bash)
//
// Resolution order, deny wins:
//   1. Walk deny patterns for the agent. Match? exit 1, log denial, surface
//      reason to the runtime so the orchestrator escalates.
//   2. Walk allow patterns. Match? exit 0, log allow.
//   3. Default: exit 1 (no rule covers the call → treat as denied).
//
// Performance budget: < 50 ms per call. Cold Node + js-yaml parse is
// typically 30–60 ms; we cache the parsed permissions in the per-process
// scope but a fresh process is the common case for hooks.
//
// Audit log: factory-logs/permission-audit.jsonl (one JSON per call).
//
// Exit codes:
//   0 — allowed, tool may proceed
//   1 — denied (matched deny rule or no allow rule covers)
//   2 — invocation error (missing env vars, missing permissions.yaml)

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FACTORY_CORE = process.env.FACTORY_CORE
  ? resolve(process.env.FACTORY_CORE)
  : resolve(__dirname, "..", "..");

const PERMISSIONS_PATH = process.env.FACTORY_PERMISSIONS
  ? resolve(process.env.FACTORY_PERMISSIONS)
  : join(FACTORY_CORE, ".opencode", "permissions.yaml");

const AUDIT_LOG = process.env.FACTORY_AUDIT_LOG
  ? resolve(process.env.FACTORY_AUDIT_LOG)
  : join(FACTORY_CORE, "factory-logs", "permission-audit.jsonl");

function die(msg, code = 2) {
  process.stderr.write(`permission-gate: ${msg}\n`);
  process.exit(code);
}

function loadPermissions() {
  if (!existsSync(PERMISSIONS_PATH)) {
    die(`permissions.yaml not found at ${PERMISSIONS_PATH}`);
  }
  try {
    return parseYaml(readFileSync(PERMISSIONS_PATH, "utf8"));
  } catch (e) {
    die(`failed to parse permissions.yaml: ${e.message}`);
  }
}

// Convert a permission pattern into a RegExp.
// `**` collapses to `*`, `*` matches any character (including `/`).
// Other regex metachars are escaped. Anchored at both ends.
function patternToRegex(pattern) {
  const collapsed = pattern.replace(/\*\*/g, "*");
  const escaped = collapsed
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAny(resource, patterns) {
  if (!patterns || patterns.length === 0) return null;
  for (const p of patterns) {
    if (patternToRegex(p).test(resource)) return p;
  }
  return null;
}

function audit(record) {
  try {
    mkdirSync(dirname(AUDIT_LOG), { recursive: true });
    appendFileSync(AUDIT_LOG, JSON.stringify(record) + "\n", "utf8");
  } catch {
    // Auditing must never block a tool call. Silently swallow log failures.
  }
}

function main() {
  const agent = process.env.FACTORY_AGENT || "default";
  const tool = process.env.OPENCODE_TOOL_NAME;
  const resource = process.env.OPENCODE_TOOL_RESOURCE;

  if (!tool) die(`OPENCODE_TOOL_NAME env var missing`);
  if (resource === undefined) die(`OPENCODE_TOOL_RESOURCE env var missing`);

  const perms = loadPermissions();
  const agentPerms = perms?.agents?.[agent] ?? perms?.agents?.default;
  if (!agentPerms) die(`no permissions entry for agent "${agent}" and no "default" fallback defined`);

  const toolPerms = agentPerms[tool];
  if (!toolPerms) {
    audit({
      ts: new Date().toISOString(),
      agent,
      tool,
      resource,
      result: "denied",
      reason: `tool "${tool}" not configured for agent`,
    });
    process.stderr.write(`DENIED: agent "${agent}" has no rules for tool "${tool}"\n`);
    process.exit(1);
  }

  const denyMatch = matchesAny(resource, toolPerms.deny);
  if (denyMatch) {
    audit({
      ts: new Date().toISOString(),
      agent,
      tool,
      resource,
      result: "denied",
      reason: `matched deny rule "${denyMatch}"`,
    });
    process.stderr.write(`DENIED: agent "${agent}" cannot ${tool} on "${resource}" (matched deny: ${denyMatch})\n`);
    process.exit(1);
  }

  const allowMatch = matchesAny(resource, toolPerms.allow);
  if (allowMatch) {
    audit({
      ts: new Date().toISOString(),
      agent,
      tool,
      resource,
      result: "allowed",
      reason: `matched allow rule "${allowMatch}"`,
    });
    process.exit(0);
  }

  audit({
    ts: new Date().toISOString(),
    agent,
    tool,
    resource,
    result: "denied",
    reason: "no allow rule matched (default deny)",
  });
  process.stderr.write(`DENIED: agent "${agent}" has no allow rule for ${tool} "${resource}"\n`);
  process.exit(1);
}

main();
