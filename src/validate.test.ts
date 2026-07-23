import { describe, expect, it } from "vitest";
import { validateProject, validateProjects, parseProjects } from "./validate";
import projects from "../data/projects.json";

const valid = {
  name: "example",
  url: "https://github.com/owner/repo",
  description: "A one-line description.",
  language: "TypeScript",
  tags: ["ai", "cli"],
  devin_collaborator: true,
  submitted_by: "octocat",
};

describe("validateProject", () => {
  it("accepts a fully-populated valid entry", () => {
    expect(validateProject(valid)).toEqual({ valid: true, errors: [] });
  });

  it("accepts an entry with only required fields", () => {
    const minimal = {
      name: "example",
      url: "https://github.com/owner/repo",
      description: "desc",
      submitted_by: "octocat",
    };
    expect(validateProject(minimal).valid).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(validateProject("nope").valid).toBe(false);
    expect(validateProject(null).valid).toBe(false);
  });

  it("requires name, url, description, submitted_by", () => {
    const { valid: ok, errors } = validateProject({});
    expect(ok).toBe(false);
    expect(errors).toHaveLength(4);
  });

  it("rejects non-GitHub urls", () => {
    const r = validateProject({ ...valid, url: "https://example.com/x" });
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain("GitHub repository URL");
  });

  it("rejects wrong types for optional fields", () => {
    expect(validateProject({ ...valid, tags: "ai" }).valid).toBe(false);
    expect(validateProject({ ...valid, tags: [1, 2] }).valid).toBe(false);
    expect(validateProject({ ...valid, language: 5 }).valid).toBe(false);
    expect(validateProject({ ...valid, devin_collaborator: "yes" }).valid).toBe(false);
  });
});

describe("validateProjects", () => {
  it("rejects non-arrays", () => {
    expect(validateProjects({}).valid).toBe(false);
  });

  it("detects duplicate urls (case/trailing-slash insensitive)", () => {
    const r = validateProjects([
      valid,
      { ...valid, url: "https://github.com/Owner/Repo/" },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain("duplicate");
  });

  it("aggregates errors across entries", () => {
    const r = validateProjects([valid, {}]);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe("parseProjects", () => {
  it("throws on invalid data", () => {
    expect(() => parseProjects([{}])).toThrow(/Invalid projects data/);
  });

  it("returns the array when valid", () => {
    expect(parseProjects([valid])).toHaveLength(1);
  });
});

describe("data/projects.json", () => {
  it("is valid against the schema", () => {
    expect(validateProjects(projects)).toEqual({ valid: true, errors: [] });
  });
});
