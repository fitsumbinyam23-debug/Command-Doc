import assert from "node:assert/strict";
import {
  buildLearningIntegritySystem,
  compareOutputFileContents,
  compareOutputFiles,
  createOutputFiles,
  generatedTextMatches
} from "../tools/learning-integrity-lib.mjs";

const sorted = (values) => [...values].sort();
const total = (counts) => Object.values(counts || {}).reduce((sum, value) => sum + value, 0);

assert.equal(generatedTextMatches("alpha\nbeta\n", "alpha\nbeta\n"), true, "LF actual and LF expected match");
assert.equal(generatedTextMatches("alpha\r\nbeta\r\n", "alpha\nbeta\n"), true, "CRLF actual and LF expected match");
assert.equal(generatedTextMatches("alpha\nbeta\n", "alpha\r\nbeta\r\n"), true, "LF actual and CRLF expected match");
assert.equal(generatedTextMatches("alpha\rbeta\r", "alpha\nbeta\n"), true, "standalone CR is normalized safely");
assert.equal(generatedTextMatches("alpha\nchanged\n", "alpha\nbeta\n"), false, "real textual changes are detected");
assert.equal(generatedTextMatches("alpha\nbeta\nextra\n", "alpha\nbeta\n"), false, "added or removed lines are detected");
assert.equal(generatedTextMatches("alpha\nbeta \n", "alpha\nbeta\n"), false, "spaces within a line are not ignored");
assert.deepEqual(await compareOutputFileContents(new Map([["missing-generated.txt", "expected\n"]]), async () => {
  throw new Error("missing");
}), [{ file: "missing-generated.txt", reason: "missing" }], "missing files remain failures");

const first = await buildLearningIntegritySystem();
const second = await buildLearningIntegritySystem();
assert.equal(JSON.stringify(first.artifacts), JSON.stringify(second.artifacts), "learning generation is deterministic");
assert.equal(first.validation.passed, true, "learning artifacts validate");
assert.deepEqual(first.validation.errors, [], "no validation errors");
assert.equal((await compareOutputFiles(first.artifacts)).length, 0, "generated learning outputs are current");
const expectedOutputFiles = createOutputFiles(first.artifacts);
const crlfOutputFiles = new Map([...expectedOutputFiles].map(([relative, content]) => [relative, content.replace(/\n/g, "\r\n")]));
assert.equal((await compareOutputFileContents(expectedOutputFiles, async (relative) => crlfOutputFiles.get(relative))).length, 0, "simulated CRLF generated outputs compare current");
const [changedGeneratedFile, changedGeneratedContent] = expectedOutputFiles.entries().next().value;
const changedOutputFiles = new Map(crlfOutputFiles);
changedOutputFiles.set(changedGeneratedFile, changedGeneratedContent.replace("learning-command-catalog.v1", "learning-command-catalog.v1_changed"));
assert.deepEqual(await compareOutputFileContents(expectedOutputFiles, async (relative) => changedOutputFiles.get(relative)), [{
  file: changedGeneratedFile,
  reason: "content differs"
}], "real generated output content differences remain detectable");

const commands = first.artifacts.catalog.commands;
const objectives = first.artifacts.objectives.objectives;
const authoritativeCommandCount = first.sources.commandInventory.commands.length;
const commandIds = new Set(commands.map((record) => record.canonical_command_id));
const commandById = new Map(commands.map((record) => [record.canonical_command_id, record]));
const objectiveIds = new Set(objectives.map((objective) => objective.objective_id));
const objectiveReferences = new Map();

assert.equal(commands.length, first.artifacts.integrity.canonical_command_count, "catalog count matches integrity report");
assert.equal(commands.length, authoritativeCommandCount, "catalog count matches authoritative generated command inventory");
assert.equal(total(first.artifacts.integrity.command_count_per_vendor), authoritativeCommandCount, "vendor command totals match authoritative generated command inventory");
assert.equal(new Set(commands.map((record) => record.vendor_id + ":" + record.canonical_command_id)).size, commands.length, "each vendor-scoped canonical learning identity is unique");
assert.equal(objectiveIds.size, objectives.length, "each objective ID is unique");
assert.equal(first.artifacts.integrity.unresolved_duplicate_ids.length, 0, "raw duplicate IDs are resolved by migration metadata");
assert.equal(first.artifacts.coverage.review_coverage, 0, "review coverage is not fabricated");
assert.equal(first.artifacts.integrity.prerequisite_cycles.length, 0, "prerequisite graph is acyclic");

