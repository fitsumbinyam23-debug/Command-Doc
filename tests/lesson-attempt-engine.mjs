"use strict";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import LessonAttemptEngine from "../src/learning/lesson-attempt-engine.js";
import { ATTEMPT_STATE_SCHEMA_VERSION, LEARNING_MODES, deepClone } from "../src/learning/lesson-definition.js";
import { buildStage2CompatibilityAudit } from "../src/learning/catalog-compatibility-audit.js";
import { buildFixtureDefinitions, fixtureEvidenceProvider, makeTrustedEvidence } from "./fixtures/learning/lesson-fixtures.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const gitExe = process.env.GIT || "git";
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

function makeEngine(catalog, prefix = "attempt", overrides = {}) {
  return new LessonAttemptEngine({
    catalog,
    evidenceProvider: fixtureEvidenceProvider(),
    clock: deterministicClock(),
    idGenerator: deterministicIds(prefix),
    evidenceIdGenerator: deterministicIds("evidence"),
    ...overrides
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

function assertSubmissionPassed(engine, attempt, definition, stageId, submit) {
  const result = submit();
  if (attempt.mode === "INDEPENDENT" && attempt.status === "active") {
    assert.equal(result.recorded, true);
    assert.equal(result.feedback_deferred, true);
    assert.equal("passed" in result, false);
    assert.equal("feedback_code" in result, false);
    assert.equal(attempt.stage_states[stageId].status, "passed");
  } else {
    assert.equal(result.passed, true);
  }
  return result;
}

function passTicketPredictionCommand(engine, attempt, definition, commandText) {
  assertSubmissionPassed(engine, attempt, definition, "technician_ticket", () => engine.submitTicketNote(attempt, definition, "technician_ticket", "Ticket opened by the student."));
  assertSubmissionPassed(engine, attempt, definition, "prediction_before_output", () => engine.submitStudentResponse(attempt, definition, "prediction_before_output", "evidence present"));
  assertSubmissionPassed(engine, attempt, definition, "choose_next_command", () => engine.submitStudentResponse(attempt, definition, "choose_next_command", commandText));
}

function passSimulationEvidence(engine, attempt, definition) {
  assertSubmissionPassed(engine, attempt, definition, "healthy_output", () => engine.submitStudentResponse(attempt, definition, "healthy_output", { evidence_line_ids: ["healthy-line-1"] }));
  assertSubmissionPassed(engine, attempt, definition, "evidence_identification", () => engine.submitStudentResponse(attempt, definition, "evidence_identification", { evidence_line_ids: ["evidence-line-1"] }));
}

function ingestTrusted(engine, attempt, definition, stageId, overrides = {}) {
  const result = engine.ingestTrustedExternalEvidence(attempt, definition, stageId, makeTrustedEvidence(attempt, stageId, overrides));
  assert.equal(result.accepted, true);
  return result;
}

function trustedEvent(attempt, stageId) {
  return attempt.event_journal.find((event) => event.event_type === "trusted_evidence_ingested" && event.stage_id === stageId);
}

function resequenceEvents(attempt) {
  attempt.event_journal = attempt.event_journal.map((event, index) => ({ ...event, sequence: index + 1 }));
}

function normalizeEventTimestamps(attempt, start = Date.UTC(2026, 6, 15, 9, 0, 0)) {
  attempt.event_journal = attempt.event_journal.map((event, index) => ({
    ...event,
    timestamp: new Date(start + index * 1000).toISOString()
  }));
}

function moveTrustedEventBefore(attempt, movedStageId, beforeStageId) {
  const movedIndex = attempt.event_journal.findIndex((event) => event.event_type === "trusted_evidence_ingested" && event.stage_id === movedStageId);
  const beforeIndex = attempt.event_journal.findIndex((event) => event.event_type === "trusted_evidence_ingested" && event.stage_id === beforeStageId);
  const [event] = attempt.event_journal.splice(movedIndex, 1);
  attempt.event_journal.splice(beforeIndex, 0, event);
  resequenceEvents(attempt);
  normalizeEventTimestamps(attempt);
}

function cloneAttemptWithFreshIdentity(attempt, nextAttempt, overrides = {}) {
  const cloned = deepClone(attempt);
  cloned.attempt_id = overrides.attempt_id || nextAttempt.attempt_id;
  cloned.attempt_key = [
    cloned.lesson_id,
    cloned.vendor_id,
    cloned.canonical_command_id,
    cloned.mode,
    cloned.attempt_id
  ].join(":");
  for (const event of cloned.event_journal) {
    event.attempt_id = cloned.attempt_id;
    event.event_id = `${cloned.attempt_id}-replay-${String(event.sequence).padStart(4, "0")}`;
    if (event.evidence_envelope) {
      event.evidence_envelope.attempt_id = cloned.attempt_id;
      if (overrides.evidence_id) event.evidence_envelope.evidence_id = overrides.evidence_id;
      if (overrides.source_event_id) event.evidence_envelope.source_event_id = overrides.source_event_id;
      if (overrides.verification_record_id) event.evidence_envelope.verification_record_id = overrides.verification_record_id;
    }
    if (event.provider_receipt && overrides.evidence_id) event.provider_receipt.evidence_id = overrides.evidence_id;
  }
  return cloned;
}

function completeExplanationAttempt(engine, attempt, definition, commandText) {
  passTicketPredictionCommand(engine, attempt, definition, commandText);
  assertSubmissionPassed(engine, attempt, definition, "ticket_note", () => engine.submitTicketNote(attempt, definition, "ticket_note", "Lesson ticket completed by student."));
  return engine.finalizeAttempt(attempt, definition);
}

function completeConfigAttempt(engine, attempt, definition, commandText) {
  passTicketPredictionCommand(engine, attempt, definition, commandText);
  ingestTrusted(engine, attempt, definition, "runtime_execution");
  ingestTrusted(engine, attempt, definition, "runtime_verification");
  assertSubmissionPassed(engine, attempt, definition, "save_or_rollback", () => engine.recordSaveOrRollbackDecision(attempt, definition, "save_or_rollback", "rollback"));
  assertSubmissionPassed(engine, attempt, definition, "ticket_note", () => engine.submitTicketNote(attempt, definition, "ticket_note", "Trusted execution and verification were recorded."));
  return engine.finalizeAttempt(attempt, definition);
}

function publicStage(view, stageId) {
  return view.stages.find((stage) => stage.stage_id === stageId);
}

function assertThrowsCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

function runGit(args) {
  try {
    return execFileSync(gitExe, args, {
      cwd: repoRoot,
      encoding: "utf8"
    });
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : "";
    const suffix = stderr ? ` ${stderr}` : "";
    throw new Error(`Git scope assertion failed using ${gitExe}. Set GIT=/path/to/git or ensure git is on PATH.${suffix}`);
  }
}

function changedFromBase(paths) {
  return runGit(["diff", "--name-only", stage2Base, "--", ...paths]).trim().split(/\r?\n/).filter(Boolean);
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
  const transportOnly = engine.restoreAttempt(engine.serializeAttempt(attempt));
  assert.equal(transportOnly.validation_state, "unvalidated_transport_only");
  assertThrowsCode(() => engine.finalizeAttempt(transportOnly, fixtures.outputSimulation), "attempt_not_validated");
  const restored = engine.restoreAttempt(engine.serializeAttempt(attempt), fixtures.outputSimulation);
  assert.equal(restored.validation_state, "validated");
  assert.deepEqual(restored.stage_states, attempt.stage_states);
  assert.deepEqual(restored.dimension_results, attempt.dimension_results);
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
  assert.equal(completion.eligible_for_limited_credit, false);
  assert.equal(completion.eligible_for_full_mastery, false);
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

check("Inconsistent serialized completion is replaced by event replay.", () => {
  const attempt = engine.createAttempt(fixtures.outputSimulation, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaOutput.canonical_command_id });
  attempt.completion_result = { completed: true, eligible_for_limited_credit: true, eligible_for_full_mastery: true, blockers: [], finalized_at: "2026-07-15T08:00:00.000Z" };
  const restored = engine.restoreAttempt(attempt, fixtures.outputSimulation);
  assert.equal(restored.completion_result.completed, false);
  assert.equal(restored.restore_diagnostics.snapshot_mismatch, true);
});

check("Independent public view rejects assessed before-finalization answer leakage.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  const commandText = primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id);
  const attempt = engine.createAttempt(definition, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const view = engine.getPublicLessonView(definition, "INDEPENDENT", { attempt, canonical_command_id: attempt.canonical_command_id });
  const chooseStage = publicStage(view, "choose_next_command");
  assert.equal(chooseStage.answer_visible, false);
  assert.equal(JSON.stringify(view).includes(commandText), false);
  assert.equal(JSON.stringify(view).includes("accepted_commands"), false);
});

check("Hostile before_submission answer policy is rejected and redacted.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "choose_next_command").answer_visibility_policy = "before_submission";
  const commandText = primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id);
  const validation = engine.validateDefinition(definition);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.includes("answer_visibility_policy")), true);
  const view = engine.getPublicLessonView(definition, "INDEPENDENT", { canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assert.equal(JSON.stringify(view).includes(commandText), false);
});

check("Assisted public view respects delayed solution reveal.", () => {
  const assistedEngine = makeEngine(catalog, "assist-redact");
  const attempt = assistedEngine.createAttempt(fixtures.explanationOnly, { mode: "ASSISTED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const commandText = primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id);
  assert.equal(assistedEngine.submitTicketNote(attempt, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket.").passed, true);
  assert.equal(assistedEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "prediction_before_output", "evidence present").passed, true);
  const reveal = assistedEngine.revealStageContent(attempt, fixtures.explanationOnly, "choose_next_command");
  assert.equal(reveal.answer_visible, false);
  assert.equal(JSON.stringify(reveal).includes(commandText), false);
});

check("Guided demonstration remains visible without leaking assessed answers.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.unshift({
    ...deepClone(definition.stages.find((stage) => stage.stage_id === "choose_next_command")),
    stage_id: "guided_worked_example",
    stage_type: "worked_example",
    requirement_status: "optional",
    dependencies: [],
    mode_availability: ["GUIDED"],
    eligible_dimensions: [],
    evidence_source: "lesson_content",
    evaluator: { type: "non_empty_text" },
    pass_criteria: { min_length: 1 },
    content_role: "demonstration",
    answer_visibility_policy: "demonstration_only",
    public_answer: "demo-only-safe-example",
    worked_example: "demo-only-safe-example"
  });
  const view = engine.getPublicLessonView(definition, "GUIDED", { canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assert.equal(publicStage(view, "guided_worked_example").answer, "demo-only-safe-example");
  assert.equal(publicStage(view, "choose_next_command").answer_visible, false);
});

check("Review projection reveals only explicitly permitted completion answers.", () => {
  const reviewEngine = makeEngine(catalog, "review-redact");
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "choose_next_command").answer_visibility_policy = "after_finalization";
  const attempt = reviewEngine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const commandText = primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id);
  assert.equal(completeExplanationAttempt(reviewEngine, attempt, definition, commandText).completed, true);
  const review = reviewEngine.getReviewProjection(attempt, definition);
  assert.equal(review.available, true);
  assert.equal(publicStage(review.lesson, "choose_next_command").answer, commandText);
  assert.equal(publicStage(review.lesson, "ticket_note").answer_visible, false);
});

check("Empty mode_availability has consistent all-mode semantics.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "technician_ticket").mode_availability = [];
  for (const mode of LEARNING_MODES) {
    const modeEngine = makeEngine(catalog, `empty-mode-${mode.toLowerCase()}`);
    const attempt = modeEngine.createAttempt(definition, { mode, canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
    const view = modeEngine.getPublicLessonView(definition, mode, { attempt, canonical_command_id: attempt.canonical_command_id });
    const publicApplicable = view.stages.filter((stage) => stage.applicable).map((stage) => stage.stage_id).sort();
    const stateApplicable = Object.values(attempt.stage_states).filter((state) => state.status !== "not_applicable").map((state) => state.stage_id).sort();
    assert.deepEqual(publicApplicable, stateApplicable);
    assert.equal(publicStage(view, "technician_ticket").applicable, true);
  }
});

check("Mode-exempt prediction does not leave prediction_missing.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "prediction_before_output").mode_availability = ["GUIDED"];
  definition.command_targets[0].mode_stage_exceptions = {
    prediction_before_output: {
      ASSISTED: { status: "not_required", reason: "assisted mode uses direct command selection in this fixture" },
      INDEPENDENT: { status: "not_required", reason: "independent mode defers prediction to external review in this fixture" }
    }
  };
  const commandText = primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id);

  const guidedEngine = makeEngine(catalog, "prediction-guided");
  const guided = guidedEngine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assert.equal(guided.prediction_gate.required, true);
  assert.equal(completeExplanationAttempt(guidedEngine, guided, definition, commandText).completed, true);

  for (const mode of ["ASSISTED", "INDEPENDENT"]) {
    const modeEngine = makeEngine(catalog, `prediction-${mode.toLowerCase()}`);
    const attempt = modeEngine.createAttempt(definition, { mode, canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
    assert.equal(attempt.prediction_gate.required, false);
    assert.equal(attempt.stage_states.prediction_before_output.status, "not_applicable");
    assertSubmissionPassed(modeEngine, attempt, definition, "technician_ticket", () => modeEngine.submitTicketNote(attempt, definition, "technician_ticket", "Student-submitted ticket."));
    assertSubmissionPassed(modeEngine, attempt, definition, "choose_next_command", () => modeEngine.submitStudentResponse(attempt, definition, "choose_next_command", commandText));
    assertSubmissionPassed(modeEngine, attempt, definition, "ticket_note", () => modeEngine.submitTicketNote(attempt, definition, "ticket_note", "Lesson ticket completed by student."));
    const completion = modeEngine.finalizeAttempt(attempt, definition);
    assert.equal(completion.completed, true);
    assert.equal(hasBlocker(completion, "prediction_missing"), false);
  }
});

check("Required prediction still blocks assessed output.", () => {
  const definition = deepClone(fixtures.outputSimulation);
  definition.stages.find((stage) => stage.stage_id === "healthy_output").dependencies = ["technician_ticket"];
  const predictionEngine = makeEngine(catalog, "prediction-required");
  const attempt = predictionEngine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaOutput.canonical_command_id });
  assert.equal(attempt.prediction_gate.required, true);
  assert.equal(predictionEngine.submitTicketNote(attempt, definition, "technician_ticket", "Student-submitted ticket.").passed, true);
  assert.equal(attempt.stage_states.healthy_output.status, "available");
  assertThrowsCode(() => predictionEngine.revealStageContent(attempt, definition, "healthy_output"), "prediction_required_before_assessed_output");
});

