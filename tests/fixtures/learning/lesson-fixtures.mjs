"use strict";

import { LESSON_DEFINITION_SCHEMA_VERSION, DEFAULT_MODE_POLICIES, allowedDimensionsForSupport } from "../../../src/learning/lesson-definition.js";

const ALL_MODES = ["GUIDED", "ASSISTED", "INDEPENDENT"];

function assertRecord(record, label) {
  if (!record) throw new Error(`Unable to discover fixture record for ${label}`);
  return record;
}

function primarySyntax(record) {
  return record.source_command?.syntax || record.canonical_command_id.replaceAll("_", " ");
}

function acceptedCommands(record) {
  return [primarySyntax(record), ...(record.source_command?.aliases || [])];
}

function targetFromRecord(record, requiredStageIds, overrides = {}) {
  return {
    canonical_command_id: record.canonical_command_id,
    vendor_id: record.vendor_id,
    operating_system_family_id: record.operating_system_family_id,
    objective_ids: [...(record.objective_ids || [])],
    runtime_support: record.runtime_support,
    practice_status: record.practice_status,
    verification_status: record.verification_status,
    rollback_status: record.rollback_status,
    mastery_dimensions: [...(record.mastery_dimensions || [])],
    blocking_reasons: [...(record.blocking_reasons || [])],
    required_stage_ids: [...requiredStageIds],
    completion_thresholds: {
      required_dimensions: overrides.required_dimensions || ["concept", "syntax", "command_selection"].filter((dimension) => allowedDimensionsForSupport(record).includes(dimension)),
      minimum_score: 1
    },
    migration_status: record.migration_status,
    ...overrides
  };
}

function baseStage(stage) {
  return {
    requirement_status: "required",
    dependencies: [],
    mode_availability: ALL_MODES,
    evidence_source: "student",
    eligible_dimensions: [],
    pass_criteria: {},
    failure_behavior: { retry_allowed: true },
    answer_visibility_policy: "after_submission",
    content_role: "assessed",
    hint_penalty: 0.1,
    hints: [{ text: "Use the command objective and vendor syntax as your anchor." }],
    ...stage
  };
}

function standardStages(record, options = {}) {
  const syntax = primarySyntax(record);
  const accepted = acceptedCommands(record);
  const wrongVendor = options.wrong_vendor_commands || ["display interface brief", "Get-NetAdapter", "show interfaces terse"];
  const unsafe = options.unsafe_commands || ["erase startup-config", "format flash:", "rm -rf /"];
  const stages = [
    baseStage({
      stage_id: "technician_ticket",
      stage_type: "technician_ticket",
      prompt: `Record the trouble ticket for ${record.canonical_command_id}.`,
      eligible_dimensions: ["concept"],
      evaluator: { type: "non_empty_text" },
      pass_criteria: { min_length: 8 }
    }),
    baseStage({
      stage_id: "prediction_before_output",
      stage_type: "prediction_before_output",
      dependencies: ["technician_ticket"],
      prompt: "Predict the evidence you expect before seeing assessed output.",
      eligible_dimensions: ["prediction"],
      evaluator: { type: "one_of" },
      pass_criteria: { accepted_values: ["interfaces listed", "configuration accepted", "evidence present", "state visible"] },
      public_answer: "evidence present"
    }),
    baseStage({
      stage_id: "choose_next_command",
      stage_type: "choose_next_command",
      dependencies: ["prediction_before_output"],
      prompt: "Choose the next vendor-correct command.",
      eligible_dimensions: ["syntax", "command_selection"],
      evaluator: { type: "normalized_command" },
      pass_criteria: {
        accepted_commands: accepted,
        wrong_vendor_commands: wrongVendor,
        unsafe_commands: unsafe
      },
      public_answer: syntax
    }),
    baseStage({
      stage_id: "healthy_output",
      stage_type: "healthy_output",
      dependencies: ["prediction_before_output"],
      prompt: "Select the healthy evidence line.",
      eligible_dimensions: ["output_interpretation"],
      evidence_source: "simulated_output",
      evaluator: { type: "evidence_line_selection" },
      pass_criteria: { required_evidence_line_ids: ["healthy-line-1"] },
      public_content: "Interface Gi1/0/1 is connected and passing traffic.",
      public_answer: "healthy-line-1"
    }),
    baseStage({
      stage_id: "evidence_identification",
      stage_type: "evidence_identification",
      dependencies: ["healthy_output"],
      prompt: "Identify the evidence that proves the expected state.",
      eligible_dimensions: ["output_interpretation", "troubleshooting"],
      evidence_source: "simulated_output",
      evaluator: { type: "evidence_line_selection" },
      pass_criteria: { required_evidence_line_ids: ["evidence-line-1"] },
      public_answer: "evidence-line-1"
    }),
    baseStage({
      stage_id: "runtime_execution",
      stage_type: "runtime_execution",
      dependencies: ["choose_next_command"],
      prompt: "Submit trusted execution evidence.",
      eligible_dimensions: ["practical_execution", "troubleshooting"],
      evidence_source: "trusted_external",
      evaluator: { type: "trusted_external_evidence" },
      answer_visibility_policy: "never"
    }),
    baseStage({
      stage_id: "runtime_verification",
      stage_type: "runtime_verification",
      dependencies: ["runtime_execution"],
      prompt: "Submit trusted verification evidence.",
      eligible_dimensions: ["verification"],
      evidence_source: "trusted_external",
      evaluator: { type: "trusted_verification_evidence" },
      answer_visibility_policy: "never"
    }),
    baseStage({
      stage_id: "save_or_rollback",
      stage_type: "save_or_rollback",
      dependencies: ["runtime_verification"],
      prompt: "Choose whether to save or roll back after verification.",
      eligible_dimensions: ["safety"],
      evaluator: { type: "save_or_rollback_decision" },
      pass_criteria: {}
    }),
    baseStage({
      stage_id: "ticket_note",
      stage_type: "ticket_note",
      dependencies: ["choose_next_command"],
      prompt: "Write the ticket note in your own words.",
      eligible_dimensions: ["documentation"],
      evaluator: { type: "non_empty_text" },
      pass_criteria: { min_length: 12 }
    }),
    baseStage({
      stage_id: "confidence_rating",
      stage_type: "confidence_rating",
      dependencies: ["choose_next_command"],
      prompt: "Record confidence without changing skill evidence.",
      evaluator: { type: "confidence_selection" },
      pass_criteria: {}
    }),
    baseStage({
      stage_id: "optional_vendor_context",
      stage_type: "equivalent_vendor_concepts",
      requirement_status: "optional",
      support_status: "unsupported",
      reason: "fixture records unsupported optional context honestly",
      prompt: "Optional equivalent vendor context is not available in this fixture.",
      evaluator: { type: "non_empty_text" }
    })
  ];
  return stages;
}

