import type { Project } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const GITHUB_URL_RE = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate a single project entry against the schema documented in the README. */
export function validateProject(value: unknown, index?: number): ValidationResult {
  const errors: string[] = [];
  const at = index === undefined ? "entry" : `entry[${index}]`;

  if (!isPlainObject(value)) {
    return { valid: false, errors: [`${at} must be an object`] };
  }

  const requiredStrings: (keyof Project)[] = [
    "name",
    "url",
    "description",
    "submitted_by",
  ];
  for (const key of requiredStrings) {
    const v = value[key];
    if (typeof v !== "string" || v.trim() === "") {
      errors.push(`${at}.${String(key)} is required and must be a non-empty string`);
    }
  }

  if (typeof value.url === "string" && !GITHUB_URL_RE.test(value.url)) {
    errors.push(`${at}.url must be a GitHub repository URL (https://github.com/owner/repo)`);
  }

  if (value.language !== undefined && typeof value.language !== "string") {
    errors.push(`${at}.language must be a string when present`);
  }

  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || value.tags.some((t) => typeof t !== "string")) {
      errors.push(`${at}.tags must be an array of strings when present`);
    }
  }

  if (
    value.devin_collaborator !== undefined &&
    typeof value.devin_collaborator !== "boolean"
  ) {
    errors.push(`${at}.devin_collaborator must be a boolean when present`);
  }

  return { valid: errors.length === 0, errors };
}

/** Validate the full projects list and check for duplicate URLs. */
export function validateProjects(value: unknown): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, errors: ["projects data must be an array"] };
  }

  const errors: string[] = [];
  const seen = new Set<string>();

  value.forEach((entry, i) => {
    const result = validateProject(entry, i);
    errors.push(...result.errors);

    if (isPlainObject(entry) && typeof entry.url === "string") {
      const key = entry.url.replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) {
        errors.push(`entry[${i}].url is a duplicate of an earlier entry`);
      }
      seen.add(key);
    }
  });

  return { valid: errors.length === 0, errors };
}

/** Parse and validate, returning typed projects or throwing with all errors. */
export function parseProjects(value: unknown): Project[] {
  const result = validateProjects(value);
  if (!result.valid) {
    throw new Error(`Invalid projects data:\n- ${result.errors.join("\n- ")}`);
  }
  return value as Project[];
}
