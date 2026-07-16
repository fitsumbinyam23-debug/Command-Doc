import crypto from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseCommit = process.env.PROTECTED_BASE_COMMIT || "824de78e821b461b9ce7116603ba4c4547736fd7";
const gitExecutable = process.env.GIT || "git";
const normalizationPolicy = "raw-byte-sha256";
const protectedFiles = [
  "src/switch-runtime.js",
  "src/lab-engine.js",
  "sw.js",
  "data/generated/command-inventory.json",
  "data/generated/route-inventory.json",
  "data/platforms/switch-profiles.json",
  "data/curriculum/curriculum-command-placement.json"
];

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function gitShow(revision, file) {
  try {
    const { stdout } = await execFileAsync(gitExecutable, ["show", `${revision}:${file}`], {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 50 * 1024 * 1024
    });
    return stdout;
  } catch (error) {
    throw new Error(`Git is required for protected hash reporting. Tried ${gitExecutable}. ${error.message}`);
  }
}

const records = [];
for (const file of protectedFiles) {
  const baseBytes = await gitShow(baseCommit, file);
  const candidateBytes = await gitShow("HEAD", file);
  const baseHash = sha256(baseBytes);
  const candidateHash = sha256(candidateBytes);
  records.push({
    path: file,
    base_commit: baseCommit,
    candidate_revision: "HEAD",
    base_sha256: baseHash,
    candidate_sha256: candidateHash,
    match: baseHash === candidateHash,
    normalization_policy: normalizationPolicy
  });
}

const report = {
  status: records.every((record) => record.match) ? "passed" : "failed",
  normalization_policy: normalizationPolicy,
  git_executable: gitExecutable,
  base_commit: baseCommit,
  records
};

console.log(JSON.stringify(report, null, 2));
if (report.status !== "passed") process.exit(1);