function definitionFromRecord(record, requiredStageIds, overrides = {}) {
  const stages = standardStages(record, overrides.stage_options || {});
  return {
    schema_version: LESSON_DEFINITION_SCHEMA_VERSION,
    definition_version: "fixture.v1",
    lesson_id: overrides.lesson_id || `fixture-${record.canonical_command_id}`,
    title: overrides.title || `Fixture lesson for ${record.canonical_command_id}`,
    module_id: record.module_id,
    learning_level: record.learning_level,
    vendor_id: record.vendor_id,
    operating_system_family_id: record.operating_system_family_id,
    command_targets: overrides.command_targets || [targetFromRecord(record, requiredStageIds, overrides.target_overrides || {})],
    prerequisites: {
      module_ids: [...(record.prerequisite_module_ids || [])],
      command_ids: [...(record.prerequisite_command_ids || [])]
    },
    stages: overrides.stages || stages,
    supported_modes: ALL_MODES,
    mode_policies: {
      GUIDED: { ...DEFAULT_MODE_POLICIES.GUIDED },
      ASSISTED: { ...DEFAULT_MODE_POLICIES.ASSISTED },
      INDEPENDENT: { ...DEFAULT_MODE_POLICIES.INDEPENDENT }
    },
    completion_policy: {
      require_all_required_stages: true,
      minimum_score: 1,
      completion_thresholds: { required_dimensions: ["concept", "syntax", "command_selection"], minimum_score: 1 }
    },
    critical_failure_rules: [
      "wrong_vendor_syntax",
      "unsafe_command_choice",
      "configuration_claim_without_trusted_execution",
      "verification_claim_without_trusted_evidence",
      "save_before_required_verification",
      "cross_attempt_evidence_reuse",
      "answer_leakage_violation"
    ],
    review_eligibility: "planned",
    migration_status: record.migration_status
  };
}

function firstBy(catalog, predicate, label) {
  return assertRecord(catalog.commands.find(predicate), label);
}

