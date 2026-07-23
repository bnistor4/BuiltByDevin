// Discover GitHub repositories built with Devin and merge them into
// data/projects.json.
//
// GitHub does not expose a public endpoint to list every repository where a
// given user is a *collaborator* (that requires push access to each repo), so
// this script uses the Commit Search API as a public proxy: it finds repos
// that contain commits authored by the `devin-ai-integration[bot]` account,
// which is a strong signal that Devin contributed to the project.
//
// Usage:
//   GITHUB_TOKEN=<token> node scripts/discover.mjs [--write] [--max=N]
//
// Without --write the script prints what it would add (dry run). A token is
// strongly recommended to avoid low unauthenticated rate limits.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateProjects, normalizeUrl } from "./schema.mjs";

const BOT_LOGIN = "devin-ai-integration[bot]";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(here, "../data/projects.json");

const args = process.argv.slice(2);
const write = args.includes("--write");
const maxArg = args.find((a) => a.startsWith("--max="));
const max = maxArg ? Number(maxArg.split("=")[1]) : 10000;

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

function headers() {
  const h = {
    Accept: "application/vnd.github.cloak-preview+json",
    "User-Agent": "built-with-devin-discovery",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ghFetch(url, attempt = 0) {
  const res = await fetch(url, { headers: headers() });

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const retryAfter = Number(res.headers.get("retry-after"));
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
    // Primary or secondary rate limit — wait and retry a bounded number of times.
    let waitMs = 0;
    if (retryAfter) waitMs = retryAfter * 1000;
    else if (remaining === "0" && reset) waitMs = Math.max(0, reset - Date.now());
    else waitMs = 5000 * (attempt + 1);

    if (attempt < 6 && waitMs <= 120000) {
      console.log(`  rate limited, waiting ${Math.ceil(waitMs / 1000)}s…`);
      await sleep(waitMs + 500);
      return ghFetch(url, attempt + 1);
    }
    throw new Error(
      `GitHub rate limit exceeded (status ${res.status}). ` +
        `Reset at ${reset ? new Date(reset).toISOString() : "unknown"}. ` +
        `Set GITHUB_TOKEN to raise the limit.`,
    );
  }

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// The Commit Search API caps results at 1000 (10 pages x 100). To go beyond
// that we page through time windows: within each window we sort by
// committer-date desc, then start the next window just before the oldest
// commit we saw. Repeat until no more commits or we reach `max`.
async function findRepos() {
  const repos = new Map();
  const perPage = 100;
  let until = null; // ISO instant; only commits strictly before this are searched
  let window = 0;

  while (repos.size < max && window < 200) {
    window += 1;
    let oldest = null;
    let pagesFetched = 0;

    for (let page = 1; page <= 10 && repos.size < max; page += 1) {
      const qualifier = until ? ` committer-date:<${until}` : "";
      const q = encodeURIComponent(`author:${BOT_LOGIN}${qualifier}`);
      const url =
        `https://api.github.com/search/commits?q=${q}` +
        `&sort=committer-date&order=desc&per_page=${perPage}&page=${page}`;
      const data = await ghFetch(url);
      const items = data.items ?? [];
      pagesFetched += 1;
      if (items.length === 0) break;

      for (const item of items) {
        const repo = item.repository;
        if (repo && !repo.private && !repos.has(repo.full_name)) {
          repos.set(repo.full_name, repo);
        }
        const date = item.commit?.committer?.date || item.commit?.author?.date;
        if (date && (!oldest || date < oldest)) oldest = date;
      }

      await sleep(2200); // stay under the ~30 req/min commit-search limit
      if (items.length < perPage) break;
    }

    console.log(
      `  window ${window}: ${repos.size} unique repo(s) so far` +
        (until ? ` (before ${until})` : ""),
    );

    // Stop when a window returned less than a full page set or we can't advance.
    if (pagesFetched < 10 || !oldest || oldest === until) break;
    // Next window ends 1 second before the oldest commit seen (avoid re-reading it).
    until = new Date(new Date(oldest).getTime() - 1000).toISOString();
  }

  return Array.from(repos.values()).slice(0, max);
}

function toProject(repo) {
  return {
    name: repo.name,
    url: `https://github.com/${repo.full_name}`,
    description: repo.description?.trim() || "No description provided.",
    ...(repo.language ? { language: repo.language } : {}),
    ...(Array.isArray(repo.topics) && repo.topics.length
      ? { tags: repo.topics }
      : {}),
    devin_collaborator: true,
    submitted_by: "devin-discovery",
  };
}

async function main() {
  const existing = JSON.parse(await readFile(dataPath, "utf8"));
  const existingUrls = new Set(existing.map((p) => normalizeUrl(p.url)));

  console.log(`Searching GitHub for repositories with commits by ${BOT_LOGIN}…`);
  const repos = await findRepos();
  console.log(`Found ${repos.length} candidate repo(s).`);

  const additions = repos
    .map(toProject)
    .filter((p) => !existingUrls.has(normalizeUrl(p.url)));

  if (additions.length === 0) {
    console.log("No new repositories to add.");
    return;
  }

  const merged = [...existing, ...additions];
  const { valid, errors } = validateProjects(merged);
  if (!valid) {
    console.error("Merged data failed validation:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`${additions.length} new project(s):`);
  for (const p of additions) console.log(`  + ${p.url}`);

  if (write) {
    await writeFile(dataPath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`Wrote ${merged.length} project(s) to data/projects.json.`);
  } else {
    console.log("\nDry run — re-run with --write to persist these changes.");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
