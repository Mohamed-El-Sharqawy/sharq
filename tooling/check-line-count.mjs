// tooling/check-line-count.mjs — the SPEC §9.2 line-count gate (ESLint
// `max-lines` is the other half of the dual enforcement).
//
// For every .ts/.tsx file under the invoking workspace (cwd) it counts
// non-blank, non-comment lines exactly per the §9.2 definition:
//   - whitespace-only lines never count;
//   - lines that are nothing but comment trivia never count (multi-line
//     block comments included); a code line with a trailing comment counts;
//   - comment trivia comes from the TypeScript scanner, so "//" inside a
//     string, URL or template literal is never mistaken for a comment.
// It also loads and validates .linecount-exemptions.json (generated files
// only; each entry needs a non-empty reason and a YYYY-MM-DD review date)
// and fails on malformed, stale or expired entries. Exits 1 on any problem.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Engineering constant (SPEC §9.2) — fixed in code; changes go through SPEC.
const MAX_LINES = 150;
const SKIP_DIRS = new Set([
  ".git",
  ".react-router", // react-router generated types (build artifact, not source)
  ".turbo",
  "build", // vite/RR build output (same class as dist)
  "coverage",
  "dist",
  "node_modules",
]);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXEMPTIONS_PATH = join(ROOT, ".linecount-exemptions.json");
const LINE_SPLIT = /\r\n|\n|\r/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isPlainObject = (v) =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const toPosix = (p) => p.split(sep).join("/");

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      files.push(...collectSourceFiles(full));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function commentRanges(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false);
  scanner.setText(text);
  const ranges = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const isComment =
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia;
    if (isComment)
      ranges.push([scanner.getTokenStart(), scanner.getTokenEnd()]);
    token = scanner.scan();
  }
  return ranges;
}

function lineStartOffsets(text) {
  const offsets = [0];
  const re = /\r\n|\n|\r/g;
  for (let m = re.exec(text); m; m = re.exec(text))
    offsets.push(m.index + m[0].length);
  return offsets;
}

function lineAt(offsets, pos) {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// A line is comment-only when removing its comment segments leaves whitespace.
function isCommentOnly(line, segments) {
  if (segments.length === 0) return false;
  let cursor = 0;
  for (const [from, to] of segments) {
    if (line.slice(cursor, from).trim() !== "") return false;
    cursor = to;
  }
  return line.slice(cursor).trim() === "";
}

function countCodeLines(text) {
  const lines = text.split(LINE_SPLIT);
  const offsets = lineStartOffsets(text);
  const covered = lines.map(() => []);
  for (const [start, end] of commentRanges(text)) {
    const first = lineAt(offsets, start);
    const last = lineAt(offsets, end - 1);
    for (let i = first; i <= last; i++) {
      const from = i === first ? start - offsets[i] : 0;
      const to = i === last ? end - offsets[i] : lines[i].length;
      covered[i].push([from, to]);
    }
  }
  let count = 0;
  lines.forEach((line, i) => {
    if (line.trim() !== "" && !isCommentOnly(line, covered[i])) count += 1;
  });
  return count;
}

function readExemptions(errors) {
  if (!existsSync(EXEMPTIONS_PATH)) {
    errors.push(".linecount-exemptions.json is missing from the repo root");
    return {};
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(EXEMPTIONS_PATH, "utf8"));
  } catch (err) {
    errors.push(`.linecount-exemptions.json is not valid JSON: ${err.message}`);
    return {};
  }
  const shapeOk =
    isPlainObject(parsed) &&
    Object.keys(parsed).length === 1 &&
    isPlainObject(parsed.exemptions);
  if (!shapeOk) {
    errors.push(
      '.linecount-exemptions.json must be exactly {"exemptions": { "<path>": { "reason": string, "reviewDate": "YYYY-MM-DD" } }}',
    );
    return {};
  }
  return parsed.exemptions;
}

function isValidIsoDate(value) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function validateExemptions(exemptions, counts, errors, warnings) {
  const today = new Date().toISOString().slice(0, 10);
  for (const [path, entry] of Object.entries(exemptions)) {
    const label = `.linecount-exemptions.json: ${path}`;
    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").includes("..")
    ) {
      errors.push(`${label} — path must be repo-relative POSIX`);
      continue;
    }
    const shapeOk =
      isPlainObject(entry) &&
      Object.keys(entry).length === 2 &&
      "reason" in entry &&
      "reviewDate" in entry;
    if (!shapeOk) {
      errors.push(`${label} — entry must have exactly { reason, reviewDate }`);
      continue;
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      errors.push(`${label} — reason must be a non-empty string`);
    }
    if (
      typeof entry.reviewDate !== "string" ||
      !isValidIsoDate(entry.reviewDate)
    ) {
      errors.push(`${label} — reviewDate must be a real YYYY-MM-DD date`);
    } else if (entry.reviewDate < today) {
      errors.push(
        `${label} — review date ${entry.reviewDate} has passed; review the file, then renew or remove`,
      );
    }
    if (!existsSync(join(ROOT, path))) {
      errors.push(`${label} — file does not exist; remove the stale entry`);
    } else if (counts.has(path) && counts.get(path) <= MAX_LINES) {
      warnings.push(
        `${path} is exempt but counts only ${counts.get(path)} lines; remove the entry`,
      );
    }
  }
}

function main() {
  const scope = toPosix(relative(ROOT, process.cwd())) || ".";
  const errors = [];
  const warnings = [];
  const exemptions = readExemptions(errors);
  const counts = new Map();
  for (const abs of collectSourceFiles(process.cwd()).sort()) {
    const rel = toPosix(relative(ROOT, abs));
    try {
      counts.set(
        rel,
        countCodeLines(readFileSync(abs, "utf8").replace(/^\uFEFF/, "")),
      );
    } catch (err) {
      errors.push(`${rel} — unreadable: ${err.message}`);
    }
  }

  validateExemptions(exemptions, counts, errors, warnings);
  const overLimit = ([, n]) => n > MAX_LINES;
  const violations = [...counts]
    .filter(
      ([rel, n]) => overLimit([rel, n]) && !Object.hasOwn(exemptions, rel),
    )
    .sort((a, b) => b[1] - a[1]);
  const exempt = [...counts].filter(
    ([rel, n]) => overLimit([rel, n]) && Object.hasOwn(exemptions, rel),
  );

  for (const warning of warnings)
    console.warn(`line-count warning: ${warning}`);
  for (const [rel, n] of exempt)
    console.log(`line-count exempt: ${rel} (${n} lines)`);
  if (violations.length > 0) {
    console.error(
      `line-count FAIL (${scope}) — files over ${MAX_LINES} non-blank, non-comment lines; SPEC §9.2 has the split guide:`,
    );
    for (const [rel, n] of violations)
      console.error(`  ${rel}: ${n} lines (+${n - MAX_LINES})`);
  }
  for (const error of errors)
    console.error(`line-count error (${scope}): ${error}`);
  if (violations.length > 0 || errors.length > 0) process.exit(1);
  console.log(
    `line-count OK (${scope}) — ${counts.size} file(s), ${exempt.length} exempt, 0 violations`,
  );
}

try {
  main();
} catch (err) {
  console.error(`line-count: unexpected failure: ${err?.stack ?? err}`);
  process.exit(1);
}
