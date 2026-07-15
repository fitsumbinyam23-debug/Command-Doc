"use strict";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import LessonAttemptEngine from "../src/learning/lesson-attempt-engine.js";
import { ATTEMPT_STATE_SCHEMA_VERSION, deepClone } from "../src/learning/lesson-definition.js";
import { buildStage2CompatibilityAudit } from "../src/learning/catalog-compatibility-audit.js";
import { buildFixtureDefinitions, fixtureEvidenceProvider, makeTrustedEvidence } from "./fixtures/learning/lesson-fixtures.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const gitExe = process.env.GIT || "C:\\Program Files\\Git\\cmd\\git.exe";
const stage2Base = "4789ac82a6b351d51ec9be7c33c0f70e502c7724";

async function readJson(path) {
  return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
}

function deterministicClock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 6, 15, 8, 0, tick++)).toISOString();
}

function deterministicIds(prefix) {
  let next = 1;
  return () => `${prefix}-${String(next++).padStart(3, "0")}`;
}

function makeEngine(catalog, prefix = "attempt") {
  return new LessonAttemptEngine({
    catalog,
    evidenceProvider: fixtureEvidenceProvider(),
    clock: deterministicClock(),
    idGenerator: deterministicIds(prefix),
    evidenceIdGenerator: deterministicIds("evidence")
  });
}

function hasBlocker(completion, needle) {
  return completion.blockers.some((blocker) => blocker.includes(needle));
}

function commandFor(definition, commandId) {
  const target = definition.command_targets.find((candidate) => candidate.canonical_command_id === commandId) || definition.command_targets[0];
  return target;
}

function primaryCommand(fixtures, commandId) {
  const record = Object.values(fixtures.records).find((candidate) => candidate.canonical_command_id === commandId);
  return record?.source_command?.syntax || commandId.replaceAll("_", " ");
}

function passTicketPredictionCommand(engine, attempt, definition, commandText) {
  assert.equal(engine.submitTicketNote(attempt, definition, "technician_ticket", "Ticket opened by the student.").passed, true);
  assert.equal(engine.submitStudentResponse(attempt, definition, "prediction_before_output", "evidence present").passed, true);
  assert.equal(engine.submitStudentResponse(attempt, definition, "choose_next_command", commandText).passed, true);
}

function passSimulationEvidence(engine, attempt, definition) {
  assert.equal(engine.submitStudentResponse(attempt, definition, "healthy_output", { evidence_line_ids: ["healthy-line-1"] }).passed, true);
  assert.equal(engine.submitStudentResponse(attempt, definition, "evidence_identification", { evidence_line_ids: ["evidence-line-1"] }).passed, true);
}

function ingestTrusted(engine, attempt, definition, stageId, overrides = {}) {
  const result = engine.ingestTrustedExternalEvidence(attempt, definition, stageId, makeTrustedEvidence(attempt, stageId, overrides));
  assert.equal(result.accepted, true);
  return result;
}

function assertThrowsCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

