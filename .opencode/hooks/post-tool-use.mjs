#!/usr/bin/env node
// Post-tool-use hook. Runs after every tool call (success or failure) to
// record what happened, charge tokens against the project budget, and
// surface relevant signals to the orchestrator's next iteration.
//
// V1 scope: append to audit log + token counter. Cost calculation and
// budget threshold detection (75 % / 95 % / 100 %) live in the orchestrator
// runner — this hook just emits the raw event.
//
// Reads env:
//   FACTORY_AGENT          — current agent
//   OPENCODE_TOOL_NAME     — "write" or "bash"
//   OPENCODE_TOOL_RESOURCE — file path / command
//   OPENCODE_TOOL_RESULT   — "success" | "failure"
//   OPENCODE_TOOL_TOKENS   — tokens consumed by this call (string integer)
//   OPENCODE_TOOL_DURATION_MS — wall clock in milliseconds (string integer)
//   OPENCODE_TOOL_MODEL    — model id (e.g. "opencode/minimax-m2.7")
//
// Writes:
//   factory-logs/tool-events.jsonl — append-only event stream consumed by
//   the dashboard SSE feed and the orchestrator's recent_iterations updates.
//
// Exit code is always 0 — a post-tool hook must not block the runtime.

import { existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FACTORY_CORE = process.env.FACTORY_CORE
  ? resolve(process.env.FACTORY_CORE)
  : resolve(__dirname, "..", "..");

const EVENT_LOG = process.env.FACTORY_TOOL_EVENT_LOG
  ? resolve(process.env.FACTORY_TOOL_EVENT_LOG)
  : join(FACTORY_CORE, "factory-logs", "tool-events.jsonl");

function safeInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function main() {
  const event = {
    ts: new Date().toISOString(),
    agent: process.env.FACTORY_AGENT ?? "default",
    project_id: process.env.FACTORY_PROJECT_ID ?? null,
    tool: process.env.OPENCODE_TOOL_NAME ?? null,
    resource: process.env.OPENCODE_TOOL_RESOURCE ?? null,
    result: process.env.OPENCODE_TOOL_RESULT ?? "unknown",
    tokens: safeInt(process.env.OPENCODE_TOOL_TOKENS),
    duration_ms: safeInt(process.env.OPENCODE_TOOL_DURATION_MS),
    model: process.env.OPENCODE_TOOL_MODEL ?? null,
  };

  try {
    mkdirSync(dirname(EVENT_LOG), { recursive: true });
    appendFileSync(EVENT_LOG, JSON.stringify(event) + "\n", "utf8");
  } catch {
    // Hook must never block. Best-effort logging only.
  }

  process.exit(0);
}

main();
