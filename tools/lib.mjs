// Shared helpers for the CLI tools under factory-core/tools/.
//
// Why a separate file: Node ESM resolves imports by exact path with extension,
// so the shebang-style validate-* scripts can't import from each other directly.
// Putting shared logic here keeps the executables thin.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const FACTORY_CORE = process.env.FACTORY_CORE
  ? resolve(process.env.FACTORY_CORE)
  : resolve(__dirname, "..");

export function colour(s, code) {
  if (!process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}
export const red    = (s) => colour(s, "31");
export const green  = (s) => colour(s, "32");
export const yellow = (s) => colour(s, "33");
export const dim    = (s) => colour(s, "2");

export function die(msg, code = 2) {
  process.stderr.write(red(`error: ${msg}\n`));
  process.exit(code);
}

function walkSchemas(root, out = []) {
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const st = statSync(path);
    if (st.isDirectory()) walkSchemas(path, out);
    else if (entry.endsWith(".schema.json")) out.push(path);
  }
  return out;
}

export function buildAjv() {
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  for (const path of walkSchemas(join(FACTORY_CORE, "schemas"))) {
    try {
      const schema = JSON.parse(readFileSync(path, "utf8"));
      if (schema.$id && !ajv.getSchema(schema.$id)) ajv.addSchema(schema);
    } catch {
      // Skip malformed schemas during pre-registration; the targeted compile
      // below will surface a real error if the user asked to validate against one.
    }
  }
  return ajv;
}

export function formatErr(err) {
  const path = err.instancePath || "(root)";
  const params = Object.keys(err.params || {}).length
    ? " " + dim(JSON.stringify(err.params))
    : "";
  return `    ${path} ${err.message}${params}`;
}

export function compileFor(ajv, schema) {
  if (schema.$id && ajv.getSchema(schema.$id)) return ajv.getSchema(schema.$id);
  return ajv.compile(schema);
}