function changedFromBase(paths) {
  return execFileSync(gitExe, ["diff", "--name-only", stage2Base, "--", ...paths], {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim().split(/\r?\n/).filter(Boolean);
}

const catalog = await readJson("data/generated/learning-command-catalog.json");
const readiness = await readJson("data/generated/learning-migration-readiness.json");
const traceability = await readJson("docs/LEARNING-TRACEABILITY-MATRIX.json");
const fixtures = buildFixtureDefinitions(catalog);
let checks = 0;
const check = (label, fn) => {
  fn();
  checks += 1;
  return label;
};

const engine = makeEngine(catalog);

check("1. Valid lesson definition accepted.", () => {
  const validation = engine.validateDefinition(fixtures.config);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

check("2. Invalid schema rejected.", () => {
  const invalid = deepClone(fixtures.config);
  invalid.schema_version = "lesson-definition.vNext";
  assert.equal(engine.validateDefinition(invalid).valid, false);
});

check("3. Unknown command rejected.", () => {
  const invalid = deepClone(fixtures.config);
  invalid.command_targets[0].canonical_command_id = "not_a_catalog_command";
  assert.equal(engine.validateDefinition(invalid).valid, false);
});

check("4. Vendor mismatch rejected.", () => {
  const invalid = deepClone(fixtures.config);
  invalid.command_targets[0].vendor_id = "hp_comware";
  assert.equal(engine.validateDefinition(invalid).valid, false);
});

const guidedAttempt = engine.createAttempt(fixtures.config, {
  mode: "GUIDED",
  canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id
});

check("5. Attempt identity includes lesson/vendor/command/mode/attempt.", () => {
  assert.equal(guidedAttempt.attempt_key, [
    fixtures.config.lesson_id,
    fixtures.records.ciscoConfig.vendor_id,
    fixtures.records.ciscoConfig.canonical_command_id,
    "GUIDED",
    guidedAttempt.attempt_id
  ].join(":"));
});

check("6. Opening an attempt awards no completion.", () => {
  assert.equal(guidedAttempt.status, "active");
  assert.equal(guidedAttempt.completion_result.completed, false);
});

check("7. Clicking through stages awards no completion.", () => {
  engine.markStageViewed(guidedAttempt, fixtures.config, "technician_ticket");
  assert.equal(guidedAttempt.completion_result.completed, false);
});

check("8. Required stages begin locked or available correctly.", () => {
  assert.equal(guidedAttempt.stage_states.technician_ticket.status, "in_progress");
  assert.equal(guidedAttempt.stage_states.prediction_before_output.status, "locked");
  assert.equal(guidedAttempt.stage_states.runtime_execution.status, "locked");
});

check("9. Dependencies unlock in correct order.", () => {
  assert.equal(engine.submitTicketNote(guidedAttempt, fixtures.config, "technician_ticket", "Student-submitted ticket note.").passed, true);
  assert.equal(guidedAttempt.stage_states.prediction_before_output.status, "available");
  assert.equal(guidedAttempt.stage_states.choose_next_command.status, "locked");
  assert.equal(engine.submitStudentResponse(guidedAttempt, fixtures.config, "prediction_before_output", "evidence present").passed, true);
  assert.equal(guidedAttempt.stage_states.choose_next_command.status, "available");
});

check("10. Prediction is required before assessed output.", () => {
  const fresh = makeEngine(catalog, "prediction").createAttempt(fixtures.outputSimulation, {
    mode: "GUIDED",
    canonical_command_id: fixtures.records.arubaOutput.canonical_command_id
  });
  assertThrowsCode(() => engine.revealStageContent(fresh, fixtures.outputSimulation, "healthy_output"), "stage_locked");
  engine.submitTicketNote(fresh, fixtures.outputSimulation, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(fresh, fixtures.outputSimulation, "prediction_before_output", "evidence present");
  assert.equal(engine.revealStageContent(fresh, fixtures.outputSimulation, "healthy_output").content.includes("Interface"), true);
});

check("11. Guided mode supports progressive hints.", () => {
  const result = engine.requestHint(guidedAttempt, fixtures.config, "choose_next_command");
  assert.equal(result.allowed, true);
  assert.equal(guidedAttempt.hint_history.length, 1);
});

check("12. Guided hints create relevant penalties.", () => {
  assert.ok(guidedAttempt.dimension_results.syntax.hint_penalty > 0);
  assert.ok(guidedAttempt.dimension_results.command_selection.hint_penalty > 0);
});

check("13. Assisted mode limits hints.", () => {
  const assistedEngine = makeEngine(catalog, "assisted");
  const assisted = assistedEngine.createAttempt(fixtures.config, { mode: "ASSISTED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(assistedEngine.requestHint(assisted, fixtures.config, "technician_ticket").allowed, true);
  assert.equal(assistedEngine.requestHint(assisted, fixtures.config, "technician_ticket").allowed, false);
});

check("14. Assisted solution reveal remains delayed.", () => {
  const publicView = engine.getPublicLessonView(fixtures.config, "ASSISTED");
  assert.equal(JSON.stringify(publicView).includes(primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id)), false);
});

check("15. Independent mode exposes no hints.", () => {
  const independentEngine = makeEngine(catalog, "independent");
  const independent = independentEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(independentEngine.requestHint(independent, fixtures.config, "technician_ticket").allowed, false);
});

check("16. Independent mode exposes no solution before finalization.", () => {
  const publicView = engine.getPublicLessonView(fixtures.config, "INDEPENDENT");
  assert.equal(JSON.stringify(publicView).includes(primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id)), false);
});

check("17. Guided state cannot leak into Assisted.", () => {
  const assisted = engine.createAttempt(fixtures.config, { mode: "ASSISTED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(engine.getPublicAttemptView(assisted).hint_history.length, 0);
});

check("18. Guided state cannot leak into Independent.", () => {
  const independent = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(engine.getPublicAttemptView(independent).hint_history.length, 0);
});

check("19. Assisted state cannot leak into Independent.", () => {
  const assistedEngine = makeEngine(catalog, "assist-leak");
  const assisted = assistedEngine.createAttempt(fixtures.config, { mode: "ASSISTED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assistedEngine.requestHint(assisted, fixtures.config, "technician_ticket");
  const independent = assistedEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(independent.hint_history.length, 0);
});

check("20. Another attempt's state cannot leak.", () => {
  const other = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(engine.getPublicAttemptView(other).failure_history.length, 0);
  assert.notEqual(other.attempt_id, guidedAttempt.attempt_id);
});

check("21. Another vendor's evidence is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const result = engine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", makeTrustedEvidence(attempt, "runtime_execution", { vendor_id: "hp_comware" }));
  assert.equal(result.accepted, false);
  assert.ok(result.errors.includes("mismatched_vendor_id"));
});

check("22. Another command's evidence is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const result = engine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", makeTrustedEvidence(attempt, "runtime_execution", { canonical_command_id: fixtures.records.hp.canonical_command_id }));
  assert.equal(result.accepted, false);
  assert.ok(result.errors.includes("mismatched_canonical_command_id"));
});

check("23. Plain verified=true is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const envelope = makeTrustedEvidence(attempt, "runtime_execution", { verified: true });
  envelope.verified = true;
  const result = engine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", envelope);
  assert.equal(result.accepted, false);
  assert.ok(result.errors.includes("plain_verified_flag_rejected"));
});

check("24. Untrusted runtime evidence is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const result = engine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", makeTrustedEvidence(attempt, "runtime_execution", { integrity_result: "unverified" }));
  assert.equal(result.accepted, false);
  assert.ok(result.errors.includes("unverified_external_evidence"));
});

check("25. Trusted fixture evidence is accepted only for matching identity.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  assert.equal(engine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", makeTrustedEvidence(attempt, "runtime_execution")).accepted, true);
});

