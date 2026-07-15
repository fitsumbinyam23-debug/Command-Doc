"use strict";

export const LESSON_DEFINITION_SCHEMA_VERSION = "lesson-definition.v1";
export const ATTEMPT_STATE_SCHEMA_VERSION = "lesson-attempt-state.v1";

export const LEARNING_MODES = Object.freeze(["GUIDED", "ASSISTED", "INDEPENDENT"]);
export const ATTEMPT_STATUSES = Object.freeze(["active", "completed", "failed", "abandoned", "invalid_definition"]);
export const STAGE_STATUSES = Object.freeze(["locked", "available", "in_progress", "submitted", "passed", "failed", "not_applicable", "not_supported", "blocked"]);
export const STAGE_REQUIREMENT_STATUSES = Object.freeze(["required", "conditional", "optional", "unavailable", "unsupported"]);
export const MODE_STAGE_EXCEPTION_STATUSES = Object.freeze(["not_required"]);
export const ANSWER_VISIBILITY_POLICIES = Object.freeze([
  "never",
  "demonstration_only",
  "after_submission",
  "after_submission_or_failure",
  "after_finalization"
]);
export const STAGE_TYPES = Object.freeze([
  "technician_ticket",
  "learning_objective",
  "prerequisites",
  "command_purpose",
  "required_cli_mode",
  "syntax_breakdown",
  "aliases_and_abbreviations",
  "worked_example",
  "prediction_before_output",
  "healthy_output",
  "fault_output",
  "evidence_identification",
  "evidence_interpretation",
  "choose_next_command",
  "runtime_execution",
  "guided_practice",
  "assisted_practice",
  "independent_troubleshooting",
  "runtime_verification",
  "save_or_rollback",
  "ticket_note",
  "knowledge_check",
  "confidence_rating",
  "multidimensional_mastery",
  "review_scheduling",
  "related_commands",
  "equivalent_vendor_concepts"
]);
export const EVALUATOR_TYPES = Object.freeze([
  "exact_text",
  "normalized_command",
  "one_of",
  "ordered_selection",
  "evidence_line_selection",
  "structured_fields",
  "non_empty_text",
  "confidence_selection",
  "trusted_external_evidence",
  "trusted_verification_evidence",
  "save_or_rollback_decision",
  "safety_decision",
  "composite"
]);
export const MASTERY_DIMENSIONS = Object.freeze([
  "concept",
  "syntax",
  "prediction",
  "output_interpretation",
  "command_selection",
  "practical_execution",
  "troubleshooting",
  "verification",
  "safety",
  "documentation"
]);
export const RUNTIME_SUPPORT_LEVELS = Object.freeze([
  "full_state_simulation",
  "simplified_state_simulation",
  "output_simulation",
  "explanation_only",
  "unsupported_for_profile"
]);
export const MIGRATION_STATUSES = Object.freeze([
  "pilot_ready",
  "batch_ready",
  "blocked_by_runtime",
  "blocked_by_verification",
  "blocked_by_practice",
  "blocked_by_content",
  "explanation_only",
  "unsupported"
]);

export const DEFAULT_MODE_POLICIES = Object.freeze({
  GUIDED: {
    hints_allowed: true,
    hint_limit: null,
    worked_examples_visible: true,
    solution_reveal: "progressive",
    can_produce_full_mastery: false
  },
  ASSISTED: {
    hints_allowed: true,
    hint_limit: 1,
    worked_examples_visible: false,
    solution_reveal: "after_submission_or_failure",
    can_produce_full_mastery: false
  },
  INDEPENDENT: {
    hints_allowed: false,
    hint_limit: 0,
    worked_examples_visible: false,
    solution_reveal: "after_finalization",
    can_produce_full_mastery: true
  }
});

export function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeCommandText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function attemptKey({ lesson_id, vendor_id, canonical_command_id, mode, attempt_id }) {
  return [lesson_id, vendor_id, canonical_command_id, mode, attempt_id].join(":");
}