export function buildFixtureDefinitions(catalog) {
  const records = {
    ciscoConfig: firstBy(catalog, (record) => record.canonical_command_id === "cisco_interface_config", "Cisco configuration command"),
    ciscoFullReadOnly: firstBy(catalog, (record) => record.canonical_command_id === "cisco_show_interface_status", "Cisco full-state read-only command"),
    ciscoAlias: firstBy(catalog, (record) => record.source_command?.aliases?.length && record.vendor_id === "cisco_ios", "Cisco alias command"),
    hp: firstBy(catalog, (record) => record.vendor_id === "hp_comware", "HP Comware command"),
    arubaOutput: firstBy(catalog, (record) => record.runtime_support === "output_simulation" && record.vendor_id === "aruba_cx", "Aruba output simulation command"),
    arubaExplanation: firstBy(catalog, (record) => record.runtime_support === "explanation_only" && record.vendor_id === "aruba_cx", "Aruba explanation-only command"),
    missingVerification: firstBy(catalog, (record) => record.verification_status === "missing", "missing verification command"),
    windows: firstBy(catalog, (record) => record.vendor_id === "windows_cmd", "Windows CMD command"),
    linux: firstBy(catalog, (record) => record.vendor_id === "linux", "Linux command")
  };

  const configRequired = [
    "technician_ticket",
    "prediction_before_output",
    "choose_next_command",
    "runtime_execution",
    "runtime_verification",
    "save_or_rollback",
    "ticket_note"
  ];
  const readOnlyRequired = [
    "technician_ticket",
    "prediction_before_output",
    "choose_next_command",
    "healthy_output",
    "evidence_identification",
    "runtime_execution",
    "runtime_verification",
    "ticket_note"
  ];
  const simulatedRequired = [
    "technician_ticket",
    "prediction_before_output",
    "choose_next_command",
    "healthy_output",
    "evidence_identification",
    "ticket_note"
  ];
  const explanationRequired = [
    "technician_ticket",
    "prediction_before_output",
    "choose_next_command",
    "ticket_note"
  ];

  const groupedTargets = [
    targetFromRecord(records.ciscoConfig, configRequired),
    targetFromRecord(records.ciscoFullReadOnly, readOnlyRequired, {
      required_dimensions: ["concept", "syntax", "command_selection", "practical_execution", "verification"].filter((dimension) => allowedDimensionsForSupport(records.ciscoFullReadOnly).includes(dimension))
    })
  ];

  return {
    records,
    config: definitionFromRecord(records.ciscoConfig, configRequired, {
      lesson_id: "fixture-cisco-configuration-integrity",
      target_overrides: {
        required_dimensions: ["concept", "syntax", "command_selection", "practical_execution", "verification"].filter((dimension) => allowedDimensionsForSupport(records.ciscoConfig).includes(dimension))
      }
    }),
    readOnlyFull: definitionFromRecord(records.ciscoFullReadOnly, readOnlyRequired, {
      lesson_id: "fixture-cisco-readonly-full-state",
      target_overrides: {
        required_dimensions: ["concept", "syntax", "command_selection", "practical_execution", "verification"].filter((dimension) => allowedDimensionsForSupport(records.ciscoFullReadOnly).includes(dimension))
      }
    }),
    outputSimulation: definitionFromRecord(records.arubaOutput, simulatedRequired, {
      lesson_id: "fixture-aruba-output-simulation"
    }),
    explanationOnly: definitionFromRecord(records.arubaExplanation, explanationRequired, {
      lesson_id: "fixture-aruba-explanation-only"
    }),
    missingVerification: definitionFromRecord(records.missingVerification, explanationRequired, {
      lesson_id: "fixture-missing-verification"
    }),
    grouped: definitionFromRecord(records.ciscoConfig, configRequired, {
      lesson_id: "fixture-grouped-cisco-targets",
      command_targets: groupedTargets
    }),
    vendorSmoke: {
      cisco_ios: definitionFromRecord(records.ciscoConfig, explanationRequired, { lesson_id: "fixture-vendor-cisco" }),
      hp_comware: definitionFromRecord(records.hp, explanationRequired, { lesson_id: "fixture-vendor-hp" }),
      aruba_cx: definitionFromRecord(records.arubaOutput, explanationRequired, { lesson_id: "fixture-vendor-aruba" }),
      windows_cmd: definitionFromRecord(records.windows, explanationRequired, { lesson_id: "fixture-vendor-windows" }),
      linux: definitionFromRecord(records.linux, explanationRequired, { lesson_id: "fixture-vendor-linux" })
    }
  };
}

export function makeTrustedEvidence(attempt, stageId, overrides = {}) {
  return {
    schema_version: "trusted-lesson-evidence.v1",
    evidence_id: overrides.evidence_id || `fixture-evidence-${attempt.attempt_id}-${stageId}`,
    provider_id: overrides.provider_id || "fixture-provider",
    evidence_type: overrides.evidence_type || (stageId === "runtime_verification" ? "verification" : "execution"),
    attempt_id: overrides.attempt_id || attempt.attempt_id,
    lesson_id: overrides.lesson_id || attempt.lesson_id,
    vendor_id: overrides.vendor_id || attempt.vendor_id,
    canonical_command_id: overrides.canonical_command_id || attempt.canonical_command_id,
    stage_id: overrides.stage_id || stageId,
    timestamp: overrides.timestamp || "2026-07-15T08:00:00.000Z",
    payload: overrides.payload || { signed: true, command_id: attempt.canonical_command_id },
    source_event_id: overrides.source_event_id || `event-${attempt.attempt_id}-${stageId}`,
    verification_policy_id: overrides.verification_policy_id || "fixture-policy",
    verification_record_id: overrides.verification_record_id || `record-${attempt.attempt_id}-${stageId}`,
    integrity_result: overrides.integrity_result || "passed"
  };
}

export function fixtureEvidenceProvider() {
  return {
    verify(envelope) {
      if (envelope.provider_id !== "fixture-provider") return { accepted: false, errors: ["provider_rejected_evidence"] };
      if (!envelope.payload?.signed) return { accepted: false, errors: ["unsigned_fixture_payload"] };
      return { accepted: true };
    }
  };
}