for (const record of commands) {
  assert.ok(record.vendor_id, record.canonical_command_id + " has vendor");
  assert.ok(record.objective_ids.length >= 1, record.canonical_command_id + " has one or more objectives");
  for (const objectiveId of record.objective_ids) {
    assert.ok(objectiveIds.has(objectiveId), record.canonical_command_id + " references an existing objective");
    objectiveReferences.set(objectiveId, (objectiveReferences.get(objectiveId) || 0) + 1);
  }
  assert.ok(record.lesson_status, record.canonical_command_id + " has lesson status");
  assert.ok(record.practice_status, record.canonical_command_id + " has practice status");
  assert.ok(record.verification_status, record.canonical_command_id + " has verification status");
  assert.ok(record.review_status, record.canonical_command_id + " has review status");
  assert.ok(record.migration_status, record.canonical_command_id + " has migration status");
  if (record.runtime_support === "explanation_only") {
    assert.ok(!record.mastery_dimensions.includes("practical_execution"), record.canonical_command_id + " does not overclaim practical mastery");
    assert.ok(!record.mastery_dimensions.includes("documentation"), record.canonical_command_id + " does not overclaim documentation mastery");
  }
  if (!record.practice_route_ids.length) assert.ok(record.blocking_reasons.includes("missing_practice_linkage"), record.canonical_command_id + " missing practice is explicit");
}

const objectivesByFamily = new Map();
for (const objective of objectives) {
  assert.ok((objective.related_command_ids || []).length >= 1, objective.objective_id + " is referenced to one or more commands");
  assert.ok(objectiveReferences.get(objective.objective_id) >= 1, objective.objective_id + " is referenced by at least one command");
  if (!objectivesByFamily.has(objective.concept_family_id)) objectivesByFamily.set(objective.concept_family_id, []);
  objectivesByFamily.get(objective.concept_family_id).push(objective);
  for (const commandId of objective.related_command_ids || []) {
    assert.ok(commandIds.has(commandId), objective.objective_id + " references an existing command");
    assert.equal(commandById.get(commandId).vendor_id, objective.vendor_scope, objective.objective_id + " keeps executable objective scope vendor-isolated");
  }
}

for (const familyObjectives of objectivesByFamily.values()) {
  const vendors = new Set(familyObjectives.map((objective) => objective.vendor_scope));
  if (vendors.size > 1) {
    assert.equal(new Set(familyObjectives.map((objective) => objective.objective_id)).size, familyObjectives.length, "cross-vendor concept families keep distinct executable objective identities");
  }
}

const missingVerificationCommands = sorted(commands
  .filter((record) => record.verification_status === "missing")
  .map((record) => record.canonical_command_id));
assert.deepEqual(first.artifacts.integrity.commands_without_verification, missingVerificationCommands, "missing verification report follows generated learning records");
assert.deepEqual(first.artifacts.migration.blocked_by_verification, sorted(commands
  .filter((record) => record.verification_status === "missing" && record.migration_status === "blocked_by_verification")
  .map((record) => record.canonical_command_id)), "blocked-by-verification report follows migration rules");
for (const commandId of first.artifacts.integrity.commands_without_verification) {
  assert.ok(commandIds.has(commandId), commandId + " listed as missing verification exists");
  assert.ok(commandById.get(commandId).blocking_reasons.includes("missing_verification"), commandId + " missing verification is explicit");
}

const missingRollbackCommands = sorted(commands
  .filter((record) => record.rollback_status === "missing")
  .map((record) => record.canonical_command_id));
assert.deepEqual(sorted(first.artifacts.integrity.commands_without_rollback_guidance.map((item) => item.command_id)), missingRollbackCommands, "missing rollback guidance report follows generated learning records");
for (const item of first.artifacts.integrity.commands_without_rollback_guidance) {
  const record = commandById.get(item.command_id);
  assert.ok(record, item.command_id + " listed as missing rollback exists");
  assert.equal(item.vendor_id, record.vendor_id, item.command_id + " rollback gap includes vendor");
  assert.equal(item.canonical_syntax, record.source_command.syntax, item.command_id + " rollback gap includes canonical syntax");
  assert.equal(item.runtime_support, record.runtime_support, item.command_id + " rollback gap includes runtime support");
  assert.equal(typeof item.changes_configuration, "boolean", item.command_id + " rollback gap includes configuration-change flag");
  assert.equal(item.lesson_status, record.lesson_status, item.command_id + " rollback gap includes lesson status");
  assert.equal(item.migration_status, record.migration_status, item.command_id + " rollback gap includes migration status");
  assert.ok(["genuinely_missing", "not_applicable", "explanation_only_but_still_recommended", "blocked_by_incomplete_source_metadata"].includes(item.rollback_classification), item.command_id + " rollback gap classification is explicit");
  if (item.rollback_classification === "genuinely_missing" && item.changes_configuration) {
    assert.ok(!["pilot_ready", "batch_ready"].includes(record.migration_status), item.command_id + " cannot be a premium-ready command without rollback guidance");
  }
}

console.log(JSON.stringify({
  suite: "learning integrity",
  commands: commands.length,
  objectives: objectives.length,
  modules: first.artifacts.modules.modules.length,
  missing_verification: missingVerificationCommands.length,
  missing_rollback_guidance: missingRollbackCommands.length,
  deterministic: true,
  passed: true
}, null, 2));
