#!/usr/bin/env node
/**
 * Repo-wide URL Rebase
 * Replaces occurrences of REBASE_FROM with REBASE_TO across specified file extensions.
 *
 * ENV:
 *   REBASE_FROM (required)
 *   REBASE_TO   (required)
 *   DRY_RUN=1           # only report changes
 *   GLOBS=".md,.js,..." # target extensions
 *   EXCLUDES="node_modules,.git,dist,build"
 */
import fs from "fs";
import path from "path";

const FROM = process.env.REBASE_FROM;
const TO = process.env.REBASE_TO;
const DRY = process.env.DRY_RUN === "1";
const GLOBS = (process.env.GLOBS || ".md,.js,.ts,.json,.csv,.gs,.html,.css").split(",");
const EXCLUDES = (process.env.EXCLUDES || "node_modules,.git,dist,build").split(",");

if (!FROM || !TO) {
  console.error("REBASE_FROM and REBASE_TO must be set.");
  process.exit(1);
}

const changed = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    if (EXCLUDES.includes(entry)) continue;
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else {
      const ext = path.extname(entry);
      if (!GLOBS.includes(ext)) continue;
      const content = fs.readFileSync(p, "utf8");
      if (!content.includes(FROM)) continue;
      const updated = content.split(FROM).join(TO);
      if (!DRY) fs.writeFileSync(p, updated);
      changed.push(p);
    }
  }
}

walk(process.cwd());
console.log(`Rebased ${changed.length} files.`);
if (changed.length) {
  console.log(changed.join("\n"));
}
