// Validate data/projects.json against the schema. Exits non-zero on failure.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateProjects } from "./schema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(here, "../data/projects.json");

const raw = await readFile(dataPath, "utf8");

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error(`data/projects.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const { valid, errors } = validateProjects(data);
if (!valid) {
  console.error("data/projects.json failed validation:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`data/projects.json is valid (${data.length} project(s)).`);