check("26. Reused evidence is rejected when reuse is prohibited.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const envelope = makeTrustedEvidence(attempt, "runtime_execution", { evidence_id: `reuse-${attempt.attempt_id}` });
  assert.equal(engine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", envelope).accepted, true);
  assert.equal(engine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", envelope).accepted, false);
});

check("27. Wrong-vendor syntax records a critical failure.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  engine.submitTicketNote(attempt, fixtures.config, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(attempt, fixtures.config, "prediction_before_output", "evidence present");
  engine.submitStudentResponse(attempt, fixtures.config, "choose_next_command", "display interface brief");
  assert.equal(attempt.critical_failures.some((failure) => failure.code === "wrong_vendor_syntax"), true);
});

check("28. Unsafe command records a critical failure.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  engine.submitTicketNote(attempt, fixtures.config, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(attempt, fixtures.config, "prediction_before_output", "evidence present");
  engine.submitStudentResponse(attempt, fixtures.config, "choose_next_command", "erase startup-config");
  assert.equal(attempt.critical_failures.some((failure) => failure.code === "unsafe_command_choice"), true);
});

check("29. Configuration completion fails without verification.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.config, "runtime_execution");
  engine.submitTicketNote(attempt, fixtures.config, "ticket_note", "Configuration completed, verification pending.");
  const completion = engine.finalizeAttempt(attempt, fixtures.config);
  assert.equal(completion.completed, false);
  assert.equal(hasBlocker(completion, "verification_missing"), true);
});

check("30. Configuration completion fails without Save/rollback decision.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.config, "runtime_execution");
  ingestTrusted(engine, attempt, fixtures.config, "runtime_verification");
  engine.submitTicketNote(attempt, fixtures.config, "ticket_note", "Configuration verified by trusted evidence.");
  const completion = engine.finalizeAttempt(attempt, fixtures.config);
  assert.equal(completion.completed, false);
  assert.equal(hasBlocker(completion, "save_or_rollback_missing"), true);
});

check("31. Save-before-verification records a critical failure.", () => {
  const looseSave = deepClone(fixtures.config);
  looseSave.stages.find((stage) => stage.stage_id === "save_or_rollback").dependencies = ["choose_next_command"];
  const attempt = engine.createAttempt(looseSave, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, looseSave, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  engine.recordSaveOrRollbackDecision(attempt, looseSave, "save_or_rollback", "save");
  assert.equal(attempt.critical_failures.some((failure) => failure.code === "save_before_required_verification"), true);
});

check("32. Ticket note must be student-submitted.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.config, "runtime_execution");
  ingestTrusted(engine, attempt, fixtures.config, "runtime_verification");
  engine.recordSaveOrRollbackDecision(attempt, fixtures.config, "save_or_rollback", "rollback");
  const completion = engine.finalizeAttempt(attempt, fixtures.config);
  assert.equal(hasBlocker(completion, "ticket_note_missing"), true);
});

