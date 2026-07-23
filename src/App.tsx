import { useMemo, useState } from "react";
import projectsData from "../data/projects.json";
import { parseProjects } from "./validate";
import type { Project } from "./types";
import "./App.css";

const projects: Project[] = parseProjects(projectsData);

function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function repoSlug(url: string): string {
  return url.replace(/^https:\/\/github\.com\//, "").replace(/\/$/, "");
}

export default function App() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [tag, setTag] = useState("");

  const languages = useMemo(
    () => uniqueSorted(projects.map((p) => p.language)),
    [],
  );
  const tags = useMemo(
    () => uniqueSorted(projects.flatMap((p) => p.tags ?? [])),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        repoSlug(p.url).toLowerCase().includes(q);
      const matchesLanguage = !language || p.language === language;
      const matchesTag = !tag || (p.tags ?? []).includes(tag);
      return matchesQuery && matchesLanguage && matchesTag;
    });
  }, [query, language, tag]);

  return (
    <div className="page">
      <header className="hero">
        <h1>
          Built with <span className="accent">Devin</span>
        </h1>
        <p>
          A curated directory of GitHub projects built with{" "}
          <a href="https://devin.ai" target="_blank" rel="noreferrer">
            Devin
          </a>
          , the AI software engineer by Cognition.
        </p>
      </header>

      <section className="controls">
        <input
          type="search"
          placeholder="Search projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search projects"
        />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Filter by language"
        >
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          aria-label="Filter by tag"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </section>

      <p className="count">
        {filtered.length} project{filtered.length === 1 ? "" : "s"}
      </p>

      <ul className="grid">
        {filtered.map((p) => (
          <li key={p.url} className="card">
            <div className="card-head">
              <a href={p.url} target="_blank" rel="noreferrer" className="card-title">
                {p.name}
              </a>
              {p.devin_collaborator && (
                <span className="badge" title="devin-ai-integration[bot] is a collaborator">
                  Devin collaborator
                </span>
              )}
            </div>
            <p className="card-desc">{p.description}</p>
            <div className="card-meta">
              {p.language && <span className="lang">{p.language}</span>}
              {(p.tags ?? []).map((t) => (
                <button
                  key={t}
                  className="tag"
                  onClick={() => setTag(t)}
                  type="button"
                >
                  #{t}
                </button>
              ))}
            </div>
            <p className="submitted">
              {repoSlug(p.url)} · submitted by {p.submitted_by}
            </p>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="empty">No projects match your filters.</p>
      )}

      <footer className="footer">
        <a
          href="https://github.com/bnistor4/BuiltByDevin#manual-submission"
          target="_blank"
          rel="noreferrer"
        >
          Submit a project
        </a>
      </footer>
    </div>
  );
}