export function catalogCommands(catalog) {
  if (Array.isArray(catalog)) return catalog;
  if (Array.isArray(catalog?.commands)) return catalog.commands;
  return [];
}

export function catalogCommandMap(catalog) {
  return new Map(catalogCommands(catalog).map((record) => [record.canonical_command_id, record]));
}

export function findCatalogCommand(catalog, commandId) {
  return catalogCommandMap(catalog).get(commandId) || null;
}

export function allowedDimensionsForSupport(record) {
  const declared = new Set(asArray(record?.mastery_dimensions));
  const support = record?.runtime_support || "unsupported_for_profile";
  const allow = (dimensions) => dimensions.filter((dimension) => declared.has(dimension));
  if (support === "explanation_only" || support === "unsupported_for_profile") {
    return allow(["concept", "syntax", "command_selection"]);
  }
  if (support === "output_simulation") {
    return allow(["concept", "syntax", "prediction", "output_interpretation", "command_selection", "troubleshooting"]);
  }
  if (support === "simplified_state_simulation") {
    return allow(MASTERY_DIMENSIONS);
  }
  if (support === "full_state_simulation") {
    return allow(MASTERY_DIMENSIONS);
  }
  return [];
}

export function targetByCommand(definition, commandId) {
  return asArray(definition?.command_targets).find((target) => target.canonical_command_id === commandId) || null;
}

export function stageAppliesToMode(stage, mode) {
  const availability = asArray(stage?.mode_availability);
  return availability.length === 0 || availability.includes(mode);
}

export function modeStageException(target, stageId, mode) {
  const exception = target?.mode_stage_exceptions?.[stageId]?.[mode] || null;
  return exception && typeof exception === "object" ? exception : null;
}

export function isStageRequiredForMode(target, stage, mode) {
  if (!asArray(target?.required_stage_ids).includes(stage?.stage_id)) return false;
  const exception = modeStageException(target, stage.stage_id, mode);
  return exception?.status !== "not_required";
}

export function requiredStageIdsForMode(target, definition, mode) {
  const stages = new Map(asArray(definition?.stages).map((stage) => [stage.stage_id, stage]));
  return asArray(target?.required_stage_ids).filter((stageId) => {
    const stage = stages.get(stageId);
    return stage && isStageRequiredForMode(target, stage, mode) && stage.requirement_status !== "unsupported" && stage.support_status !== "unsupported";
  });
}

export function canRevealStageAnswer(stage, mode, options = {}) {
  const policy = options.modePolicy || DEFAULT_MODE_POLICIES[mode] || {};
  const visibility = stage?.answer_visibility_policy || "after_submission";
  const status = options.stageState?.status || "available";
  const attemptStatus = options.attemptStatus || "active";
  const isFinalized = attemptStatus === "completed";
  const isSubmitted = ["submitted", "passed", "failed"].includes(status);
  const isFailed = status === "failed";
  const isDemonstration = stage?.content_role === "demonstration";

  if (visibility === "never") return false;
  if (visibility === "demonstration_only") {
    return Boolean(isDemonstration && policy.worked_examples_visible);
  }
  if (options.review && visibility !== "after_finalization") return false;
  if (isDemonstration) return false;
  if (mode === "INDEPENDENT" && !isFinalized) return false;
  if (visibility === "after_finalization") return isFinalized;
  if (mode === "INDEPENDENT") return false;
  if (visibility === "after_submission") return isSubmitted;
  if (visibility === "after_submission_or_failure") return isSubmitted || isFailed;
  return false;
}

function dependencyCycles(stages) {
  const stageIds = new Set(stages.map((stage) => stage.stage_id));
  const graph = new Map(stages.map((stage) => [
    stage.stage_id,
    asArray(stage.dependencies).filter((dependency) => stageIds.has(dependency)).sort()
  ]));
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];

  const visit = (stageId) => {
    if (visiting.has(stageId)) {
      const start = stack.indexOf(stageId);
      cycles.push([...stack.slice(start), stageId]);
      return;
    }
    if (visited.has(stageId)) return;
    visiting.add(stageId);
    stack.push(stageId);
    for (const dependency of graph.get(stageId) || []) visit(dependency);
    stack.pop();
    visiting.delete(stageId);
    visited.add(stageId);
  };

  for (const stage of stages) visit(stage.stage_id);
  return cycles;
}

