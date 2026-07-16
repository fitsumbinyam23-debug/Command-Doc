import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCommandDoctor } from "../scripts/build.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outFlag = args.indexOf("--out-dir");
const outputDir = path.resolve(root, outFlag === -1 ? ".review-build/mission-studio" : args[outFlag + 1]);
const clientDir = path.join(outputDir, "client");
const reportPath = path.join(outputDir, "isolated-build-result.json");

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const read = (target) => fs.readFile(target);
const assert = (condition, message) => {
  if (!condition) throw new Error(`Isolated build validation failed: ${message}`);
};

const expectedCopies = [
  "lab.html",
  "mission-studio.css",
  "src/app-release-21.js",
  "src/learning-experience/mission-studio-components.js",
  "src/learning-experience/mission-studio-icons.js",
  "src/learning-experience/mission-studio-shell.js",
  "src/learning-experience/mission-studio-state.js",
  "src/learning-experience/mission-studio-views.js",
  "data/generated/command-inventory.json",
  "data/generated/route-inventory.json"
];

const result = await buildCommandDoctor({ outDir: outputDir });
const copied = [];

for (const relative of expectedCopies) {
  const source = await read(path.join(root, relative));
  const built = await read(path.join(clientDir, relative));
  const sourceHash = sha256(source);
  const builtHash = sha256(built);
  assert(sourceHash === builtHash, `${relative} does not match current source`);
  copied.push({ path: relative, sha256: builtHash, bytes: built.length });
}

const lab = await fs.readFile(path.join(clientDir, "lab.html"), "utf8");
for (const requiredReference of [
  "mission-studio.css",
  "src/learning-experience/mission-studio-components.js",
  "src/learning-experience/mission-studio-views.js"
]) {
  assert(lab.includes(requiredReference), `lab.html is missing ${requiredReference}`);
}

const report = {
  suite: "mission-studio isolated build",
  status: "passed",
  output_dir: outputDir,
  client_dir: clientDir,
  html_files: result.html_files,
  static_data_files: result.static_data_files,
  verified_source_copies: copied
};

await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