check("33. Verification cannot auto-credit documentation.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.config, "runtime_execution");
  ingestTrusted(engine, attempt, fixtures.config, "runtime_verification");
  assert.equal(attempt.dimension_results.documentation.score, 0);
});

check("34. Confidence cannot raise scores.", () => {
  const attempt = engine.createAttempt(fixtures.outputSimulation, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaOutput.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.outputSimulation, primaryCommand(fixtures, fixtures.records.arubaOutput.canonical_command_id));
  const before = deepClone(attempt.dimension_results);
  engine.submitConfidence(attempt, fixtures.outputSimulation, "confidence_rating", 5);
  assert.equal(attempt.dimension_results.syntax.score, before.syntax.score);
  assert.equal(attempt.dimension_results.command_selection.score, before.command_selection.score);
});

check("35. Explanation-only commands cannot receive practical mastery.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const candidates = engine.produceMasteryCandidates(attempt, fixtures.explanationOnly);
  assert.equal(candidates.practical_execution.status, "not_supported");
});

check("36. Output simulation cannot receive configuration mastery.", () => {
  const attempt = engine.createAttempt(fixtures.outputSimulation, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaOutput.canonical_command_id });
  const candidates = engine.produceMasteryCandidates(attempt, fixtures.outputSimulation);
  assert.equal(candidates.practical_execution.status, "not_supported");
});

check("37. Supported trusted evidence can produce practical candidates.", () => {
  const attempt = engine.createAttempt(fixtures.readOnlyFull, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoFullReadOnly.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.readOnlyFull, primaryCommand(fixtures, fixtures.records.ciscoFullReadOnly.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.readOnlyFull, "runtime_execution");
  const candidates = engine.produceMasteryCandidates(attempt, fixtures.readOnlyFull);
  assert.equal(candidates.practical_execution.score, 1);
});

check("38. Aliases map to the same canonical command identity.", () => {
  const alias = fixtures.records.ciscoConfig.source_command.aliases[0];
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  engine.submitTicketNote(attempt, fixtures.config, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(attempt, fixtures.config, "prediction_before_output", "evidence present");
  assert.equal(engine.submitStudentResponse(attempt, fixtures.config, "choose_next_command", alias).passed, true);
  assert.equal(attempt.canonical_command_id, fixtures.records.ciscoConfig.canonical_command_id);
});

check("39. Grouped lesson targets remain individually traceable.", () => {
  const configAttempt = engine.createAttempt(fixtures.grouped, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const showAttempt = engine.createAttempt(fixtures.grouped, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoFullReadOnly.canonical_command_id });
  assert.equal(configAttempt.lesson_id, showAttempt.lesson_id);
  assert.notEqual(configAttempt.canonical_command_id, showAttempt.canonical_command_id);
  assert.notEqual(configAttempt.attempt_key, showAttempt.attempt_key);
});

check("40. Required unsupported stage invalidates a definition.", () => {
  const invalid = deepClone(fixtures.config);
  invalid.stages.find((stage) => stage.stage_id === "runtime_execution").support_status = "unsupported";
  assert.equal(engine.validateDefinition(invalid).valid, false);
});

check("41. Optional unsupported stage records not_supported honestly.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(attempt.stage_states.optional_vendor_context.status, "not_supported");
});

check("42. Public projection hides answer keys.", () => {
  const view = engine.getPublicLessonView(fixtures.config, "GUIDED");
  assert.equal(JSON.stringify(view).includes("accepted_commands"), false);
  assert.equal(JSON.stringify(view).includes(primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id)), false);
});