export function validateLessonDefinition(definition, options = {}) {
  const catalog = options.catalog || { commands: [] };
  const commandMap = catalogCommandMap(catalog);
  const errors = [];
  const warnings = [];
  const requireString = (path, value) => {
    if (typeof value !== "string" || !value.trim()) errors.push(`${path} is required`);
  };
  const requireArray = (path, value) => {
    if (!Array.isArray(value)) errors.push(`${path} must be an array`);
  };

  if (!definition || typeof definition !== "object") {
    return { valid: false, errors: ["definition must be an object"], warnings };
  }
  if (definition.schema_version !== LESSON_DEFINITION_SCHEMA_VERSION) {
    errors.push(`unsupported lesson definition schema_version ${definition.schema_version || "<missing>"}`);
  }

  ["lesson_id", "title", "module_id", "learning_level", "vendor_id", "operating_system_family_id", "migration_status"].forEach((field) => requireString(field, definition[field]));
  if (!MIGRATION_STATUSES.includes(definition.migration_status)) errors.push(`migration_status ${definition.migration_status} is not controlled`);
  requireArray("command_targets", definition.command_targets);
  requireArray("stages", definition.stages);
  requireArray("supported_modes", definition.supported_modes);

  const supportedModes = asArray(definition.supported_modes);
  for (const mode of supportedModes) {
    if (!LEARNING_MODES.includes(mode)) errors.push(`supported_modes contains unknown mode ${mode}`);
  }
  for (const mode of LEARNING_MODES) {
    const policy = definition.mode_policies?.[mode] || DEFAULT_MODE_POLICIES[mode];
    if (mode === "INDEPENDENT" && policy.hints_allowed) errors.push("INDEPENDENT mode must not allow hints");
  }

  const stageIds = new Set();
  const stageById = new Map();
  const stages = asArray(definition.stages);
  for (const stage of asArray(definition.stages)) {
    requireString("stage.stage_id", stage?.stage_id);
    if (stageIds.has(stage.stage_id)) errors.push(`duplicate stage_id ${stage.stage_id}`);
    stageIds.add(stage.stage_id);
    stageById.set(stage.stage_id, stage);
    if (!STAGE_TYPES.includes(stage.stage_type)) errors.push(`stage ${stage.stage_id} has unknown stage_type ${stage.stage_type}`);
    if (!STAGE_REQUIREMENT_STATUSES.includes(stage.requirement_status)) errors.push(`stage ${stage.stage_id} has unknown requirement_status ${stage.requirement_status}`);
    if (!EVALUATOR_TYPES.includes(stage.evaluator?.type)) errors.push(`stage ${stage.stage_id} has unknown evaluator type ${stage.evaluator?.type}`);
    if (!ANSWER_VISIBILITY_POLICIES.includes(stage.answer_visibility_policy)) errors.push(`stage ${stage.stage_id} has unknown answer_visibility_policy ${stage.answer_visibility_policy}`);
    for (const mode of asArray(stage.mode_availability)) {
      if (!LEARNING_MODES.includes(mode)) errors.push(`stage ${stage.stage_id} has unknown mode ${mode}`);
    }
    if (stage.content_role === "assessed" && stage.answer_visibility_policy === "before_submission") {
      errors.push(`stage ${stage.stage_id} uses forbidden assessed answer visibility before_submission`);
    }
    if (stage.content_role === "assessed" && ["ASSISTED", "INDEPENDENT"].some((mode) => stageAppliesToMode(stage, mode)) && stage.answer_visibility_policy === "demonstration_only") {
      errors.push(`stage ${stage.stage_id} cannot expose assessed content as demonstration_only`);
    }
    for (const dependency of asArray(stage.dependencies)) {
      if (!stageIds.has(dependency) && !asArray(definition.stages).some((candidate) => candidate.stage_id === dependency)) {
        errors.push(`stage ${stage.stage_id} depends on unknown stage ${dependency}`);
      }
    }
    for (const dimension of asArray(stage.eligible_dimensions)) {
      if (!MASTERY_DIMENSIONS.includes(dimension)) errors.push(`stage ${stage.stage_id} has unknown mastery dimension ${dimension}`);
    }
    if (stage.requirement_status === "required" && stage.support_status === "unsupported") {
      errors.push(`stage ${stage.stage_id} is required but unsupported`);
    }
    if (["conditional", "unavailable", "unsupported"].includes(stage.requirement_status) && !stage.reason) {
      errors.push(`stage ${stage.stage_id} must explain ${stage.requirement_status} status`);
    }
  }
  for (const cycle of dependencyCycles(stages)) {
    errors.push(`dependency cycle detected: ${cycle.join(" -> ")}`);
  }

  const targetIds = new Set();
  for (const target of asArray(definition.command_targets)) {
    requireString("command_target.canonical_command_id", target?.canonical_command_id);
    requireString(`target ${target?.canonical_command_id}.vendor_id`, target?.vendor_id);
    if (targetIds.has(target.canonical_command_id)) errors.push(`duplicate command target ${target.canonical_command_id}`);
    targetIds.add(target.canonical_command_id);
    const record = commandMap.get(target.canonical_command_id);
    if (!record) {
      errors.push(`unknown canonical command target ${target.canonical_command_id}`);
      continue;
    }
    if (record.vendor_id !== target.vendor_id || target.vendor_id !== definition.vendor_id) {
      errors.push(`vendor mismatch for ${target.canonical_command_id}`);
    }
    if (record.operating_system_family_id !== target.operating_system_family_id) {
      errors.push(`operating system family mismatch for ${target.canonical_command_id}`);
    }
    for (const field of ["objective_ids", "mastery_dimensions", "blocking_reasons", "required_stage_ids"]) {
      requireArray(`target ${target.canonical_command_id}.${field}`, target[field]);
    }
    for (const statusField of ["runtime_support", "practice_status", "verification_status", "rollback_status", "migration_status"]) {
      requireString(`target ${target.canonical_command_id}.${statusField}`, target[statusField]);
    }
    for (const stageId of asArray(target.required_stage_ids)) {
      const stage = stageById.get(stageId);
      if (!stage) errors.push(`target ${target.canonical_command_id} requires unknown stage ${stageId}`);
      if (stage?.requirement_status === "unsupported") errors.push(`target ${target.canonical_command_id} requires unsupported stage ${stageId}`);
      for (const mode of supportedModes) {
        if (!stage) continue;
        const visible = stageAppliesToMode(stage, mode);
        const exception = modeStageException(target, stageId, mode);
        if (!visible && !exception) {
          errors.push(`target ${target.canonical_command_id} required stage ${stageId} is unavailable in ${mode} without mode exception`);
        }
        if (exception) {
          if (!MODE_STAGE_EXCEPTION_STATUSES.includes(exception.status)) {
            errors.push(`target ${target.canonical_command_id} stage ${stageId} mode ${mode} has unknown mode exception status ${exception.status}`);
          }
          if (typeof exception.reason !== "string" || !exception.reason.trim()) {
            errors.push(`target ${target.canonical_command_id} stage ${stageId} mode ${mode} mode exception requires a reason`);
          }
        }
      }
    }
    for (const [stageId, byMode] of Object.entries(target.mode_stage_exceptions || {})) {
      if (!stageById.has(stageId)) errors.push(`target ${target.canonical_command_id} has mode exception for unknown stage ${stageId}`);
      for (const [mode, exception] of Object.entries(byMode || {})) {
        if (!LEARNING_MODES.includes(mode)) errors.push(`target ${target.canonical_command_id} stage ${stageId} has mode exception for unknown mode ${mode}`);
        if (!MODE_STAGE_EXCEPTION_STATUSES.includes(exception?.status)) errors.push(`target ${target.canonical_command_id} stage ${stageId} mode ${mode} has unknown mode exception status ${exception?.status}`);
        if (typeof exception?.reason !== "string" || !exception.reason.trim()) errors.push(`target ${target.canonical_command_id} stage ${stageId} mode ${mode} mode exception requires a reason`);
      }
    }
    const allowed = new Set(allowedDimensionsForSupport(record));
    for (const dimension of asArray(target.mastery_dimensions)) {
      if (!MASTERY_DIMENSIONS.includes(dimension)) errors.push(`target ${target.canonical_command_id} has unknown mastery dimension ${dimension}`);
      if (!allowed.has(dimension)) warnings.push(`target ${target.canonical_command_id} declares dimension ${dimension} beyond support level ${record.runtime_support}`);
    }
  }

  if (!asArray(definition.command_targets).length) errors.push("definition must contain at least one command target");
  if (!asArray(definition.stages).length) errors.push("definition must contain at least one stage");
  return { valid: errors.length === 0, errors, warnings };
}