check("Forged passed stage states cannot restore as complete.", () => {
  const forged = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  for (const stageId of fixtures.explanationOnly.command_targets[0].required_stage_ids) {
    forged.stage_states[stageId].status = "passed";
    forged.stage_states[stageId].passed_at = forged.updated_at;
  }
  forged.status = "completed";
  forged.completion_result = { completed: true, eligible_for_limited_credit: true, eligible_for_full_mastery: true, blockers: [], finalized_at: forged.updated_at };
  const restored = engine.restoreAttempt(forged, fixtures.explanationOnly);
  assert.equal(restored.completion_result.completed, false);
  assert.equal(restored.stage_states.choose_next_command.status, "locked");
  assert.equal(restored.restore_diagnostics.snapshot_mismatch, true);
});

check("Forged dimension scores are discarded on restore.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  attempt.dimension_results.concept.score = 1;
  attempt.dimension_results.syntax.score = 1;
  attempt.dimension_results.command_selection.score = 1;
  attempt.completion_result = engine.evaluateCompletion(attempt, fixtures.explanationOnly);
  const restored = engine.restoreAttempt(attempt, fixtures.explanationOnly);
  assert.equal(restored.dimension_results.concept.score, 0);
  assert.equal(restored.dimension_results.syntax.score, 0);
  assert.equal(restored.dimension_results.command_selection.score, 0);
  assert.equal(restored.completion_result.completed, false);
});