check("43. Public projection hides another mode's state.", () => {
  const assisted = engine.createAttempt(fixtures.config, { mode: "ASSISTED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const view = engine.getPublicAttemptView(assisted);
  assert.equal(view.mode, "ASSISTED");
  assert.equal(JSON.stringify(view).includes("GUIDED"), false);
});

check("44. Attempt serialization and restore preserve state.", () => {
  const attempt = engine.createAttempt(fixtures.outputSimulation, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaOutput.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.outputSimulation, primaryCommand(fixtures, fixtures.records.arubaOutput.canonical_command_id));
  const restored = engine.restoreAttempt(engine.serializeAttempt(attempt));
  assert.deepEqual(restored, attempt);
});

check("45. Unsupported future attempt schema is rejected.", () => {
  assertThrowsCode(() => engine.restoreAttempt({ schema_version: "lesson-attempt-state.vNext", status: "active", mode: "GUIDED" }), "unsupported_attempt_schema");
});

check("46. Deterministic clock/ID injection works.", () => {
  const a = makeEngine(catalog, "stable").createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const b = makeEngine(catalog, "stable").createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assert.equal(a.attempt_id, b.attempt_id);
  assert.equal(a.created_at, b.created_at);
  assert.equal(a.attempt_key, b.attempt_key);
});

check("47. Completion requires all declared evidence.", () => {
  const attempt = engine.createAttempt(fixtures.readOnlyFull, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoFullReadOnly.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.readOnlyFull, primaryCommand(fixtures, fixtures.records.ciscoFullReadOnly.canonical_command_id));
  passSimulationEvidence(engine, attempt, fixtures.readOnlyFull);
  ingestTrusted(engine, attempt, fixtures.readOnlyFull, "runtime_execution");
  engine.submitTicketNote(attempt, fixtures.readOnlyFull, "ticket_note", "Trusted execution was observed.");
  const completion = engine.finalizeAttempt(attempt, fixtures.readOnlyFull);
  assert.equal(completion.completed, false);
  assert.equal(hasBlocker(completion, "verification_missing"), true);
});

check("48. Critical failure blocks completion.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  engine.submitTicketNote(attempt, fixtures.explanationOnly, "ticket_note", "Lesson ticket completed by student.");
  attempt.critical_failures.push({ code: "answer_leakage_violation", stage_id: "choose_next_command", remediation_possible: true, resolved: false, timestamp: "2026-07-15T08:00:00.000Z" });
  const completion = engine.finalizeAttempt(attempt, fixtures.explanationOnly);
  assert.equal(completion.completed, false);
  assert.equal(hasBlocker(completion, "critical_failure:answer_leakage_violation"), true);
});

const audit = buildStage2CompatibilityAudit({ catalog, migrationReadiness: readiness, traceabilityMatrix: traceability });

check("49. All current catalog commands receive compatibility rows.", () => {
  assert.equal(audit.compatibility_rows, catalog.commands.length);
  assert.equal(audit.commands_omitted.length, 0);
});

check("50. Catalog coverage is dynamically derived.", () => {
  const expanded = deepClone(catalog);
  expanded.commands.push({ ...expanded.commands[0], canonical_command_id: "fixture_future_command" });
  const expandedAudit = buildStage2CompatibilityAudit({ catalog: expanded, migrationReadiness: readiness, traceabilityMatrix: traceability });
  assert.equal(expandedAudit.compatibility_rows, catalog.commands.length + 1);
});

check("51. No migration status is upgraded by Stage 2.", () => {
  const byId = new Map(catalog.commands.map((record) => [record.canonical_command_id, record.migration_status]));
  assert.equal(audit.migration_statuses_changed.length, 0);
  assert.equal(audit.rows.every((row) => row.migration_status === byId.get(row.command_id)), true);
});

check("52. Review coverage remains unchanged.", () => {
  assert.equal(audit.review_coverage_changed, false);
});

check("53. Every current vendor is represented.", () => {
  assert.deepEqual(audit.vendors_represented, [...new Set(catalog.commands.map((record) => record.vendor_id))].sort());
});

check("54. No cross-vendor executable mapping exists.", () => {
  const attempt = engine.createAttempt(fixtures.vendorSmoke.cisco_ios, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  engine.submitTicketNote(attempt, fixtures.vendorSmoke.cisco_ios, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(attempt, fixtures.vendorSmoke.cisco_ios, "prediction_before_output", "evidence present");
  const result = engine.submitStudentResponse(attempt, fixtures.vendorSmoke.cisco_ios, "choose_next_command", "display interface brief");
  assert.equal(result.passed, false);
  assert.equal(attempt.critical_failures.some((failure) => failure.code === "wrong_vendor_syntax"), true);
});

check("All fixture vendors create valid lesson definitions.", () => {
  for (const definition of Object.values(fixtures.vendorSmoke)) {
    const validation = engine.validateDefinition(definition);
    assert.equal(validation.valid, true, `${definition.lesson_id}: ${validation.errors.join("; ")}`);
  }
});

check("Attempt schema version remains controlled.", () => {
  assert.equal(guidedAttempt.schema_version, ATTEMPT_STATE_SCHEMA_VERSION);
});

check("Direct student response cannot pass runtime_execution.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  assertThrowsCode(() => engine.submitStudentResponse(attempt, fixtures.config, "runtime_execution", { integrity_result: "passed", evidence_id: "fake-exec" }), "trusted_evidence_ingest_required");
  assert.equal(attempt.stage_states.runtime_execution.status, "available");
  assert.equal(attempt.submitted_evidence.length, 0);
  assert.equal(attempt.dimension_results.practical_execution.score, 0);
});

check("Direct student response cannot pass runtime_verification.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.config, "runtime_execution");
  assertThrowsCode(() => engine.submitStudentResponse(attempt, fixtures.config, "runtime_verification", { integrity_result: "passed", evidence_id: "fake-verification" }), "trusted_evidence_ingest_required");
  assert.equal(attempt.stage_states.runtime_verification.status, "available");
  assert.equal(attempt.dimension_results.verification.score, 0);
});

check("Complete-looking raw trusted envelope cannot pass through the student API.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  assertThrowsCode(() => engine.submitStudentResponse(attempt, fixtures.config, "runtime_execution", makeTrustedEvidence(attempt, "runtime_execution")), "trusted_evidence_ingest_required");
});

