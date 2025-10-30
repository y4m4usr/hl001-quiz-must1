#!/usr/bin/env node
/**
 * HL001 Manifest Auto Updater — v3
 *
 * - Consumes exit_report_urls.json / exit_report_suggestions.json produced by exit checks
 * - Adds only suggest.* entries that returned HTTP 2xx to manifest/manifest.json (missing fields only)
 * - Optionally replaces existing/new URLs via REBASE_FROM -> REBASE_TO
 * - Generates a Markdown diff table and appends it to the PR body
 * - Optionally commits changes, pushes a branch, and opens a PR via gh CLI
 *
 * ENV (optional):
 *   DRY_RUN=1
 *   BASE_BRANCH=main
 *   BRANCH_NAME=chore/manifest-autofill
 *   COMMIT_MSG="chore: autofill manifest from validated suggestions"
 *   PR_TITLE="[Auto] manifest autofill (200 only)"
 *   PR_BODY="(additional text to include before the diff table)"
 *   PR_REVIEWERS="user1,user2"
 *   REBASE_FROM="https://raw.githubusercontent.com/owner/repo/branch"
 *   REBASE_TO="https://cdn.jsdelivr.net/gh/owner/repo@branch"
 *   APPLY_REBASE_EXISTING=1  # also rewrite existing manifest URLs
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const DRY_RUN = process.env.DRY_RUN === "1";
const BASE_BRANCH = process.env.BASE_BRANCH || "main";
const BRANCH_NAME = process.env.BRANCH_NAME || `chore/manifest-autofill-${Date.now()}`;
const COMMIT_MSG = process.env.COMMIT_MSG || "chore: autofill manifest from validated suggestions";
const PR_TITLE = process.env.PR_TITLE || "[Auto] manifest autofill (200 only)";
const PR_BODY_PRE = process.env.PR_BODY || "";
const PR_REVIEWERS = process.env.PR_REVIEWERS || "";
const REBASE_FROM = process.env.REBASE_FROM || "";
const REBASE_TO = process.env.REBASE_TO || "";
const APPLY_REBASE_EXISTING = process.env.APPLY_REBASE_EXISTING === "1";

const manifestPath = "manifest/manifest.json";
const urlsPath = "exit_report_urls.json";
const suggPath = "exit_report_suggestions.json";

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function rebaseUrl(url) {
  if (!url || !REBASE_FROM || !REBASE_TO) return url;
  return String(url).replace(REBASE_FROM, REBASE_TO);
}

function recordChange(changes, ck, action, before, after) {
  changes.push({
    ck,
    action,
    before: before || "",
    after: after || ""
  });
}

const manifest = readJsonSafe(manifestPath, {});
const urlLogs = readJsonSafe(urlsPath, []); // { ck, type, url, http }
readJsonSafe(suggPath, []); // suggestions without HTTP codes are ignored for safety

if (!urlLogs.length) {
  console.error("No url logs found (exit_report_urls.json).");
  process.exit(1);
}

const candidates = {}; // { CK: { lens, samune } }
for (const entry of urlLogs) {
  if (!entry?.ck || !entry?.type || !entry?.url) continue;
  if (!/^suggest\.(lens|samune)$/.test(entry.type)) continue;
  const code = String(entry.http || "");
  if (!code.startsWith("2")) continue;
  const url = rebaseUrl(entry.url);
  candidates[entry.ck] = candidates[entry.ck] || {};
  if (entry.type === "suggest.lens") candidates[entry.ck].lens = url;
  if (entry.type === "suggest.samune") candidates[entry.ck].samune = url;
}

const changes = [];

if (APPLY_REBASE_EXISTING && REBASE_FROM && REBASE_TO) {
  for (const [ck, obj] of Object.entries(manifest)) {
    if (!obj) continue;
    if (obj.lens) {
      const rebased = rebaseUrl(obj.lens);
      if (rebased !== obj.lens) {
        recordChange(changes, ck, "rebase.lens", obj.lens, rebased);
        obj.lens = rebased;
      }
    }
    if (obj.samune) {
      const rebased = rebaseUrl(obj.samune);
      if (rebased !== obj.samune) {
        recordChange(changes, ck, "rebase.samune", obj.samune, rebased);
        obj.samune = rebased;
      }
    }
  }
}

let addedCount = 0;
let updatedCount = 0;

for (const [ck, obj] of Object.entries(candidates)) {
  if (!obj.lens && !obj.samune) continue;
  manifest[ck] = manifest[ck] || {};
  const beforeLens = manifest[ck].lens || "";
  const beforeSamune = manifest[ck].samune || "";

  if (obj.lens && !manifest[ck].lens) {
    manifest[ck].lens = obj.lens;
    addedCount++;
    recordChange(changes, ck, "add.lens", "", obj.lens);
  }
  if (obj.samune && !manifest[ck].samune) {
    manifest[ck].samune = obj.samune;
    addedCount++;
    recordChange(changes, ck, "add.samune", "", obj.samune);
  }

  if (beforeLens && manifest[ck].lens !== beforeLens) updatedCount++;
  if (beforeSamune && manifest[ck].samune !== beforeSamune) updatedCount++;
}

const beforeJson = readJsonSafe(manifestPath, {});
const beforeStr = JSON.stringify(beforeJson);
const afterStr = JSON.stringify(manifest, null, 2);

if (beforeStr === afterStr) {
  console.log("No manifest changes detected. Nothing to do.");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("DRY_RUN=1 — manifest changes preview:\n");
  console.log(afterStr);
  process.exit(0);
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, afterStr);
console.log(`manifest updated. added: ${addedCount} updated: ${updatedCount}`);

function buildDiffTable(rows) {
  if (!rows.length) return "_No changes collected._";
  const header = "| CK | Action | Before | After |\n|---|---|---|---|";
  const body = rows
    .map(({ ck, action, before, after }) => {
      const esc = (v) => String(v).replace(/\|/g, "\\|");
      return `| ${esc(ck)} | ${esc(action)} | ${esc(before)} | ${esc(after)} |`;
    })
    .join("\n");
  return `${header}\n${body}`;
}

const diffTable = buildDiffTable(changes);
const finalBody = `${PR_BODY_PRE ? PR_BODY_PRE + "\n\n" : ""}### Manifest Diff (auto-generated)\n${diffTable}\n`;

try {
  try {
    execSync("git config user.email", { stdio: "ignore" });
  } catch {
    execSync('git config user.email "bot@example.com"');
    execSync('git config user.name "HL001 Bot"');
  }

  execSync(`git checkout ${BASE_BRANCH}`, { stdio: "inherit" });
  execSync("git pull --ff-only", { stdio: "inherit" });
  execSync(`git checkout -b ${BRANCH_NAME}`, { stdio: "inherit" });
  execSync(`git add ${manifestPath}`, { stdio: "inherit" });
  execSync(`git commit -m "${COMMIT_MSG}"`, { stdio: "inherit" });
  execSync(`git push -u origin ${BRANCH_NAME}`, { stdio: "inherit" });

  const reviewersArg = PR_REVIEWERS ? `--reviewer ${PR_REVIEWERS}` : "";
  execSync(
    `gh pr create --base ${BASE_BRANCH} --head ${BRANCH_NAME} --title "${PR_TITLE}" --body "${finalBody.replace(/"/g, '\\"')}" ${reviewersArg}`,
    { stdio: "inherit" }
  );
  console.log("Pull Request created.");
} catch (error) {
  console.error("PR creation failed:", error?.message || error);
  process.exit(1);
}
