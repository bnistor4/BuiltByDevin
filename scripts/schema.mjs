// Runtime schema validation for scripts (Node ESM).
// Mirrors src/validate.ts, which is used by the app and unit tests.

const GITHUB_URL_RE = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProject(value, index) {
  const errors = [];
  const at = index === undefined ? "entry" : `entry[${index}]`;

  if (!isPlainObject(value)) {
    return { valid: false, errors: [`${at} must be an object`] };
  }

  for (const key of ["name", "url", "description", "submitted_by"]) {
    const v = value[key];
    if (typeof v !== "string" || v.trim() === "") {
      errors.push(`${at}.${key} is required and must be a non-empty string`);
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

  if (value.devin_collaborator !== undefined && typeof value.devin_collaborator !== "boolean") {
    errors.push(`${at}.devin_collaborator must be a boolean when present`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateProjects(value) {
  if (!Array.isArray(value)) {
    return { valid: false, errors: ["projects data must be an array"] };
  }

  const errors = [];
  const seen = new Set();

  value.forEach((entry, i) => {
    errors.push(...validateProject(entry, i).errors);
    if (isPlainObject(entry) && typeof entry.url === "string") {
      const key = entry.url.replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) errors.push(`entry[${i}].url is a duplicate of an earlier entry`);
      seen.add(key);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function normalizeUrl(url) {
  return url.replace(/\/$/, "").toLowerCase();
}