check("Trusted passed stage without evidence event creates no credit.", () => {
  const attempt = engine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const state = attempt.stage_states.runtime_execution;
  state.status = "passed";
  state.response_kind = "trusted_evidence";
  state.submitted_at = attempt.updated_at;
  state.passed_at = attempt.updated_at;
  state.last_result = { passed: true, score: 1, feedback_code: "trusted_evidence_passed", evidence_ids: ["missing-evidence"], retry_allowed: false };
  const restored = engine.restoreAttempt(attempt, fixtures.config);
  assert.equal(restored.stage_states.runtime_execution.status, "locked");
  assert.equal(restored.dimension_results.practical_execution.score, 0);
});

check("Duplicate materialized evidence IDs are ignored by replay.", () => {
  const duplicateEngine = makeEngine(catalog, "duplicate-evidence");
  const attempt = duplicateEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(duplicateEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(duplicateEngine, attempt, fixtures.config, "runtime_execution");
  attempt.submitted_evidence.push(deepClone(attempt.submitted_evidence[0]));
  const restored = duplicateEngine.restoreAttempt(attempt, fixtures.config);
  assert.equal(restored.submitted_evidence.length, 1);
});

check("Legitimate completed attempt round-trips successfully.", () => {
  const roundtripEngine = makeEngine(catalog, "roundtrip");
  const attempt = roundtripEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const commandText = primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id);
  const completion = completeConfigAttempt(roundtripEngine, attempt, fixtures.config, commandText);
  assert.equal(completion.completed, true);
  const restored = roundtripEngine.restoreAttempt(roundtripEngine.serializeAttempt(attempt), fixtures.config);
  assert.equal(restored.completion_result.completed, true);
  assert.equal(restored.completion_result.eligible_for_full_mastery, true);
  assert.deepEqual(restored.dimension_results, attempt.dimension_results);
});

check("Restored mastery candidates are reconstructed.", () => {
  const restoreEngine = makeEngine(catalog, "restore-candidates");
  const attempt = restoreEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const commandText = primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id);
  completeConfigAttempt(restoreEngine, attempt, fixtures.config, commandText);
  attempt.dimension_results.syntax.score = 0;
  const restored = restoreEngine.restoreAttempt(attempt, fixtures.config);
  assert.equal(restored.dimension_results.syntax.score, 1);
  assert.equal(restored.completion_result.mastery_candidates.syntax.score, 1);
});

