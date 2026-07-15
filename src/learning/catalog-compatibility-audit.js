"use strict";

import { allowedDimensionsForSupport, asArray, STAGE_TYPES } from "./lesson-definition.js";

const SUPPORT_BLOCKED_STAGES = {
  explanation_only: ["runtime_execution", "runtime_verification", "save_or_rollback"],
  output_simulation: ["runtime_execution", "save_or_rollback"],
  unsupported_for_profile: ["runtime_execution", "runtime_verification", "save_or_rollback"],
  simplified_state_simulation: [],
  full_state_simulation: []
};

export function buildStage2CompatibilityAudit({ catalog, migrationReadiness, traceabilityMatrix } = {}) {
  const commands = asArray(catalog?.commands);
  const readinessStatuses = new Map();
  for (const status of ["pilot_ready", "batch_ready", "blocked_by_runtime", "blocked_by_verification", "blocked_by_practice", "blocked_by_content", "explanation_only", "unsupported"]) {
    for (const commandId of asArray(migrationReadiness?.[status])) readinessStatuses.set(commandId, status);
  }
  const rows = commands.map((record) => {
    const blockedStages = new Set(SUPPORT_BLOCKED_STAGES[record.runtime_support] || []);
    if (record.verification_status === "missing") blockedStages.add("runtime_verification");
    if (record.rollback_status === "missing" && asArray(record.required_lesson_stages).includes("save_or_rollback")) blockedStages.add("save_or_rollback");
    const unsupported_stages = asArray(record.required_lesson_stages).filter((stage) => blockedStages.has(stage));
    const blockers = [...new Set([...asArray(record.blocking_reasons), ...unsupported_stages.map((stage) => `unsupported_stage:${stage}`)])];
    return {
      command_id: record.canonical_command_id,
      vendor_id: record.vendor_id,
      operating_system_family_id: record.operating_system_family_id,
      runtime_support: record.runtime_support,
      handler_status: record.handler_status,
      lesson_status: record.lesson_status,
      practice_status: record.practice_status,
      verification_status: record.verification_status,
      rollback_status: record.rollback_status,
      required_lesson_stages: asArray(record.required_lesson_stages),
      eligible_mastery_dimensions: allowedDimensionsForSupport(record),
      engine_representable: true,
      unsupported_stages,
      migration_status: record.migration_status,
      readiness_bucket: readinessStatuses.get(record.canonical_command_id) || record.migration_status,
      blockers,
      production_lesson_content_exists: ["dedicated", "grouped"].includes(record.lesson_status),
      trusted_runtime_evidence_required: asArray(record.required_lesson_stages).some((stage) => ["runtime_execution", "runtime_verification", "save_or_rollback"].includes(stage)),
      review_eligibility: record.review_status,
      migration_status_preserved: true
    };
  });
  const vendors = [...new Set(rows.map((row) => row.vendor_id))].sort();
  const omitted = commands.filter((record) => !rows.some((row) => row.command_id === record.canonical_command_id));
  const unknownStageNames = [...new Set(rows.flatMap((row) => row.required_lesson_stages).filter((stage) => !STAGE_TYPES.includes(stage)))];
  return {
    schema_version: "learning-integrity-stage-2.v1",
    generated_from: catalog?.schema_version || "learning-command-catalog.v1",
    command_count: commands.length,
    compatibility_rows: rows.length,
    vendors_represented: vendors,
    commands_omitted: omitted.map((record) => record.canonical_command_id),
    unknown_stage_names: unknownStageNames,
    migration_statuses_changed: [],
    review_coverage_changed: false,
    traceability_command_count: traceabilityMatrix?.counts?.canonical_commands ?? null,
    rows
  };
}

export function renderStage2CompatibilityMarkdown(audit) {
  const lines = [];
  lines.push("# Learning Integrity Stage 2 Compatibility Audit");
  lines.push("");
  lines.push(`- Schema: \`${audit.schema_version}\``);
  lines.push(`- Authoritative commands: ${audit.command_count}`);
  lines.push(`- Compatibility rows: ${audit.compatibility_rows}`);
  lines.push(`- Vendors represented: ${audit.vendors_represented.join(", ")}`);
  lines.push(`- Commands omitted: ${audit.commands_omitted.length}`);
  lines.push(`- Migration statuses changed: ${audit.migration_statuses_changed.length}`);
  lines.push(`- Review coverage changed: ${audit.review_coverage_changed ? "yes" : "no"}`);
  lines.push("");
  lines.push("Stage 2 reports engine representability only. It does not mark production lesson content complete, does not upgrade migration readiness, and does not fabricate practice or review coverage.");
  lines.push("");
  lines.push("| Command | Vendor | Runtime support | Required stages | Eligible dimensions | Representable | Unsupported stages | Migration | Blockers | Production content | Trusted evidence required |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const row of audit.rows) {
    lines.push([
      row.command_id,
      row.vendor_id,
      row.runtime_support,
      row.required_lesson_stages.join("<br>"),
      row.eligible_mastery_dimensions.join("<br>"),
      row.engine_representable ? "yes" : "no",
      row.unsupported_stages.join("<br>") || "none",
      row.migration_status,
      row.blockers.join("<br>") || "none",
      row.production_lesson_content_exists ? "yes" : "no",
      row.trusted_runtime_evidence_required ? "yes" : "no"
    ].map((value) => String(value).replace(/\|/g, "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  return lines.join("\n");
}