check("Only provider-validated ingestTrustedExternalEvidence can pass execution.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.config, "runtime_execution");
  assert.equal(attempt.stage_states.runtime_execution.status, "passed");
  assert.equal(attempt.dimension_results.practical_execution.score, 1);
});

check("Only provider-validated ingestTrustedExternalEvidence can pass verification.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(engine, attempt, fixtures.config, "runtime_execution");
  ingestTrusted(engine, attempt, fixtures.config, "runtime_verification");
  assert.equal(attempt.stage_states.runtime_verification.status, "passed");
  assert.equal(attempt.dimension_results.verification.score, 1);
});

check("Fake execution and verification cannot complete an Independent attempt.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  assertThrowsCode(() => engine.submitStudentResponse(attempt, fixtures.config, "runtime_execution", { integrity_result: "passed", evidence_id: "fake-exec" }), "trusted_evidence_ingest_required");
  engine.submitTicketNote(attempt, fixtures.config, "ticket_note", "Student wrote a ticket note.");
  const completion = engine.finalizeAttempt(attempt, fixtures.config);
  assert.equal(completion.completed, false);
  assert.equal(completion.eligible_for_mastery, false);
});

check("Fake evidence creates no practical or verification mastery candidate.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  assertThrowsCode(() => engine.submitStudentResponse(attempt, fixtures.config, "runtime_execution", { integrity_result: "passed", evidence_id: "fake-exec" }), "trusted_evidence_ingest_required");
  const candidates = engine.produceMasteryCandidates(attempt, fixtures.config);
  assert.equal(candidates.practical_execution.score, 0);
  assert.equal(candidates.verification.score, 0);
});

check("Locked-stage hint is rejected without history or penalty.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const beforePenalty = attempt.dimension_results.practical_execution.hint_penalty;
  const result = engine.requestHint(attempt, fixtures.config, "runtime_execution");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "hint_stage_locked");
  assert.equal(attempt.hint_history.length, 0);
  assert.equal(attempt.stage_states.runtime_execution.hint_count, 0);
  assert.equal(attempt.dimension_results.practical_execution.hint_penalty, beforePenalty);
});

check("Passed-stage hint is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  engine.submitTicketNote(attempt, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket.");
  assert.equal(engine.requestHint(attempt, fixtures.explanationOnly, "technician_ticket").reason, "hint_stage_passed");
});

check("Completed-attempt hint is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  engine.submitTicketNote(attempt, fixtures.explanationOnly, "ticket_note", "Lesson ticket completed by student.");
  assert.equal(engine.finalizeAttempt(attempt, fixtures.explanationOnly).completed, true);
  assert.equal(engine.requestHint(attempt, fixtures.explanationOnly, "choose_next_command").reason, "attempt_not_active");
});

check("Independent hint remains rejected.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const result = engine.requestHint(attempt, fixtures.config, "technician_ticket");
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "hint_not_allowed");
  assert.equal(attempt.hint_history.length, 0);
});

check("Self dependency cycle is rejected.", () => {
  const invalid = deepClone(fixtures.config);
  invalid.stages.find((stage) => stage.stage_id === "technician_ticket").dependencies = ["technician_ticket"];
  const validation = engine.validateDefinition(invalid);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.includes("technician_ticket -> technician_ticket")), true);
});

check("Two-stage dependency cycle is rejected.", () => {
  const invalid = deepClone(fixtures.config);
  invalid.stages.find((stage) => stage.stage_id === "technician_ticket").dependencies = ["prediction_before_output"];
  invalid.stages.find((stage) => stage.stage_id === "prediction_before_output").dependencies = ["technician_ticket"];
  assert.equal(engine.validateDefinition(invalid).valid, false);
});

check("Longer dependency cycle is rejected.", () => {
  const invalid = deepClone(fixtures.config);
  invalid.stages.find((stage) => stage.stage_id === "technician_ticket").dependencies = ["choose_next_command"];
  invalid.stages.find((stage) => stage.stage_id === "prediction_before_output").dependencies = ["technician_ticket"];
  invalid.stages.find((stage) => stage.stage_id === "choose_next_command").dependencies = ["prediction_before_output"];
  assert.equal(engine.validateDefinition(invalid).valid, false);
});