check("Guided completion is not full-mastery eligible.", () => {
  const guidedEngine = makeEngine(catalog, "guided-mastery");
  const attempt = guidedEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const completion = completeExplanationAttempt(guidedEngine, attempt, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  assert.equal(completion.completed, true);
  assert.equal(completion.eligible_for_limited_credit, true);
  assert.equal(completion.eligible_for_full_mastery, false);
});

check("Assisted completion is not full-mastery eligible.", () => {
  const assistedEngine = makeEngine(catalog, "assisted-mastery");
  const attempt = assistedEngine.createAttempt(fixtures.explanationOnly, { mode: "ASSISTED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const completion = completeExplanationAttempt(assistedEngine, attempt, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  assert.equal(completion.completed, true);
  assert.equal(completion.eligible_for_limited_credit, true);
  assert.equal(completion.eligible_for_full_mastery, false);
});

check("Independent completion is full-mastery eligible only when qualified.", () => {
  const independentEngine = makeEngine(catalog, "independent-mastery");
  const attempt = independentEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const completion = completeConfigAttempt(independentEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  assert.equal(completion.completed, true);
  assert.equal(completion.eligible_for_limited_credit, true);
  assert.equal(completion.eligible_for_full_mastery, true);
});

check("Inactive and unavailable stages cannot be viewed or revealed.", () => {
  const inactive = engine.createAttempt(fixtures.config, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  assert.equal(engine.finalizeAttempt(inactive, fixtures.config).completed, false);
  assertThrowsCode(() => engine.markStageViewed(inactive, fixtures.config, "runtime_execution"), "attempt_not_active");
  assertThrowsCode(() => engine.revealStageContent(inactive, fixtures.config, "runtime_execution"), "attempt_not_active");

  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "ticket_note").mode_availability = ["GUIDED"];
  definition.command_targets[0].mode_stage_exceptions = {
    ticket_note: {
      ASSISTED: { status: "not_required", reason: "assisted mode uses short-form documentation fixture" },
      INDEPENDENT: { status: "not_required", reason: "independent mode uses external ticket review fixture" }
    }
  };
  const active = engine.createAttempt(definition, { mode: "ASSISTED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assertThrowsCode(() => engine.markStageViewed(active, definition, "ticket_note"), "stage_not_applicable");
  assertThrowsCode(() => engine.revealStageContent(active, definition, "ticket_note"), "stage_not_applicable");
  assertThrowsCode(() => engine.markStageViewed(active, definition, "optional_vendor_context"), "stage_not_supported");
  assertThrowsCode(() => engine.revealStageContent(active, definition, "prediction_before_output"), "stage_locked");
});

check("Portable Git resolution works without a Windows-specific default.", () => {
  assert.equal(gitExe, process.env.GIT || "git");
  assert.equal(runGit(["rev-parse", "--is-inside-work-tree"]).trim(), "true");
});

check("Event IDs and sequences are validated.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const duplicateId = deepClone(attempt);
  duplicateId.event_journal[0].event_id = "duplicate-event";
  duplicateId.event_journal.push({ ...deepClone(duplicateId.event_journal[0]), sequence: 2 });
  assertThrowsCode(() => engine.restoreAttempt(duplicateId, fixtures.explanationOnly), "duplicate_event_id");
  const brokenSequence = deepClone(attempt);
  brokenSequence.event_journal[0].sequence = 2;
  assertThrowsCode(() => engine.restoreAttempt(brokenSequence, fixtures.explanationOnly), "non_contiguous_event_sequence");
});

check("Non-monotonic event timestamps are rejected.", () => {
  const timestampEngine = makeEngine(catalog, "timestamp-events");
  const attempt = timestampEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  timestampEngine.submitTicketNote(attempt, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket.");
  attempt.event_journal[1].timestamp = "2026-07-15T07:59:59.000Z";
  assertThrowsCode(() => timestampEngine.restoreAttempt(attempt, fixtures.explanationOnly), "non_monotonic_event_timestamp");
});

check("Event identity mismatch and unknown event type are rejected.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const mismatched = deepClone(attempt);
  mismatched.event_journal[0].vendor_id = "hp_comware";
  assertThrowsCode(() => engine.restoreAttempt(mismatched, fixtures.explanationOnly), "event_identity_mismatch");
  const unknown = deepClone(attempt);
  unknown.event_journal[0].event_type = "free_form_event";
  assertThrowsCode(() => engine.restoreAttempt(unknown, fixtures.explanationOnly), "unknown_attempt_event_type");
});

check("Student response is re-evaluated during replay.", () => {
  const replayEngine = makeEngine(catalog, "student-replay");
  const attempt = replayEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  const commandText = primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id);
  passTicketPredictionCommand(replayEngine, attempt, fixtures.explanationOnly, commandText);
  const commandEvent = attempt.event_journal.find((event) => event.stage_id === "choose_next_command");
  commandEvent.response = "not the command";
  commandEvent.evaluator_result = { passed: true, score: 1, feedback_code: "passed", dimensions: ["syntax", "command_selection"] };
  const restored = replayEngine.restoreAttempt(attempt, fixtures.explanationOnly);
  assert.equal(restored.stage_states.choose_next_command.status, "failed");
  assert.equal(restored.stage_states.choose_next_command.last_result.feedback_code, "command_mismatch");
  assert.equal(restored.dimension_results.syntax.score, 0);
});

check("Synthetic passing last_result cannot create credit.", () => {
  const attempt = engine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  attempt.stage_states.choose_next_command.status = "passed";
  attempt.stage_states.choose_next_command.last_result = { passed: true, score: 1, feedback_code: "passed", evidence_ids: [] };
  const restored = engine.restoreAttempt(attempt, fixtures.explanationOnly);
  assert.equal(restored.stage_states.choose_next_command.status, "locked");
  assert.equal(restored.dimension_results.syntax.score, 0);
});

check("Wrong and correct replayed commands produce deterministic replay outcomes.", () => {
  const wrongEngine = makeEngine(catalog, "wrong-replay");
  const wrong = wrongEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  wrongEngine.submitTicketNote(wrong, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket.");
  wrongEngine.submitStudentResponse(wrong, fixtures.explanationOnly, "prediction_before_output", "evidence present");
  wrongEngine.submitStudentResponse(wrong, fixtures.explanationOnly, "choose_next_command", "definitely wrong");
  assert.equal(wrongEngine.restoreAttempt(wrong, fixtures.explanationOnly).stage_states.choose_next_command.status, "failed");

  const correctEngine = makeEngine(catalog, "correct-replay");
  const correct = correctEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(correctEngine, correct, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  assert.equal(correctEngine.restoreAttempt(correct, fixtures.explanationOnly).stage_states.choose_next_command.status, "passed");
});

check("Materialized stage, dimension, completion, hint, and critical-failure tampering cannot improve replay.", () => {
  const tamperEngine = makeEngine(catalog, "tamper-replay");
  const attempt = tamperEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  tamperEngine.submitTicketNote(attempt, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket.");
  tamperEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "prediction_before_output", "evidence present");
  tamperEngine.requestHint(attempt, fixtures.explanationOnly, "choose_next_command");
  tamperEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "choose_next_command", "display interface brief");
  attempt.stage_states.choose_next_command.status = "passed";
  attempt.dimension_results.syntax.score = 1;
  attempt.completion_result = { completed: true, eligible_for_limited_credit: true, eligible_for_full_mastery: true, blockers: [], finalized_at: attempt.updated_at };
  attempt.hint_history = [];
  attempt.critical_failures = [];
  const restored = tamperEngine.restoreAttempt(attempt, fixtures.explanationOnly);
  assert.equal(restored.stage_states.choose_next_command.status, "failed");
  assert.equal(restored.dimension_results.syntax.score, 0);
  assert.equal(restored.dimension_results.syntax.hint_penalty > 0, true);
  assert.equal(restored.critical_failures.some((failure) => failure.code === "wrong_vendor_syntax"), true);
  assert.equal(restored.completion_result.completed, false);

  const missingStageSnapshot = deepClone(attempt);
  delete missingStageSnapshot.stage_states.choose_next_command;
  const restoredMissingStage = tamperEngine.restoreAttempt(missingStageSnapshot, fixtures.explanationOnly);
  assert.equal(restoredMissingStage.stage_states.choose_next_command.status, "failed");
  assert.equal(restoredMissingStage.dimension_results.syntax.score, 0);
});

check("Trusted evidence is provider-revalidated on restore.", () => {
  const calls = [];
  const provider = { verify(envelope) { calls.push(envelope.evidence_id); return { accepted: true }; } };
  const replayEngine = makeEngine(catalog, "provider-recheck", { evidenceProvider: provider });
  const attempt = replayEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(replayEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(replayEngine, attempt, fixtures.config, "runtime_execution");
  assert.equal(calls.length, 1);
  replayEngine.restoreAttempt(attempt, fixtures.config);
  assert.equal(calls.length, 2);
});

check("Fake provider evidence and provider rejection block trusted credit.", () => {
  const fakeEngine = makeEngine(catalog, "fake-provider");
  const attempt = fakeEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(fakeEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(fakeEngine, attempt, fixtures.config, "runtime_execution");
  const tampered = deepClone(attempt);
  const event = tampered.event_journal.find((candidate) => candidate.event_type === "trusted_evidence_ingested");
  event.evidence_envelope.provider_id = "fake-provider";
  event.provider_receipt.accepted = true;
  const restored = fakeEngine.restoreAttempt(tampered, fixtures.config);
  assert.equal(restored.validation_state, "invalid");
  assert.equal(restored.dimension_results.practical_execution.score, 0);
});

check("Missing provider blocks trusted credit and full mastery.", () => {
  const producingEngine = makeEngine(catalog, "missing-provider-source");
  const attempt = producingEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  completeConfigAttempt(producingEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const restoreEngine = new LessonAttemptEngine({ catalog, clock: deterministicClock(), idGenerator: deterministicIds("missing-provider") });
  const restored = restoreEngine.restoreAttempt(attempt, fixtures.config);
  assert.equal(restored.validation_state, "pending_provider_revalidation");
  assert.equal(restored.dimension_results.practical_execution.score, 0);
  assert.equal(restored.completion_result.eligible_for_full_mastery, false);
  assert.equal(hasBlocker(restored.completion_result, "evidence_provider_unavailable"), true);
});

check("Execution and verification evidence field contracts differ.", () => {
  const fieldEngine = makeEngine(catalog, "evidence-fields");
  const attempt = fieldEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(fieldEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const execution = makeTrustedEvidence(attempt, "runtime_execution");
  execution.verification_policy_id = null;
  execution.verification_record_id = null;
  assert.equal(fieldEngine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", execution).accepted, true);
  const verification = makeTrustedEvidence(attempt, "runtime_verification");
  verification.verification_policy_id = null;
  verification.verification_record_id = null;
  const result = fieldEngine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_verification", verification);
  assert.equal(result.accepted, false);
  assert.ok(result.errors.includes("missing_verification_policy_id"));
  assert.ok(result.errors.includes("missing_verification_record_id"));
  const restored = fieldEngine.restoreAttempt(attempt, fixtures.config);
  assert.equal(restored.stage_states.runtime_execution.status, "passed");
  assert.equal(restored.stage_states.runtime_verification.status, "available");
});

check("Duplicate trusted evidence event IDs are rejected.", () => {
  const duplicateEngine = makeEngine(catalog, "duplicate-event-evidence");
  const attempt = duplicateEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(duplicateEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(duplicateEngine, attempt, fixtures.config, "runtime_execution");
  const trustedEvent = deepClone(attempt.event_journal.find((event) => event.event_type === "trusted_evidence_ingested"));
  trustedEvent.event_id = "duplicate-evidence-event";
  trustedEvent.sequence = attempt.event_journal.length + 1;
  trustedEvent.timestamp = "2026-07-15T09:00:00.000Z";
  attempt.event_journal.push(trustedEvent);
  assertThrowsCode(() => duplicateEngine.restoreAttempt(attempt, fixtures.config), "duplicate_event_evidence");
});

check("Replay rejects runtime_verification before runtime_execution.", () => {
  const parityEngine = makeEngine(catalog, "reorder-verification");
  const attempt = parityEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  completeConfigAttempt(parityEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const reordered = deepClone(attempt);
  moveTrustedEventBefore(reordered, "runtime_verification", "runtime_execution");
  assertThrowsCode(() => parityEngine.restoreAttempt(reordered, fixtures.config), "trusted_stage_locked");
});

check("Evidence type is bound to trusted stage.", () => {
  const parityEngine = makeEngine(catalog, "type-binding");
  const attempt = parityEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(parityEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(parityEngine, attempt, fixtures.config, "runtime_execution");
  const wrongType = makeTrustedEvidence(attempt, "runtime_verification", { evidence_type: "execution" });
  wrongType.verification_policy_id = null;
  wrongType.verification_record_id = null;
  const result = parityEngine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_verification", wrongType);
  assert.equal(result.accepted, false);
  assert.ok(result.errors.includes("mismatched_evidence_type"));
  assert.ok(result.errors.includes("verification_policy_required"));
  assert.ok(result.errors.includes("verification_record_required"));
  assert.equal(attempt.stage_states.runtime_verification.status, "available");
});

check("Verification evidence cannot satisfy runtime_execution.", () => {
  const parityEngine = makeEngine(catalog, "verification-as-execution");
  const attempt = parityEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(parityEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const wrongType = makeTrustedEvidence(attempt, "runtime_execution", { evidence_type: "verification" });
  const result = parityEngine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", wrongType);
  assert.equal(result.accepted, false);
  assert.ok(result.errors.includes("mismatched_evidence_type"));
  assert.equal(attempt.stage_states.runtime_execution.status, "available");
});

check("Evidence ownership registry rejects cross-attempt replay reuse.", () => {
  const registryEngine = makeEngine(catalog, "ownership-reuse");
  const first = registryEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(registryEngine, first, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(registryEngine, first, fixtures.config, "runtime_execution", {
    evidence_id: "shared-evidence-id",
    source_event_id: "shared-source-event"
  });
  registryEngine.restoreAttempt(first, fixtures.config);

  const secondAttemptIdentity = registryEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const reusedEvidence = cloneAttemptWithFreshIdentity(first, secondAttemptIdentity);
  const restored = registryEngine.restoreAttempt(reusedEvidence, fixtures.config);
  assert.equal(restored.stage_states.runtime_execution.status, "available");
  assert.equal(restored.dimension_results.practical_execution.score, 0);
  assert.equal(restored.critical_failures.some((failure) => failure.code === "cross_attempt_evidence_reuse"), true);

  const reusedSource = cloneAttemptWithFreshIdentity(first, registryEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id }), {
    evidence_id: "changed-evidence-id",
    source_event_id: "shared-source-event"
  });
  const restoredSource = registryEngine.restoreAttempt(reusedSource, fixtures.config);
  assert.equal(restoredSource.dimension_results.practical_execution.score, 0);
  assert.equal(restoredSource.critical_failures.some((failure) => failure.code === "cross_attempt_evidence_reuse"), true);
});

check("Verification record ownership rejects reuse under another evidence ID.", () => {
  const firstProducer = makeEngine(catalog, "verification-owner-a");
  const first = firstProducer.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(firstProducer, first, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(firstProducer, first, fixtures.config, "runtime_execution", { evidence_id: "owner-a-exec", source_event_id: "owner-a-exec-source" });
  ingestTrusted(firstProducer, first, fixtures.config, "runtime_verification", { evidence_id: "owner-a-ver", source_event_id: "owner-a-ver-source", verification_record_id: "shared-verification-record" });

  const secondProducer = makeEngine(catalog, "verification-owner-b");
  const second = secondProducer.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(secondProducer, second, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(secondProducer, second, fixtures.config, "runtime_execution", { evidence_id: "owner-b-exec", source_event_id: "owner-b-exec-source" });
  ingestTrusted(secondProducer, second, fixtures.config, "runtime_verification", { evidence_id: "owner-b-ver", source_event_id: "owner-b-ver-source", verification_record_id: "shared-verification-record" });

  const restoreEngine = makeEngine(catalog, "verification-owner-restore");
  assert.equal(restoreEngine.restoreAttempt(first, fixtures.config).stage_states.runtime_verification.status, "passed");
  const restoredSecond = restoreEngine.restoreAttempt(second, fixtures.config);
  assert.equal(restoredSecond.stage_states.runtime_verification.status, "available");
  assert.equal(restoredSecond.dimension_results.verification.score, 0);
  assert.equal(restoredSecond.critical_failures.some((failure) => failure.code === "cross_attempt_evidence_reuse"), true);
});

check("Restoring the same attempt twice is ownership-idempotent.", () => {
  const producer = makeEngine(catalog, "same-attempt-source");
  const attempt = producer.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  completeConfigAttempt(producer, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const restoreEngine = makeEngine(catalog, "same-attempt-restore");
  const firstRestore = restoreEngine.restoreAttempt(attempt, fixtures.config);
  const secondRestore = restoreEngine.restoreAttempt(attempt, fixtures.config);
  assert.equal(firstRestore.completion_result.eligible_for_full_mastery, true);
  assert.equal(secondRestore.completion_result.eligible_for_full_mastery, true);
  assert.equal(secondRestore.critical_failures.length, 0);
});

check("Live rejected trusted evidence remains rejected on replay.", () => {
  const liveEngine = makeEngine(catalog, "rejected-live");
  const first = liveEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(liveEngine, first, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(liveEngine, first, fixtures.config, "runtime_execution", { evidence_id: "live-reused-evidence" });

  const rejected = liveEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(liveEngine, rejected, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const liveResult = liveEngine.ingestTrustedExternalEvidence(rejected, fixtures.config, "runtime_execution", makeTrustedEvidence(rejected, "runtime_execution", { evidence_id: "live-reused-evidence" }));
  assert.equal(liveResult.accepted, false);
  assert.equal(rejected.critical_failures.some((failure) => failure.code === "cross_attempt_evidence_reuse"), true);

  const freshEngine = makeEngine(catalog, "fresh-rejected-replay");
  const restored = freshEngine.restoreAttempt(rejected, fixtures.config);
  assert.equal(restored.stage_states.runtime_execution.status, "available");
  assert.equal(restored.dimension_results.practical_execution.score, 0);
  assert.equal(restored.critical_failures.some((failure) => failure.code === "cross_attempt_evidence_reuse"), true);
  assert.equal(restored.completion_result.completed, false);
});

check("Live mismatched trusted evidence critical failure survives replay.", () => {
  const liveEngine = makeEngine(catalog, "mismatch-live");
  const attempt = liveEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(liveEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const liveResult = liveEngine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_execution", makeTrustedEvidence(attempt, "runtime_execution", { vendor_id: "hp_comware" }));
  assert.equal(liveResult.accepted, false);
  assert.equal(attempt.critical_failures.some((failure) => failure.code === "mismatched_trusted_evidence"), true);
  const restored = makeEngine(catalog, "mismatch-fresh").restoreAttempt(attempt, fixtures.config);
  assert.equal(restored.stage_states.runtime_execution.status, "available");
  assert.equal(restored.dimension_results.practical_execution.score, 0);
  assert.equal(restored.critical_failures.some((failure) => failure.code === "mismatched_trusted_evidence"), true);
});

check("Replay rejects critical-failure resolution before successful retry.", () => {
  const resolutionEngine = makeEngine(catalog, "early-resolution");
  const attempt = resolutionEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  resolutionEngine.submitTicketNote(attempt, fixtures.explanationOnly, "technician_ticket", "Ticket opened by the student.");
  resolutionEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "prediction_before_output", "evidence present");
  resolutionEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "choose_next_command", "display interface brief");
  resolutionEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "choose_next_command", primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  const resolution = resolutionEngine.resolveCriticalFailure(attempt, fixtures.explanationOnly, "wrong_vendor_syntax", "choose_next_command", { type: "stage_retry", stage_id: "choose_next_command" });
  assert.equal(resolution.resolved, true);

  const tampered = deepClone(attempt);
  const resolutionIndex = tampered.event_journal.findIndex((event) => event.event_type === "critical_failure_resolved");
  const retryIndex = tampered.event_journal.findLastIndex((event) => event.event_type === "student_response_submitted" && event.stage_id === "choose_next_command");
  const [resolutionEvent] = tampered.event_journal.splice(resolutionIndex, 1);
  resolutionEvent.timestamp = tampered.event_journal[retryIndex - 1].timestamp;
  tampered.event_journal.splice(retryIndex, 0, resolutionEvent);
  resequenceEvents(tampered);
  assertThrowsCode(() => resolutionEngine.restoreAttempt(tampered, fixtures.explanationOnly), "event_replay_resolution_stage_not_passed");
});

check("Replay accepts critical-failure resolution after successful retry.", () => {
  const resolutionEngine = makeEngine(catalog, "ordered-resolution");
  const attempt = resolutionEngine.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  resolutionEngine.submitTicketNote(attempt, fixtures.explanationOnly, "technician_ticket", "Ticket opened by the student.");
  resolutionEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "prediction_before_output", "evidence present");
  resolutionEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "choose_next_command", "display interface brief");
  resolutionEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "choose_next_command", primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  resolutionEngine.resolveCriticalFailure(attempt, fixtures.explanationOnly, "wrong_vendor_syntax", "choose_next_command", { type: "stage_retry", stage_id: "choose_next_command" });
  const restored = resolutionEngine.restoreAttempt(attempt, fixtures.explanationOnly);
  assert.equal(restored.critical_failures.find((failure) => failure.code === "wrong_vendor_syntax").resolved, true);
});

check("Replay rejects resolution before remediation stage.", () => {
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "ticket_note").remediates_critical_failures = ["wrong_vendor_syntax"];
  const resolutionEngine = makeEngine(catalog, "remediation-order");
  const attempt = resolutionEngine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  resolutionEngine.submitTicketNote(attempt, definition, "technician_ticket", "Ticket opened by the student.");
  resolutionEngine.submitStudentResponse(attempt, definition, "prediction_before_output", "evidence present");
  resolutionEngine.submitStudentResponse(attempt, definition, "choose_next_command", "display interface brief");
  resolutionEngine.submitStudentResponse(attempt, definition, "choose_next_command", primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  resolutionEngine.submitTicketNote(attempt, definition, "ticket_note", "Remediation note after retry.");
  resolutionEngine.resolveCriticalFailure(attempt, definition, "wrong_vendor_syntax", "choose_next_command", { type: "remediation_stage", stage_id: "ticket_note" });
  const tampered = deepClone(attempt);
  const resolutionIndex = tampered.event_journal.findIndex((event) => event.event_type === "critical_failure_resolved");
  const remediationIndex = tampered.event_journal.findIndex((event) => event.event_type === "student_response_submitted" && event.stage_id === "ticket_note");
  const [resolutionEvent] = tampered.event_journal.splice(resolutionIndex, 1);
  tampered.event_journal.splice(remediationIndex, 0, resolutionEvent);
  resequenceEvents(tampered);
  normalizeEventTimestamps(tampered);
  assertThrowsCode(() => resolutionEngine.restoreAttempt(tampered, definition), "event_replay_resolution_stage_not_passed");
});

check("Replay rejects trusted resolution before matching evidence.", () => {
  const definition = deepClone(fixtures.config);
  definition.stages.find((stage) => stage.stage_id === "runtime_execution").remediates_critical_failures = ["wrong_vendor_syntax"];
  const resolutionEngine = makeEngine(catalog, "trusted-resolution-order");
  const attempt = resolutionEngine.createAttempt(definition, { mode: "GUIDED", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  resolutionEngine.submitTicketNote(attempt, definition, "technician_ticket", "Ticket opened by the student.");
  resolutionEngine.submitStudentResponse(attempt, definition, "prediction_before_output", "evidence present");
  resolutionEngine.submitStudentResponse(attempt, definition, "choose_next_command", "display interface brief");
  resolutionEngine.submitStudentResponse(attempt, definition, "choose_next_command", primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  ingestTrusted(resolutionEngine, attempt, definition, "runtime_execution", { evidence_id: "future-remediation-evidence" });
  resolutionEngine.resolveCriticalFailure(attempt, definition, "wrong_vendor_syntax", "choose_next_command", { type: "trusted_evidence", stage_id: "runtime_execution", evidence_id: "future-remediation-evidence" });
  const tampered = deepClone(attempt);
  const resolutionIndex = tampered.event_journal.findIndex((event) => event.event_type === "critical_failure_resolved");
  const evidenceIndex = tampered.event_journal.findIndex((event) => event.event_type === "trusted_evidence_ingested" && event.stage_id === "runtime_execution");
  const [resolutionEvent] = tampered.event_journal.splice(resolutionIndex, 1);
  tampered.event_journal.splice(evidenceIndex, 0, resolutionEvent);
  resequenceEvents(tampered);
  normalizeEventTimestamps(tampered);
  assertThrowsCode(() => resolutionEngine.restoreAttempt(tampered, definition), "event_replay_resolution_evidence_not_matched");
});

check("Event source and shape validation rejects impossible journals.", () => {
  const shapeEngine = makeEngine(catalog, "event-shape");
  const attempt = shapeEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  completeConfigAttempt(shapeEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));

  const wrongSource = deepClone(attempt);
  wrongSource.event_journal.find((event) => event.event_type === "student_response_submitted").source_type = "engine";
  assertThrowsCode(() => shapeEngine.restoreAttempt(wrongSource, fixtures.config), "event_source_type_mismatch");

  const missingReceipt = deepClone(attempt);
  delete trustedEvent(missingReceipt, "runtime_execution").provider_receipt;
  assertThrowsCode(() => shapeEngine.restoreAttempt(missingReceipt, fixtures.config), "missing_event_provider_receipt");

  const missingResponse = deepClone(attempt);
  missingResponse.event_journal.find((event) => event.event_type === "student_response_submitted").response = null;
  assertThrowsCode(() => shapeEngine.restoreAttempt(missingResponse, fixtures.config), "missing_event_response");

  const finalizationPayload = deepClone(attempt);
  finalizationPayload.event_journal.find((event) => event.event_type === "attempt_finalized").evidence_envelope = trustedEvent(attempt, "runtime_execution").evidence_envelope;
  assertThrowsCode(() => shapeEngine.restoreAttempt(finalizationPayload, fixtures.config), "invalid_event_shape");
});

check("Live and replay trusted-stage admission results match.", () => {
  const parityEngine = makeEngine(catalog, "live-replay-parity");
  const attempt = parityEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  passTicketPredictionCommand(parityEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  const liveResult = parityEngine.ingestTrustedExternalEvidence(attempt, fixtures.config, "runtime_verification", makeTrustedEvidence(attempt, "runtime_verification", { evidence_id: "locked-verification" }));
  assert.equal(liveResult.accepted, false);
  assert.ok(liveResult.errors.includes("trusted_stage_locked"));
  const restored = parityEngine.restoreAttempt(attempt, fixtures.config);
  assert.equal(restored.stage_states.runtime_verification.status, "locked");
  assert.equal(restored.submitted_evidence.length, 0);
  assert.deepEqual(restored.dimension_results.verification, attempt.dimension_results.verification);
  assert.equal(restored.completion_result.completed, attempt.completion_result.completed);
  assert.equal(restored.completion_result.eligible_for_full_mastery, attempt.completion_result.eligible_for_full_mastery);
});

check("Legitimate completed Independent attempt round-trips through event replay.", () => {
  const replayEngine = makeEngine(catalog, "event-roundtrip");
  const attempt = replayEngine.createAttempt(fixtures.config, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.ciscoConfig.canonical_command_id });
  const completion = completeConfigAttempt(replayEngine, attempt, fixtures.config, primaryCommand(fixtures, fixtures.records.ciscoConfig.canonical_command_id));
  assert.equal(completion.eligible_for_full_mastery, true);
  const restored = replayEngine.restoreAttempt(replayEngine.serializeAttempt(attempt), fixtures.config);
  assert.equal(restored.status, "completed");
  assert.equal(restored.completion_result.eligible_for_full_mastery, true);
  assert.equal(restored.restore_diagnostics.snapshot_mismatch, false);
});

check("Active Independent submission result is feedback-redacted.", () => {
  const independentEngine = makeEngine(catalog, "independent-redact-submit");
  const attempt = independentEngine.createAttempt(fixtures.explanationOnly, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assertSubmissionPassed(independentEngine, attempt, fixtures.explanationOnly, "technician_ticket", () => independentEngine.submitTicketNote(attempt, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket."));
  assertSubmissionPassed(independentEngine, attempt, fixtures.explanationOnly, "prediction_before_output", () => independentEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "prediction_before_output", "evidence present"));
  const wrong = independentEngine.submitStudentResponse(attempt, fixtures.explanationOnly, "choose_next_command", "bad command");
  assert.equal(wrong.recorded, true);
  assert.equal(wrong.feedback_deferred, true);
  assert.equal(JSON.stringify(wrong).includes("command_mismatch"), false);
  const correctAttempt = independentEngine.createAttempt(fixtures.explanationOnly, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(independentEngine, correctAttempt, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
});

check("Active Independent public attempt view is feedback-redacted.", () => {
  const independentEngine = makeEngine(catalog, "independent-redact-view");
  const attempt = independentEngine.createAttempt(fixtures.explanationOnly, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  passTicketPredictionCommand(independentEngine, attempt, fixtures.explanationOnly, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  const view = independentEngine.getPublicAttemptView(attempt);
  const payload = JSON.stringify(view);
  assert.equal(payload.includes("passed"), false);
  assert.equal(payload.includes("feedback_code"), false);
  assert.equal(payload.includes("command_mismatch"), false);
  assert.deepEqual(view.dimension_results, {});
  assert.deepEqual(view.failure_history, []);
  assert.equal(view.completion_result.feedback_deferred, true);
});

check("Finalized Independent review follows explicit answer policy.", () => {
  const reviewEngine = makeEngine(catalog, "independent-review-policy");
  const definition = deepClone(fixtures.explanationOnly);
  definition.stages.find((stage) => stage.stage_id === "choose_next_command").answer_visibility_policy = "after_finalization";
  const attempt = reviewEngine.createAttempt(definition, { mode: "INDEPENDENT", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  completeExplanationAttempt(reviewEngine, attempt, definition, primaryCommand(fixtures, fixtures.records.arubaExplanation.canonical_command_id));
  const review = reviewEngine.getReviewProjection(attempt, definition);
  assert.equal(review.available, true);
  assert.equal(publicStage(review.lesson, "choose_next_command").answer_visible, true);
  assert.equal(publicStage(review.lesson, "ticket_note").answer_visible, false);
  assert.deepEqual(review.dimension_results, {});
});

check("Guided feedback remains immediate and Assisted feedback is policy-controlled.", () => {
  const guidedFeedback = makeEngine(catalog, "guided-feedback");
  const guided = guidedFeedback.createAttempt(fixtures.explanationOnly, { mode: "GUIDED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  guidedFeedback.submitTicketNote(guided, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket.");
  guidedFeedback.submitStudentResponse(guided, fixtures.explanationOnly, "prediction_before_output", "evidence present");
  assert.equal(guidedFeedback.submitStudentResponse(guided, fixtures.explanationOnly, "choose_next_command", "bad command").feedback_code, "command_mismatch");

  const assistedFeedback = makeEngine(catalog, "assisted-feedback");
  const assisted = assistedFeedback.createAttempt(fixtures.explanationOnly, { mode: "ASSISTED", canonical_command_id: fixtures.records.arubaExplanation.canonical_command_id });
  assistedFeedback.submitTicketNote(assisted, fixtures.explanationOnly, "technician_ticket", "Student-submitted ticket.");
  assistedFeedback.submitStudentResponse(assisted, fixtures.explanationOnly, "prediction_before_output", "evidence present");
  const reveal = assistedFeedback.revealStageContent(assisted, fixtures.explanationOnly, "choose_next_command");
  assert.equal(reveal.answer_visible, false);
  assert.equal(assistedFeedback.submitStudentResponse(assisted, fixtures.explanationOnly, "choose_next_command", "bad command").feedback_code, "command_mismatch");
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
