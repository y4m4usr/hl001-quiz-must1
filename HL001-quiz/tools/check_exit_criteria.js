#!/usr/bin/env node
/**
 * Generic Exit Checker (config-driven)
 * - Validates CSV datasets, manifest linkage, and image availability
 * - Generates exit_report.txt / exit_report_urls.json / exit_report_suggestions.json
 *
 * Usage:
 *   node tools/check_exit_criteria.js --config config/projects/HL001.json
 *   EXIT_CONFIG=config/projects/HL001.json node tools/check_exit_criteria.js
 *
 * Config schema (JSON):
 * {
 *   "dataDir": "data",
 *   "manifestPath": "manifest/manifest.json",
 *   "ckColumns": ["E列","I列","J列","K列","X列"],
 *   "lensDir": "imagesnew1/lens/lens1",
 *   "samuneDir": "imagesnew1/samune/samune1",
 *   "manifestUrl": "",
 *   "cdn": { "from": "", "to": "" },
 *   "urlTimeoutMs": 5000
 * }
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), "config", "projects", "HL001.json");

function resolveConfigPath() {
  const args = process.argv;
  const idx = args.findIndex((arg) => arg === "--config");
  if (idx !== -1 && args[idx + 1]) {
    return path.resolve(process.cwd(), args[idx + 1]);
  }
  if (process.env.EXIT_CONFIG) {
    return path.resolve(process.cwd(), process.env.EXIT_CONFIG);
  }
  if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
    return DEFAULT_CONFIG_PATH;
  }
  return null;
}

function loadConfig() {
  const configPath = resolveConfigPath();
  if (!configPath || !fs.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.warn(`Failed to parse config at ${configPath}: ${err.message}`);
    return {};
  }
}

const config = loadConfig();

const DATA_DIR = path.resolve(config.dataDir ?? path.join(__dirname, "..", "data"));
const MANIFEST_PATH = path.resolve(config.manifestPath ?? path.join(__dirname, "..", "manifest", "manifest.json"));
const CK_COLUMNS = config.ckColumns ?? ["E列", "I列", "J列", "K列", "X列"];
const LENS_DIR = config.lensDir ?? "imagesnew1/lens/lens1";
const SAMUNE_DIR = config.samuneDir ?? "imagesnew1/samune/samune1";
const MANIFEST_URL = process.env.MANIFEST_URL ?? config.manifestUrl ?? "";
const URL_TIMEOUT_MS = Number(process.env.URL_TIMEOUT_MS ?? config.urlTimeoutMs ?? 5000);

const CDN_FROM = config.cdn?.from ?? "";
const CDN_TO = config.cdn?.to ?? "";

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`manifest not found: ${MANIFEST_PATH}`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function listCsvFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`data directory not found: ${DATA_DIR}`);
  }
  return fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".csv"));
}

function deriveCdnBase(manifestUrl) {
  return manifestUrl.replace(/\/manifest\/manifest\.json$/, "");
}

async function http200(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    return url === "(empty)" ? "-" : "N/A";
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal: controller.signal
    });
    clearTimeout(timer);
    return res.status;
  } catch (err) {
    return `ERR:${err?.name || "fetch_error"}`;
  }
}

function summarizeExit(exit) {
  return `EXIT-CRITERIA:
schema${exit.schema}
ck${exit.ck}
images${exit.img}
manifest${exit.manifest}
missing${exit.missing}
exclude${exit.exclude}
`;
}

function rebaseUrl(url) {
  if (!url || !CDN_FROM || !CDN_TO) return url;
  return String(url).replace(CDN_FROM, CDN_TO);
}

async function main() {
  const manifest = readManifest();
  const csvFiles = listCsvFiles();

  const exit = {
    schema: "✅",
    ck: "✅",
    img: "✅",
    manifest: "✅",
    missing: "✅",
    exclude: "⚠️"
  };

  const urlLogs = [];
  const suggestions = [];

  const cdnBase = MANIFEST_URL ? deriveCdnBase(MANIFEST_URL) : "";

  for (const file of csvFiles) {
    const fullPath = path.join(DATA_DIR, file);
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) continue;

    const header = lines[0].split(",");
    if (!CK_COLUMNS.every((col) => header.includes(col))) {
      exit.schema = "⚠️";
      continue;
    }

    const idxMap = new Map();
    CK_COLUMNS.forEach((col) => idxMap.set(col, header.indexOf(col)));

    const requiredCols = CK_COLUMNS.slice(0, 4); // CK (E/I/J/K) assumed first entries
    const valueIndexes = requiredCols.map((col) => idxMap.get(col));
    const imageIndex = idxMap.get(CK_COLUMNS[4]);

    const ckSet = new Set();

    for (const line of lines.slice(1)) {
      const row = line.split(",");
      const ckValues = valueIndexes.map((idx) => row[idx]);

      if (ckValues.some((v) => !v)) {
        exit.missing = "⚠️";
      }

      const ck = ckValues.join("_");
      if (ckSet.has(ck)) {
        exit.ck = "⚠️";
      } else {
        ckSet.add(ck);
      }

      const x = row[imageIndex];
      const manifestEntry = manifest[ck];

      if (!manifestEntry) {
        exit.manifest = "⚠️";
        if (cdnBase) {
          suggestions.push({
            ck,
            lensUrl: `${cdnBase}/${LENS_DIR}/${ck}_lens.jpg`,
            samuneUrl: `${cdnBase}/${SAMUNE_DIR}/${ck}_samune.jpg`
          });
        }
      } else {
        if (manifestEntry.lens) {
          urlLogs.push({ ck, type: "manifest.lens", url: rebaseUrl(manifestEntry.lens) });
        }
        if (manifestEntry.samune) {
          urlLogs.push({ ck, type: "manifest.samune", url: rebaseUrl(manifestEntry.samune) });
        }
      }

      if (x) {
        urlLogs.push({ ck, type: CK_COLUMNS[4], url: x });
      } else {
        exit.img = "⚠️";
        urlLogs.push({ ck, type: CK_COLUMNS[4], url: "(empty)" });
      }
    }
  }

  const urlChecks = await Promise.all(urlLogs.map((item) => http200(item.url)));
  urlChecks.forEach((code, i) => {
    urlLogs[i].http = code;
    if (String(code).startsWith("4") || String(code).startsWith("5") || String(code).startsWith("ERR")) {
      exit.img = "⚠️";
    }
  });

  if (suggestions.length && MANIFEST_URL) {
    const more = [];
    suggestions.forEach((s) => {
      more.push({ ck: s.ck, type: "suggest.lens", url: s.lensUrl });
      more.push({ ck: s.ck, type: "suggest.samune", url: s.samuneUrl });
    });
    const codes = await Promise.all(more.map((item) => http200(item.url)));
    codes.forEach((code, i) => (more[i].http = code));
    urlLogs.push(...more);
  }

  const report = summarizeExit(exit);
  console.log(report);

  fs.writeFileSync("exit_report.txt", report);
  fs.writeFileSync("exit_report_urls.json", JSON.stringify(urlLogs, null, 2));
  fs.writeFileSync("exit_report_suggestions.json", JSON.stringify(suggestions, null, 2));

  const failed = Object.values(exit).includes("⚠️");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("Exit checker failed:", err);
  process.exit(1);
});