export function publicLessonDefinition(definition, mode, options = {}) {
  const policy = definition.mode_policies?.[mode] || DEFAULT_MODE_POLICIES[mode];
  const target = options.target || (options.canonical_command_id ? targetByCommand(definition, options.canonical_command_id) : null) || asArray(definition.command_targets)[0] || null;
  const visibleStages = asArray(definition.stages)
    .filter((stage) => stageAppliesToMode(stage, mode) || modeStageException(target, stage.stage_id, mode))
    .map((stage) => {
      const exception = modeStageException(target, stage.stage_id, mode);
      const stageState = options.attempt?.stage_states?.[stage.stage_id] || (exception ? { status: "not_applicable", reason: exception.reason } : { status: "available" });
      const showAnswers = canRevealStageAnswer(stage, mode, {
        modePolicy: policy,
        stageState,
        attemptStatus: options.attempt?.status || "active",
        review: Boolean(options.review)
      });
      return {
        stage_id: stage.stage_id,
        stage_type: stage.stage_type,
        requirement_status: stage.requirement_status,
        dependencies: asArray(stage.dependencies),
        evidence_source: stage.evidence_source,
        eligible_dimensions: asArray(stage.eligible_dimensions),
        reason: stageState.reason || stage.reason || null,
        applicable: stageState.status !== "not_applicable",
        prompt: stage.prompt || null,
        content_role: stage.content_role || "assessed",
        answer_visibility_policy: stage.answer_visibility_policy,
        hints_available: Boolean(policy.hints_allowed && asArray(stage.hints).length),
        worked_example: policy.worked_examples_visible && stage.content_role === "demonstration" ? stage.worked_example || null : null,
        answer_visible: showAnswers,
        answer: showAnswers ? stage.public_answer || null : null
      };
    });
  return {
    schema_version: definition.schema_version,
    lesson_id: definition.lesson_id,
    title: definition.title,
    module_id: definition.module_id,
    learning_level: definition.learning_level,
    vendor_id: definition.vendor_id,
    operating_system_family_id: definition.operating_system_family_id,
    command_targets: asArray(definition.command_targets).map((target) => ({
      canonical_command_id: target.canonical_command_id,
      objective_ids: asArray(target.objective_ids),
      runtime_support: target.runtime_support,
      practice_status: target.practice_status,
      verification_status: target.verification_status,
      rollback_status: target.rollback_status,
      mastery_dimensions: asArray(target.mastery_dimensions),
      blocking_reasons: asArray(target.blocking_reasons),
      required_stage_ids: asArray(target.required_stage_ids),
      migration_status: target.migration_status
    })),
    supported_modes: asArray(definition.supported_modes),
    mode_policy: deepClone(policy),
    stages: visibleStages,
    review_eligibility: definition.review_eligibility,
    migration_status: definition.migration_status
  };
}