check("Valid branching dependency DAG is accepted.", () => {
  assert.equal(engine.validateDefinition(fixtures.config).valid, true);
});

check("Valid converging dependency DAG is accepted.", () => {
  const valid = deepClone(fixtures.config);
  valid.stages.find((stage) => stage.stage_id === "evidence_identification").dependencies = ["healthy_output", "choose_next_command"];
  const validation = engine.validateDefinition(valid);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

check("Hidden required stage without mode exception invalidates the definition.", () => {
  const invalid = deepClone(fixtures.explanationOnly);
  invalid.stages.find((stage) => stage.stage_id === "ticket_note").mode_availability = ["GUIDED"];
  const validation = engine.validateDefinition(invalid);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.includes("without mode exception")), true);
});

check("Explicit mode exception records not_applicable with a reason.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "ticket_note").mode_availability = ["GUIDED"];
  definition.command_targets[0].mode_stage_exceptions = {
    ticket_note: {
      ASSISTED: { status: "not_required", reason: "assisted mode uses short-form documentation fixture" },
      INDEPENDENT: { status: "not_required", reason: "independent mode uses external ticket review fixture" }
    }
  };
  assert.equal(engine.validateDefinition(definition).valid, true);
  const assisted = engine.createAttempt(definition, { mode: "ASSISTED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assert.equal(assisted.stage_states.ticket_note.status, "not_applicable");
  assert.equal(assisted.stage_states.ticket_note.reason, "assisted mode uses short-form documentation fixture");
});

check("Completion uses required-stage sets separately for Guided, Assisted, and Independent.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "ticket_note").mode_availability = ["GUIDED"];
  definition.command_targets[0].mode_stage_exceptions = {
    ticket_note: {
      ASSISTED: { status: "not_required", reason: "assisted mode uses short-form documentation fixture" },
      INDEPENDENT: { status: "not_required", reason: "independent mode uses external ticket review fixture" }
    }
  };
  const guided = engine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(engine, guided, definition, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  assert.equal(engine.finalizeAttempt(guided, definition).completed, false);
  const assisted = engine.createAttempt(definition, { mode: "ASSISTED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(engine, assisted, definition, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  assert.equal(engine.finalizeAttempt(assisted, definition).completed, true);
  const independent = engine.createAttempt(definition, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(engine, independent, definition, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  assert.equal(engine.finalizeAttempt(independent, definition).completed, true);
  assert.notEqual(guided.attempt_key, assisted.attempt_key);
});

check("Switching modes never reuses another mode's completed stage.", () => {
  const guided = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(engine, guided, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  engine.submitTicketNote(guided, fixtures.explanationOnly, "ticket_note", "Lesson ticket completed by student.");
  assert.equal(engine.finalizeAttempt(guided, fixtures.explanationOnly).completed, true);
  const assisted = engine.createAttempt(fixtures.explanationOnly, { mode: "ASSISTED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assert.notEqual(assisted.stage_states.choose_next_command.status, "passed");
});

check("Output simulation cannot produce verification mastery.", () => {
  const attempt = engine.createAttempt(fixtures.outputVerification, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoOutputVerification.canonical_command_id });
  const candidates = engine.produceMasteryCandidates(attempt, fixtures.outputVerification);
  assert.equal(candidates.verification.status, "not_supported");
  assert.equal(candidates.verification.score, 0);
});

check("Arbitrary critical-failure resolution is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  engine.submitTicketNote(attempt, fixtures.config, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(attempt, fixtures.config, "prediction_before_output", "evidence present");
  engine.submitStudentResponse(attempt, fixtures.config, "choose_next_command", "display interface brief");
  const result = engine.resolveCriticalFailure(attempt, "wrong_vendor_syntax", "choose_next_command");
  assert.equal(result.resolved, false);
  assert.equal(result.reason, "resolution_evidence_required");
});

check("Correct stage retry can resolve a remediable wrong-vendor failure.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  engine.submitTicketNote(attempt, fixtures.config, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(attempt, fixtures.config, "prediction_before_output", "evidence present");
  engine.submitStudentResponse(attempt, fixtures.config, "choose_next_command", "display interface brief");
  assert.equal(engine.submitStudentResponse(attempt, fixtures.config, "choose_next_command", primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id)).passed, true);
  const resolution = engine.resolveCriticalFailure(attempt, fixtures.config, "wrong_vendor_syntax", "choose_next_command", { type: "stage_retry", stage_id: "choose_next_command" });
  assert.equal(resolution.resolved, true);
  assert.equal(resolution.resolution.resolution_type, "stage_retry");
});

check("Trusted remediation evidence must match the attempt.", () => {
  const definition = deepClone(fixtures.config);
  definition.stages.find((stage) => stage.stage_id === "runtime_execution").remediates_critical_failures = ["wrong_vendor_syntax"];
  const attempt = engine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  engine.submitTicketNote(attempt, definition, "technician_ticket", "Student-submitted ticket.");
  engine.submitStudentResponse(attempt, definition, "prediction_before_output", "evidence present");
  engine.submitStudentResponse(attempt, definition, "choose_next_command", "display interface brief");
  engine.submitStudentResponse(attempt, definition, "choose_next_command", primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const otherAttempt = engine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const otherEvidenceId = makeTrustedEvidence(otherAttempt, "runtime_execution").evidence_id;
  assert.equal(engine.resolveCriticalFailure(attempt, definition, "wrong_vendor_syntax", "choose_next_command", { type: "trusted_evidence", stage_id: "runtime_execution", evidence_id: otherEvidenceId }).resolved, false);
  const evidence = makeTrustedEvidence(attempt, "runtime_execution", { evidence_id: `remediate-${attempt.attempt_id}` });
  assert.equal(engine.ingestTrustedExternalEvidence(attempt, definition, "runtime_execution", evidence).accepted, true);
  const resolution = engine.resolveCriticalFailure(attempt, definition, "wrong_vendor_syntax", "choose_next_command", { type: "trusted_evidence", stage_id: "runtime_execution", evidence_id: evidence.evidence_id });
  assert.equal(resolution.resolved, true);
  assert.deepEqual(resolution.resolution.resolution_evidence_ids, [evidence.evidence_id]);
});

check("Unresolved critical failures still block completion and resolution history appears in final result.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(engine, attempt, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  engine.submitTicketNote(attempt, fixtures.explanationOnly, "ticket_note", "Lesson ticket completed by student.");
  attempt.critical_failures.push({ code: "unsafe_command_choice", stage_id: "choose_next_command", remediation_possible: true, resolved: false, timestamp: "2026-07-15T08:00:00.000Z" });
  let completion = engine.finalizeAttempt(attempt, fixtures.explanationOnly);
  assert.equal(completion.completed, false);
  assert.equal(hasBlocker(completion, "critical_failure:unsafe_command_choice"), true);
  attempt.status = "active";
  const resolution = engine.resolveCriticalFailure(attempt, fixtures.explanationOnly, "unsafe_command_choice", "choose_next_command", { type: "stage_retry", stage_id: "choose_next_command" });
  assert.equal(resolution.resolved, true);
  completion = engine.finalizeAttempt(attempt, fixtures.explanationOnly);
  assert.equal(completion.resolution_history.length, 1);
});

check("Tampered attempt_key is rejected on restore.", () => {
  const attempt = engine.createAttempt(fixtures.outputSimulation, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaOutput.canonical_command_id });
  const serialized = deepClone(attempt);
  serialized.attempt_key = "tampered";
  assertThrowsCode(() => engine.restoreAttempt(serialized, fixtures.outputSimulation), "attempt_key_mismatch");
});

check("Inconsistent serialized completion is rejected.", () => {
  const attempt = engine.createAttempt(fixtures.outputSimulation, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaOutput.canonical_command_id });
  attempt.completion_result = { completed: true, eligible_for_mastery: true, blockers: [], finalized_at: "2026-07-15T08:00:00.000Z" };
  assertThrowsCode(() => engine.restoreAttempt(attempt, fixtures.outputSimulation), "inconsistent_serialized_completion");
});

check("Visible application hashes remain unchanged.", () => {
  assert.deepEqual(changedFromBase([
    "lab.html",
    "styles.css",
    "src/app-release-21.js",
    "sw.js"
  ]), []);
});

check("Runtime hashes remain unchanged.", () => {
  assert.deepEqual(changedFromBase([
    "src/switch-runtime.js",
    "src/lab-engine.js",
    "data/generated/command-inventory.json",
    "data/generated/route-inventory.json",
    "data/platforms/switch-profiles.json",
    "data/generated/curriculum-index.json"
  ]), []);
});

console.log(JSON.stringify({
  suite: "lesson attempt engine",
  passed: true,
  assertions: checks,
  commands: catalog.commands.length,
  compatibility_rows: audit.compatibility_rows,
  vendors: audit.vendors_represented
}, null, 2));
