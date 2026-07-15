import assert from "node:assert/strict";
import { buildLearningIntegritySystem, compareOutputFiles } from "../tools/learning-integrity-lib.mjs";

const first = await buildLearningIntegritySystem();
const second = await buildLearningIntegritySystem();
assert.equal(JSON.stringify(first.artifacts), JSON.stringify(second.artifacts), "learning generation is deterministic");
assert.equal(first.validation.passed, true, "learning artifacts validate");
assert.deepEqual(first.validation.errors, [], "no validation errors");
assert.equal((await compareOutputFiles(first.artifacts)).length, 0, "generated learning outputs are current");
assert.equal(first.artifacts.catalog.commands.length, first.artifacts.integrity.canonical_command_count, "catalog count matches integrity report");
assert.equal(first.artifacts.catalog.commands.length, 163, "baseline canonical command count remains 163");
assert.equal(new Set(first.artifacts.catalog.commands.map((record) => record.canonical_command_id)).size, first.artifacts.catalog.commands.length, "each command has exactly one learning record");
assert.equal(first.artifacts.objectives.objectives.length, first.artifacts.catalog.commands.length, "each command has one stable objective");
assert.equal(first.artifacts.integrity.unresolved_duplicate_ids.length, 0, "raw duplicate IDs are resolved by migration metadata");
assert.deepEqual(first.artifacts.integrity.commands_without_verification, ["aruba_lacp_system_priority", "aruba_vlan_trunk_native", "hp_irf_member_renumber"], "known missing verification blockers stay explicit");
assert.equal(first.artifacts.coverage.review_coverage, 0, "review coverage is not fabricated");
assert.equal(first.artifacts.integrity.prerequisite_cycles.length, 0, "prerequisite graph is acyclic");
for (const record of first.artifacts.catalog.commands) {
  assert.ok(record.vendor_id, record.canonical_command_id + " has vendor");
  assert.ok(record.objective_ids.length, record.canonical_command_id + " has objective");
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

console.log(JSON.stringify({
  suite: "learning integrity",
  commands: first.artifacts.catalog.commands.length,
  objectives: first.artifacts.objectives.objectives.length,
  modules: first.artifacts.modules.modules.length,
  deterministic: true,
  passed: true
}, null, 2));
